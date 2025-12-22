import { useEffect, useRef, useState, useMemo } from "react";
import { District } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
  onBackgroundClick?: () => void;
  onNationalClick?: () => void;
}

interface DistrictStats {
  yes: number;
  maybe: number;
  no: number;
  notInvited: number;
  total: number;
}

// Base region label positions - closest to map (for 1 metric active)
// The map roughly occupies: x: 180-880, y: 120-500 in the 960x600 viewBox
const baseRegionPositions: Record<string, { 
  baseX: number; 
  baseY: number;
  labelDirection: 'above' | 'below' | 'left' | 'right';
}> = {
  // TOP ROW - pushed away from map edge to prevent overlap
  "Northwest": { baseX: 200, baseY: 80, labelDirection: 'above' },
  "Big Sky": { baseX: 380, baseY: 80, labelDirection: 'above' },
  "Great Plains North": { baseX: 540, baseY: 80, labelDirection: 'above' },
  "Great Plains South": { baseX: 680, baseY: 80, labelDirection: 'above' },
  "Great Lakes": { baseX: 780, baseY: 100, labelDirection: 'above' },
  
  // RIGHT SIDE - pushed away from map edge
  "Northeast": { baseX: 900, baseY: 200, labelDirection: 'right' },
  "Mid-Atlantic": { baseX: 900, baseY: 330, labelDirection: 'right' },
  "Southeast": { baseX: 915, baseY: 470, labelDirection: 'right' },
  
  // LEFT SIDE - pushed away from map edge
  "West Coast": { baseX: 100, baseY: 300, labelDirection: 'left' },
  
  // BOTTOM ROW - closer to map edge
  "Texico": { baseX: 420, baseY: 500, labelDirection: 'below' },
  "South Central": { baseX: 640, baseY: 500, labelDirection: 'below' },
};

// Map boundaries (from comment: x: 180-880, y: 120-500 in 960x600 viewBox)
const MAP_BOUNDS = {
  left: 180,
  right: 880,
  top: 120,
  bottom: 500,
  viewBoxHeight: 600
};

// Metric label bounds for collision detection
interface MetricBounds {
  region: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'above' | 'below' | 'left' | 'right';
}

// Check if two bounds overlap
const boundsOverlap = (a: MetricBounds, b: MetricBounds): boolean => {
  const padding = 8; // Minimum spacing between labels
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
};

// Calculate metric bounds from position
const getMetricBounds = (
  region: string,
  labelX: number,
  labelY: number,
  totalHeight: number,
  direction: 'above' | 'below' | 'left' | 'right'
): MetricBounds => {
  const metricWidth = 80;
  const metricHeight = totalHeight;
  
  let x = labelX - metricWidth / 2;
  let y = labelY - metricHeight / 2;
  let width = metricWidth;
  let height = metricHeight;
  
  // Adjust based on direction to include the full label area
  if (direction === 'above') {
    y = labelY - metricHeight;
    height = metricHeight;
  } else if (direction === 'below') {
    y = labelY;
    height = metricHeight;
  } else if (direction === 'left') {
    x = labelX - metricWidth;
    width = metricWidth;
  } else if (direction === 'right') {
    x = labelX;
    width = metricWidth;
  }
  
  return { region, x, y, width, height, direction };
};

// Resolve collisions by shifting positions intelligently
const resolveCollisions = (
  bounds: MetricBounds[],
  basePositions: Record<string, { baseX: number; baseY: number; labelDirection: 'above' | 'below' | 'left' | 'right' }>
): MetricBounds[] => {
  const resolved = bounds.map(b => ({ ...b }));
  const maxIterations = 30;
  const shiftStep = 3;
  const minSpacing = 10;
  
  // Store center positions for easier manipulation
  const centers: Array<{ x: number; y: number; region: string; direction: string }> = resolved.map(b => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    region: b.region,
    direction: b.direction
  }));
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        if (boundsOverlap(resolved[i], resolved[j])) {
          hasCollision = true;
          const baseI = basePositions[resolved[i].region];
          const baseJ = basePositions[resolved[j].region];
          if (!baseI || !baseJ) continue;
          
          // Calculate overlap amount
          const overlapX = Math.min(
            resolved[i].x + resolved[i].width - resolved[j].x,
            resolved[j].x + resolved[j].width - resolved[i].x
          );
          const overlapY = Math.min(
            resolved[i].y + resolved[i].height - resolved[j].y,
            resolved[j].y + resolved[j].height - resolved[i].y
          );
          
          // Determine shift direction based on label direction and overlap
          let shiftIX = 0, shiftIY = 0, shiftJX = 0, shiftJY = 0;
          
          // For labels in same direction, shift them apart
          if (baseI.labelDirection === baseJ.labelDirection) {
            if (baseI.labelDirection === 'above' || baseI.labelDirection === 'below') {
              // Shift horizontally
              const dx = centers[j].x - centers[i].x;
              if (Math.abs(dx) < minSpacing) {
                shiftIX = -shiftStep;
                shiftJX = shiftStep;
              } else {
                shiftIX = dx > 0 ? -shiftStep : shiftStep;
                shiftJX = dx > 0 ? shiftStep : -shiftStep;
              }
            } else {
              // Shift vertically
              const dy = centers[j].y - centers[i].y;
              if (Math.abs(dy) < minSpacing) {
                shiftIY = -shiftStep;
                shiftJY = shiftStep;
              } else {
                shiftIY = dy > 0 ? -shiftStep : shiftStep;
                shiftJY = dy > 0 ? shiftStep : -shiftStep;
              }
            }
          } else {
            // Different directions - shift perpendicular to avoid map
            if (baseI.labelDirection === 'above' || baseI.labelDirection === 'below') {
              shiftIX = overlapX > overlapY ? (centers[j].x > centers[i].x ? -shiftStep : shiftStep) : 0;
              shiftIY = overlapX <= overlapY ? (centers[j].y > centers[i].y ? -shiftStep : shiftStep) : 0;
            } else {
              shiftIX = overlapX <= overlapY ? (centers[j].x > centers[i].x ? -shiftStep : shiftStep) : 0;
              shiftIY = overlapX > overlapY ? (centers[j].y > centers[i].y ? -shiftStep : shiftStep) : 0;
            }
          }
          
          // Apply shifts
          centers[i].x += shiftIX;
          centers[i].y += shiftIY;
          centers[j].x += shiftJX;
          centers[j].y += shiftJY;
          
          // Recalculate bounds from centers
          resolved[i] = getMetricBounds(
            resolved[i].region,
            centers[i].x,
            centers[i].y,
            resolved[i].height,
            resolved[i].direction as 'above' | 'below' | 'left' | 'right'
          );
          resolved[j] = getMetricBounds(
            resolved[j].region,
            centers[j].x,
            centers[j].y,
            resolved[j].height,
            resolved[j].direction as 'above' | 'below' | 'left' | 'right'
          );
        }
      }
    }
    
    if (!hasCollision) break;
  }
  
  return resolved;
};

// Dynamic positioning function with collision detection
const getDynamicPosition = (
  region: string, 
  activeMetricCount: number,
  totalHeight: number,
  allRegions: string[],
  allTotalHeights: Record<string, number>
): { labelX: number; labelY: number; labelDirection: 'above' | 'below' | 'left' | 'right' } => {
  const base = baseRegionPositions[region];
  if (!base) return { labelX: 0, labelY: 0, labelDirection: 'above' };
  
  let labelX = base.baseX;
  let labelY = base.baseY;
  
  // Calculate metric bounds
  const metricWidth = 80;
  const metricPadding = 15; // Minimum padding from map edge
  const textHeight = totalHeight;
  
  // Check if metrics would overlap with map and calculate required offset
  let requiredOffset = 0;
  
  switch (base.labelDirection) {
    case 'above': {
      const metricBottom = labelY + (textHeight / 2);
      if (metricBottom > MAP_BOUNDS.top - metricPadding) {
        requiredOffset = metricBottom - (MAP_BOUNDS.top - metricPadding);
      }
      labelY -= requiredOffset;
      break;
    }
    case 'below': {
      const metricTop = labelY - (textHeight / 2);
      const wouldTouchMap = metricTop < MAP_BOUNDS.bottom + metricPadding;
      const wouldGoOffScreen = labelY + (textHeight / 2) > MAP_BOUNDS.viewBoxHeight - 15;
      
      if (wouldGoOffScreen) {
        requiredOffset = (labelY + (textHeight / 2)) - (MAP_BOUNDS.viewBoxHeight - 15);
        labelY -= requiredOffset;
      } else if (wouldTouchMap) {
        requiredOffset = (MAP_BOUNDS.bottom + metricPadding) - metricTop;
        labelY += requiredOffset;
      }
      break;
    }
    case 'right': {
      const metricLeft = labelX - (metricWidth / 2);
      if (metricLeft < MAP_BOUNDS.right + metricPadding) {
        requiredOffset = (MAP_BOUNDS.right + metricPadding) - metricLeft;
      }
      labelX += requiredOffset;
      break;
    }
    case 'left': {
      const metricRight = labelX + (metricWidth / 2);
      if (metricRight > MAP_BOUNDS.left - metricPadding) {
        requiredOffset = metricRight - (MAP_BOUNDS.left - metricPadding);
      }
      labelX -= requiredOffset;
      break;
    }
  }
  
  // Now check for collisions with other regions
  const allBounds: MetricBounds[] = [];
  
  // First, calculate all initial positions
  allRegions.forEach(r => {
    const rBase = baseRegionPositions[r];
    if (!rBase) return;
    
    let rX = rBase.baseX;
    let rY = rBase.baseY;
    const rHeight = allTotalHeights[r] || 0;
    
    // Apply map boundary adjustments
    let rOffset = 0;
    switch (rBase.labelDirection) {
      case 'above': {
        const rMetricBottom = rY + (rHeight / 2);
        if (rMetricBottom > MAP_BOUNDS.top - metricPadding) {
          rOffset = rMetricBottom - (MAP_BOUNDS.top - metricPadding);
        }
        rY -= rOffset;
        break;
      }
      case 'below': {
        const rMetricTop = rY - (rHeight / 2);
        const rWouldTouchMap = rMetricTop < MAP_BOUNDS.bottom + metricPadding;
        const rWouldGoOffScreen = rY + (rHeight / 2) > MAP_BOUNDS.viewBoxHeight - 15;
        if (rWouldGoOffScreen) {
          rOffset = (rY + (rHeight / 2)) - (MAP_BOUNDS.viewBoxHeight - 15);
          rY -= rOffset;
        } else if (rWouldTouchMap) {
          rOffset = (MAP_BOUNDS.bottom + metricPadding) - rMetricTop;
          rY += rOffset;
        }
        break;
      }
      case 'right': {
        const rMetricLeft = rX - (metricWidth / 2);
        if (rMetricLeft < MAP_BOUNDS.right + metricPadding) {
          rOffset = (MAP_BOUNDS.right + metricPadding) - rMetricLeft;
        }
        rX += rOffset;
        break;
      }
      case 'left': {
        const rMetricRight = rX + (metricWidth / 2);
        if (rMetricRight > MAP_BOUNDS.left - metricPadding) {
          rOffset = rMetricRight - (MAP_BOUNDS.left - metricPadding);
        }
        rX -= rOffset;
        break;
      }
    }
    
    allBounds.push(getMetricBounds(r, rX, rY, rHeight, rBase.labelDirection));
  });
  
  // Resolve collisions
  const resolvedBounds = resolveCollisions(allBounds, baseRegionPositions);
  
  // Find the resolved position for this region
  const resolved = resolvedBounds.find(b => b.region === region);
  if (resolved) {
    labelX = resolved.x + resolved.width / 2;
    labelY = resolved.y + resolved.height / 2;
  }
  
  return { labelX, labelY, labelDirection: base.labelDirection };
};

// District to region mapping (for districts not yet in database)
const districtRegionMap: Record<string, string> = {
  "Alabama": "Southeast",
  "Alaska": "Northwest",
  "Appalachian": "Mid-Atlantic",
  "Arizona": "West Coast",
  "Arkansas": "South Central",
  "Colorado": "Big Sky",
  "Georgia": "Southeast",
  "Hawaii": "West Coast",
  "Illinois": "Great Lakes",
  "Indiana": "Great Lakes",
  "Iowa": "Great Plains South",
  "Kansas": "Great Plains South",
  "Kentucky": "Mid-Atlantic",
  "Louisiana": "South Central",
  "Michigan": "Great Lakes",
  "Minnesota": "Great Plains North",
  "Mississippi": "Southeast",
  "Montana": "Big Sky",
  "Nebraska": "Great Plains South",
  "NewJersey": "Northeast",
  "NewMexico": "Texico",
  "NewYork": "Northeast",
  "NorthCarolina": "Mid-Atlantic",
  "NorthDakota": "Great Plains North",
  "NorthernCal-Nevada": "West Coast",
  "NorthernNewEnglend": "Northeast",
  "NorthIdaho": "Northwest",
  "NorthernMissouri": "Great Plains South",
  "NorthTexas": "Texico",
  "Ohio": "Great Lakes",
  "Oklahoma": "South Central",
  "Oregon": "Northwest",
  "PeninsularFlorida": "Southeast",
  "Penn-Del": "Northeast",
  "Potomac": "Mid-Atlantic",
  "SouthCarolina": "Southeast",
  "SouthDakota": "Great Plains North",
  "SouthernCalifornia": "West Coast",
  "SouthernNewEngland": "Northeast",
  "SouthIdaho": "Big Sky",
  "SouthernMissouri": "Great Plains South",
  "SouthTexas": "Texico",
  "Tennessee": "Mid-Atlantic",
  "Utah": "Big Sky",
  "Washington": "Northwest",
  "WestFlorida": "Southeast",
  "WestTexas": "Texico",
  "Wisconsin-NorthMichigan": "Great Plains North",
  "Wyoming": "Big Sky",
  "Connecticut": "Northeast",
  "Maine": "Northeast",
  "Massachusetts": "Northeast",
  "NewHampshire": "Northeast",
  "Pennsylvania": "Northeast",
  "Vermont": "Northeast",
  "Virginia": "Mid-Atlantic",
  "WestVirginia": "Mid-Atlantic",
  "Florida": "Southeast",
  "Nevada": "West Coast",
  "NorthCalifornia": "West Coast",
  "SouthCalifornia": "West Coast",
};

// District centroids for pie chart positioning (based on new SVG)
const districtCentroids: Record<string, { x: number; y: number }> = {
  "Alabama": { x: 646, y: 376 },
  "Alaska": { x: 110, y: 92 },
  "Appalachian": { x: 707, y: 266 },
  "Arizona": { x: 284, y: 330 },
  "Arkansas": { x: 577, y: 333 },
  "Colorado": { x: 406, y: 274 },
  "Georgia": { x: 698, y: 363 },
  "Hawaii": { x: 122, y: 380 },
  "Illinois": { x: 600, y: 254 },
  "Indiana": { x: 638, y: 257 },
  "Iowa": { x: 560, y: 216 },
  "Kansas": { x: 498, y: 274 },
  "Kentucky": { x: 645, y: 279 },
  "Louisiana": { x: 585, y: 408 },
  "Michigan": { x: 649, y: 166 },
  "Minnesota": { x: 543, y: 133 },
  "Mississippi": { x: 602, y: 373 },
  "Montana": { x: 322, y: 134 },
  "Nebraska": { x: 475, y: 223 },
  "NewJersey": { x: 781, y: 223 },
  "NewMexico": { x: 370, y: 353 },
  "NewYork": { x: 762, y: 178 },
  "NorthCarolina": { x: 742, y: 302 },
  "NorthDakota": { x: 478, y: 126 },
  "NorthernCal-Nevada": { x: 199, y: 246 },
  "NorthernNewEnglend": { x: 818, y: 122 },
  "NorthernMissouri": { x: 557, y: 262 },
  "NorthTexas": { x: 501, y: 367 },
  "Ohio": { x: 686, y: 235 },
  "Oklahoma": { x: 494, y: 335 },
  "Oregon": { x: 230, y: 139 },
  "PeninsularFlorida": { x: 725, y: 428 },
  "Penn-Del": { x: 750, y: 207 },
  "Potomac": { x: 757, y: 254 },
  "SouthCarolina": { x: 719, y: 337 },
  "SouthDakota": { x: 480, y: 185 },
  "SouthernCalifornia": { x: 228, y: 313 },
  "SouthernNewEngland": { x: 806, y: 180 },
  "SouthIdaho": { x: 299, y: 156 },
  "SouthernMissouri": { x: 581, y: 291 },
  "SouthTexas": { x: 503, y: 430 },
  "Tennessee": { x: 650, y: 312 },
  "Utah": { x: 323, y: 239 },
  "Washington": { x: 238, y: 100 },
  "WestFlorida": { x: 666, y: 401 },
  "WestTexas": { x: 422, y: 390 },
  "Wisconsin-NorthMichigan": { x: 597, y: 154 },
  "Wyoming": { x: 377, y: 195 },
};

export function InteractiveMap({ districts, selectedDistrictId, onDistrictSelect, onBackgroundClick, onNationalClick }: InteractiveMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const visualContainerRef = useRef<HTMLDivElement>(null);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  
  // Metric toggles state
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set());
  
  // Hovered region for metric labels (shows region name on hover)
  const [hoveredRegionLabel, setHoveredRegionLabel] = useState<string | null>(null);
  
  // Fetch all people to calculate district stats
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  
  // Calculate national totals
  const nationalTotals = {
    yes: allPeople.filter(p => p.status === "Yes").length,
    maybe: allPeople.filter(p => p.status === "Maybe").length,
    no: allPeople.filter(p => p.status === "No").length,
    notInvited: allPeople.filter(p => p.status === "Not Invited").length,
    total: allPeople.length,
    invited: allPeople.filter(p => p.status !== "Not Invited").length,
  };
  
  const invitedPercent = nationalTotals.total > 0 
    ? Math.round((nationalTotals.invited / nationalTotals.total) * 100)
    : 0;
  
  // Calculate days until CMC
  const cmcDate = new Date('2025-07-06');
  const today = new Date();
  const daysUntilCMC = Math.abs(Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate regional totals
  const regionalTotals: Record<string, typeof nationalTotals> = {};
  districts.forEach(district => {
    if (!district.region) return;
    if (!regionalTotals[district.region]) {
      regionalTotals[district.region] = { yes: 0, maybe: 0, no: 0, notInvited: 0, total: 0, invited: 0 };
    }
    const districtPeople = allPeople.filter(p => p.primaryDistrictId === district.id);
    regionalTotals[district.region].yes += districtPeople.filter(p => p.status === "Yes").length;
    regionalTotals[district.region].maybe += districtPeople.filter(p => p.status === "Maybe").length;
    regionalTotals[district.region].no += districtPeople.filter(p => p.status === "No").length;
    regionalTotals[district.region].notInvited += districtPeople.filter(p => p.status === "Not Invited").length;
    regionalTotals[district.region].total += districtPeople.length;
    regionalTotals[district.region].invited += districtPeople.filter(p => p.status !== "Not Invited").length;
  });
  
  // Get displayed totals (regional if hovering, otherwise national)
  const displayedTotals = hoveredRegion && regionalTotals[hoveredRegion] 
    ? regionalTotals[hoveredRegion] 
    : nationalTotals;
  const displayedLabel = hoveredRegion || "Chi Alpha";
  
  const toggleMetric = (metric: string) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };
  
  const clearAllMetrics = () => {
    setActiveMetrics(new Set());
  };

  // Calculate stats for each district
  const districtStats = districts.reduce<Record<string, DistrictStats>>((acc, district) => {
    const districtPeople = allPeople.filter(p => p.primaryDistrictId === district.id);
    acc[district.id] = {
      yes: districtPeople.filter(p => p.status === "Yes").length,
      maybe: districtPeople.filter(p => p.status === "Maybe").length,
      no: districtPeople.filter(p => p.status === "No").length,
      notInvited: districtPeople.filter(p => p.status === "Not Invited").length,
      total: districtPeople.length,
    };
    return acc;
  }, {});

  useEffect(() => {
    // Load SVG content
    fetch("/map.svg")
      .then(res => res.text())
      .then(svg => setSvgContent(svg))
      .catch(err => console.error("Failed to load map:", err));
  }, []);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current || !visualContainerRef.current) return;

    // Setup click layer (invisible)
    const clickContainer = svgContainerRef.current;
    clickContainer.innerHTML = svgContent;
    
    // Setup visual layer (what user sees)
    const visualContainer = visualContainerRef.current;
    visualContainer.innerHTML = svgContent;

    const clickSvg = clickContainer.querySelector("svg");
    const visualSvg = visualContainer.querySelector("svg");
    if (!clickSvg || !visualSvg) return;

    // Make both SVGs responsive
    [clickSvg, visualSvg].forEach(svg => {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.display = "block";
    });

    // Get all path elements from both SVGs
    const clickPaths = clickSvg.querySelectorAll("path");
    const visualPaths = visualSvg.querySelectorAll("path");

    // Regional color mapping – deeper, richer palette with slight brightness
    // Goal: refined colors with more depth and richness, slightly brighter
    const regionColors: Record<string, string> = {
      "Northwest": "#6295AA",                 // slightly brighter coastal blue
      "Big Sky": "#8F8257",                   // slightly brighter warm stone
      "Great Plains North": "#645978",        // slightly brighter purple
      "Great Lakes": "#56819B",               // slightly brighter steel blue
      "Great Plains South": "#B0944E",        // slightly brighter golden wheat
      "Mid-Atlantic": "#A8705C",              // slightly brighter terracotta clay
      "Northeast": "#AB5470",                 // slightly brighter rose
      "South Central": "#9F5A57",             // slightly brighter brick
      "Southeast": "#568969",                 // slightly brighter sage
      "Texico": "#9F588A",                    // slightly brighter pink-purple magenta
      "West Coast": "#A77649",                // slightly brighter warm amber
    };

    // Premium map styling constants - vibrant, pop style
    const BORDER_COLOR = "rgba(255,255,255,0.85)";  // brighter white borders for more contrast
    const BORDER_WIDTH = "0.2";          // thinner borders for cleaner look
    const BORDER_WIDTH_HOVER = "0.45";      // more prominent on hover
    const BORDER_WIDTH_SELECTED = "0.55"; // strong prominence for selected
    const TRANSITION = "all 300ms cubic-bezier(0.4, 0, 0.2, 1)"; // smooth, consistent transitions
    const DIM_OPACITY = "0.95";            // shadow overlay on hover (reduced for brighter map)
    const DIM_FILTER = "brightness(0.92)"; // Slight shadow-like darkening on hover (reduced for brighter map)
    const LIFT_FILTER = "saturate(1.1) brightness(1.06) drop-shadow(0 3px 8px rgba(0,0,0,0.18)) drop-shadow(0 1px 4px rgba(0,0,0,0.12))"; // Smooth, professional raised effect - very slightly brighter
    const SELECTED_FILTER = "saturate(1.15) brightness(1.1) drop-shadow(0 2px 6px rgba(0,0,0,0.2))";
    const GREYED_OUT_FILTER = "saturate(0.85) brightness(0.9)"; // More noticeable dimming for contrast
    const GREYED_OUT_OPACITY = "0.85"; // More visible opacity reduction

    // Get selected district's region for greyed out effect
    const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
    const selectedRegion = selectedDistrict?.region || (selectedDistrictId ? districtRegionMap[selectedDistrictId] : undefined);

    // Create district lookup map for performance
    const districtMap = new Map(districts.map(d => [d.id, d]));

    // Style visual paths (what user sees)
    visualPaths.forEach(path => {
      const pathId =
        path.getAttribute("inkscape:label") ||
        path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
        path.getAttribute("id");
      if (!pathId) return;

      const district = districtMap.get(pathId);
      // Get region from district in database, or from mapping if not in database yet
      const region = district?.region || districtRegionMap[pathId];
      const baseColor = region ? (regionColors[region] || "#e5e7eb") : "#e5e7eb";

      path.style.fill = baseColor;
      path.style.stroke = BORDER_COLOR;
      path.style.strokeWidth = BORDER_WIDTH;
      path.style.strokeLinejoin = "round";
      path.style.strokeLinecap = "round";
      path.style.filter = "brightness(1.04)"; // Slightly brighter default
      path.style.strokeDasharray = "";
      path.style.transition = TRANSITION;
      path.style.transformOrigin = "center";
      // Move Alaska down a bit
      if (pathId === "Alaska") {
        path.style.transform = "scale(1) translateY(5px)";
      } else {
      path.style.transform = "scale(1) translateY(0)";
      }

      // When a district is selected, apply shadow and lighting effects
      if (selectedDistrictId && selectedRegion) {
        const isInSelectedRegion = region && region === selectedRegion;
        
        if (pathId === selectedDistrictId) {
          // Selected district
          path.style.filter = SELECTED_FILTER;
          path.style.opacity = "1";
        } else if (isInSelectedRegion) {
          // Same region as selected - lighting effect (brighten)
          path.style.filter = "saturate(1.02) brightness(1.05)";
          path.style.opacity = "1";
        } else {
          // Different region - shadow effect (darken)
          path.style.filter = DIM_FILTER;
          path.style.opacity = DIM_OPACITY;
        }
      } else {
        // No district selected - normal styling
      if (selectedDistrictId === pathId) {
        path.style.filter = SELECTED_FILTER;
      } else {
        path.style.filter = "brightness(1.04)"; // Slightly brighter default
        }
        path.style.opacity = "1";
      }
    });

    // Setup click handlers on invisible layer
    clickPaths.forEach(path => {
      const pathId =
        path.getAttribute("inkscape:label") ||
        path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
        path.getAttribute("id");
      if (!pathId) return;

      // Allow clicking on all districts, even if not in database yet
      const district = districtMap.get(pathId);

      path.style.cursor = "pointer";
      
      // Click handler - allow clicking even if district not in database
      const clickHandler = (e: MouseEvent) => {
        e.stopPropagation();
        onDistrictSelect(pathId);
      };
      path.addEventListener("click", clickHandler);

      // Get region once for this path
      const pathRegion = district?.region || districtRegionMap[pathId];

       // Hover behavior: focus district, highlight region, dim others
      const mouseEnterHandler = (e: MouseEvent) => {
        setHoveredDistrict(pathId);
        if (pathRegion) {
          setHoveredRegion(pathRegion);
        }
        setTooltipPos({ x: e.clientX, y: e.clientY });
        
        visualPaths.forEach(vPath => {
          const vPathId =
            vPath.getAttribute("inkscape:label") ||
            vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
            vPath.getAttribute("id");
          if (!vPathId) return;
          
          const vDistrict = districtMap.get(vPathId);
          const vRegion = vDistrict?.region || districtRegionMap[vPathId];
          const isInSameRegion = vRegion && pathRegion && vRegion === pathRegion;

          if (vPathId === pathId) {
            // Hovered district - enhanced raised effect
            vPath.style.opacity = "1";
            vPath.style.filter = selectedDistrictId === pathId ? SELECTED_FILTER : LIFT_FILTER;
            vPath.style.strokeWidth = selectedDistrictId === pathId ? BORDER_WIDTH_SELECTED : BORDER_WIDTH_HOVER;
            // Enhanced transform for raised effect - consistent 3D bottom-side perspective for all
            if (vPathId === "Alaska") {
              vPath.style.transform = "scale(1.02) translateY(7.3px) scaleY(0.99)";
            } else if (vPathId === "Hawaii") {
              vPath.style.transform = "scale(1.02) translateY(-0.8px) scaleY(0.99)";
            } else {
              // Default balanced 3D effect for all districts - consistent with edge districts
              vPath.style.transform = "scale(1.02) translateY(-0.8px) scaleY(0.99)";
            }
            vPath.style.transformOrigin = "center";
          } else if (isInSameRegion) {
            // Same region - lighting effect (brighten)
            // BUT: if this is the selected district and we're hovering over a different district, dim it
            if (selectedDistrictId && vPathId === selectedDistrictId && vPathId !== pathId) {
              // Selected district being hovered over by different district - dim it
              vPath.style.opacity = DIM_OPACITY;
              vPath.style.filter = DIM_FILTER;
              vPath.style.strokeWidth = BORDER_WIDTH;
              vPath.style.stroke = BORDER_COLOR;
            } else {
              // Same region - lighting effect (brighten)
              vPath.style.opacity = "1";
              vPath.style.filter = "saturate(1.04) brightness(1.04)";
              vPath.style.strokeWidth = BORDER_WIDTH;
              vPath.style.stroke = BORDER_COLOR;
            }
            // Keep Alaska moved down
            if (vPathId === "Alaska") {
              vPath.style.transform = "scale(1) translateY(5px)";
            } else {
            vPath.style.transform = "scale(1) translateY(0)";
            }
          } else {
            // Other regions - dimmed (but respect selected district greyed out effect)
            if (selectedDistrictId && selectedRegion) {
              const vDistrict = districtMap.get(vPathId);
              const vRegion = vDistrict?.region || districtRegionMap[vPathId];
              const isInSelectedRegion = vRegion && vRegion === selectedRegion;
              
              if (!isInSelectedRegion) {
                // Different region from selected - shadow effect (darken)
            vPath.style.opacity = DIM_OPACITY;
            vPath.style.filter = DIM_FILTER;
              } else {
                // Same region as selected - but if this IS the selected district and we're hovering a different one, dim it
                if (vPathId === selectedDistrictId && vPathId !== pathId) {
                  // Selected district being hovered over by different district - dim it
                  vPath.style.opacity = DIM_OPACITY;
                  vPath.style.filter = DIM_FILTER;
                } else {
                  // Same region - keep lighting effect even on hover of other region
                  vPath.style.opacity = "1";
                  vPath.style.filter = "saturate(1.02) brightness(1.05)";
                }
              }
            } else {
              // No district selected - normal dimming
              vPath.style.opacity = DIM_OPACITY;
              vPath.style.filter = DIM_FILTER;
            }
            vPath.style.strokeWidth = BORDER_WIDTH;
            // Keep Alaska moved down
            if (vPathId === "Alaska") {
              vPath.style.transform = "scale(1) translateY(5px)";
            } else {
            vPath.style.transform = "scale(1) translateY(0)";
          }
          }
        });
      };
      path.addEventListener("mouseenter", mouseEnterHandler);

      // Throttle mousemove to improve performance
      let mousemoveTimeout: number | null = null;
      const mouseMoveHandler = (e: MouseEvent) => {
        if (mousemoveTimeout) return;
        mousemoveTimeout = window.setTimeout(() => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
          mousemoveTimeout = null;
        }, 16); // ~60fps
      };
      path.addEventListener("mousemove", mouseMoveHandler);

      const mouseLeaveHandler = () => {
        setHoveredDistrict(null);
        setHoveredRegion(null);
        setTooltipPos(null);
        if (mousemoveTimeout) {
          clearTimeout(mousemoveTimeout);
          mousemoveTimeout = null;
        }

        visualPaths.forEach(vPath => {
          const vPathId =
            vPath.getAttribute("inkscape:label") ||
            vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
            vPath.getAttribute("id");
          if (!vPathId) return;

          const vDistrict = districtMap.get(vPathId);
          const vRegion = vDistrict?.region || districtRegionMap[vPathId];
          const isInSelectedRegion = selectedRegion && vRegion && vRegion === selectedRegion;

          // Restore to selected state styling (with shadow and lighting effects if applicable)
          if (selectedDistrictId && selectedRegion) {
            if (vPathId === selectedDistrictId) {
              vPath.style.filter = SELECTED_FILTER;
              vPath.style.opacity = "1";
            } else if (isInSelectedRegion) {
              // Same region - lighting effect (brighten)
              vPath.style.filter = "saturate(1.02) brightness(1.05)";
              vPath.style.opacity = "1";
            } else {
              // Different region - shadow effect (darken)
              vPath.style.filter = DIM_FILTER;
              vPath.style.opacity = DIM_OPACITY;
            }
          } else {
          if (selectedDistrictId === vPathId) {
            vPath.style.filter = SELECTED_FILTER;
          } else {
            vPath.style.filter = "brightness(1.04)"; // Slightly brighter default
            }
            vPath.style.opacity = "1";
          }
          vPath.style.strokeWidth = BORDER_WIDTH;
          vPath.style.stroke = BORDER_COLOR;
          // Keep Alaska moved down
          if (vPathId === "Alaska") {
            vPath.style.transform = "scale(1) translateY(5px)";
          } else {
          vPath.style.transform = "scale(1) translateY(0)";
          }
        });
      };
      path.addEventListener("mouseleave", mouseLeaveHandler);
    });

    // NXA button will be added as a separate element in JSX that transforms with the map

    // Cleanup
    return () => {
      // Remove all event listeners by cloning paths
      clickPaths.forEach(path => {
        const newPath = path.cloneNode(true);
        path.replaceWith(newPath);
      });
      // Remove NXA buttons on cleanup
      [visualSvg, clickSvg].forEach(svg => {
        const nxaButton = svg.querySelector('[data-nxa-button="true"]');
        if (nxaButton) {
          nxaButton.remove();
        }
      });
    };
  }, [svgContent, districts, selectedDistrictId, onDistrictSelect, onNationalClick]);

  // Generate pie chart SVG
  const generatePieChart = (stats: DistrictStats, size: number = 40) => {
    const { yes, maybe, no, notInvited, total } = stats;
    
    const radius = size / 2;
    const center = size / 2;
    
    // If no people, show empty gray circle with "No Data" text
    if (total === 0) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1" />
          <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#64748b" font-weight="500">No</text>
          <text x="${center}" y="${center + 10}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#64748b" font-weight="500">Data</text>
        </svg>
      `;
    }
    
    // Calculate percentages
    const yesPercent = yes / total;
    const maybePercent = maybe / total;
    const noPercent = no / total;
    const notInvitedPercent = notInvited / total;

    // Professional status colors - muted, sophisticated palette
    const colors = {
      yes: "#047857",      // emerald-700 - professional green
      maybe: "#ca8a04",    // yellow-600 - more yellow tone
      no: "#b91c1c",       // red-700 - professional red
      notInvited: "#64748b" // slate-500 - professional gray
    };

    let currentAngle = -90; // Start at top

    const createArc = (startAngle: number, endAngle: number, color: string) => {
      const start = (startAngle * Math.PI) / 180;
      const end = (endAngle * Math.PI) / 180;
      
      const x1 = center + radius * Math.cos(start);
      const y1 = center + radius * Math.sin(start);
      const x2 = center + radius * Math.cos(end);
      const y2 = center + radius * Math.sin(end);
      
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      
      return `
        <path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${color}" stroke="white" stroke-width="1" />
      `;
    };

    let arcs = "";
    
    if (yesPercent > 0) {
      const angle = yesPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.yes);
      currentAngle += angle;
    }
    
    if (maybePercent > 0) {
      const angle = maybePercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.maybe);
      currentAngle += angle;
    }
    
    if (noPercent > 0) {
      const angle = noPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.no);
      currentAngle += angle;
    }
    
    if (notInvitedPercent > 0) {
      const angle = notInvitedPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.notInvited);
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${arcs}
      </svg>
    `;
  };

  // Helper function to convert district ID to display name
  const getDistrictDisplayName = (districtId: string): string => {
    const district = districts.find(d => d.id === districtId);
    if (district?.name) return district.name;
    // Convert ID to display name (e.g., "SouthTexas" -> "South Texas")
    // Handle hyphens: add spaces on both sides
    return districtId
      .replace(/-/g, ' - ') // Add spaces around hyphens
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between two capitals followed by lowercase
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim()
      .replace(/^./, str => str.toUpperCase());
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!hoveredDistrict || !tooltipPos) return null;
    
    const district = districts.find(d => d.id === hoveredDistrict);
    // Provide default stats if district not found or has no stats
    const stats = districtStats[hoveredDistrict] || {
      yes: 0,
      maybe: 0,
      no: 0,
      notInvited: 0,
      total: 0,
    };
    const invited = stats.yes + stats.maybe + stats.no;
    const pieChartSvg = generatePieChart(stats, 80); // Larger pie chart for tooltip
    
    return (
      <div
        className="fixed z-50 bg-white backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/80 p-4 pointer-events-none tooltip-animate"
        style={{
          left: tooltipPos.x + 15,
          top: tooltipPos.y + 15,
        }}
      >
          <div className="text-gray-800 mb-3" style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-0.01em' }}>
          {getDistrictDisplayName(hoveredDistrict)} {district?.region && (
            <>
                <span className="text-gray-300 mx-1">|</span> <span className="text-gray-500" style={{ fontSize: '16px', fontWeight: 400 }}>{district.region}</span>
            </>
          )}
        </div>
        
        {/* Pie Chart and Stats Side by Side */}
        <div className="flex gap-4 items-center">
          {/* Pie Chart */}
          {pieChartSvg && (
            <div className="flex-shrink-0" dangerouslySetInnerHTML={{ __html: pieChartSvg }} />
          )}
          
          {/* Stats */}
            <div className="flex-1" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#047857]"></div>
                <span className="text-gray-600">Going:</span>
              </div>
                <span className="text-gray-800" style={{ fontWeight: 500, fontSize: '15px' }}>{stats.yes}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ca8a04]"></div>
                <span className="text-gray-600">Maybe:</span>
              </div>
                <span className="text-gray-800" style={{ fontWeight: 500, fontSize: '15px' }}>{stats.maybe}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]"></div>
                <span className="text-gray-600">Not Going:</span>
              </div>
                <span className="text-gray-800" style={{ fontWeight: 500, fontSize: '15px' }}>{stats.no}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></div>
                <span className="text-gray-600 whitespace-nowrap">Not Invited Yet:</span>
              </div>
                <span className="text-gray-800" style={{ fontWeight: 500, fontSize: '15px' }}>{stats.notInvited}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div 
        className="relative w-full h-full min-h-[720px]"
        style={{
          // Enhanced elevation effect - stronger shadow for more depth
          filter: 'drop-shadow(0 12px 32px rgba(0, 0, 0, 0.12)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))',
        }}
      >
        {/* Not Yet Invited Count */}
        <div className="absolute left-6 z-40 flex flex-col gap-1" style={{ top: '16px' }}>
          <div className="flex items-center gap-3">
            {/* Not Invited Toggle */}
            <button
              onClick={() => toggleMetric('notInvited')}
              className="flex items-center transition-all duration-200 hover:scale-110"
            >
              <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                activeMetrics.has('notInvited') 
                  ? 'bg-slate-500 border-slate-500' 
                  : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}
              style={{
                boxShadow: activeMetrics.has('notInvited') 
                  ? '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                {activeMetrics.has('notInvited') && (
                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
            <span className="text-4xl text-slate-800">
              <span className="font-semibold">{nationalTotals.notInvited}</span> <span className="font-medium">Not Invited Yet</span>
            </span>
          </div>
        </div>
        
        {/* Top Right Content - Right Aligned */}
        <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
          {/* Label above metrics - right aligned */}
          <div className="flex items-center justify-end">
          <span 
              className="text-4xl font-semibold text-slate-800 transition-opacity duration-300 tracking-tight"
              style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {displayedLabel}
          </span>
        </div>
        
          {/* Metrics section - moved down with more spacing */}
          <div className="flex flex-col items-end gap-2" style={{ marginTop: '1.5rem' }}>
        {/* Going */}
        <button
          onClick={() => toggleMetric('yes')}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          style={{ 
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
          }}
        >
            <span className="text-4xl font-medium text-slate-700 whitespace-nowrap tracking-tight" style={{ lineHeight: '1', minWidth: '6.5rem', textAlign: 'right' }}>Going</span>
            <span className="text-4xl font-semibold text-slate-900" style={{ lineHeight: '1', minWidth: '4rem', textAlign: 'center' }}>{displayedTotals.yes}</span>
            <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
            activeMetrics.has('yes') 
                ? 'bg-emerald-700 border-emerald-700' 
                : 'border-slate-300 hover:border-emerald-600 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('yes') 
                ? '0 4px 12px rgba(4, 120, 87, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)' 
                : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
          }}>
            {activeMetrics.has('yes') && (
              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        
        {/* Maybe */}
        <button
          onClick={() => toggleMetric('maybe')}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          style={{ 
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
          }}
        >
            <span className="text-3xl font-medium text-slate-700 whitespace-nowrap tracking-tight" style={{ lineHeight: '1', minWidth: '6.5rem', textAlign: 'right' }}>Maybe</span>
            <span className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ lineHeight: '1', minWidth: '4rem', textAlign: 'center' }}>{displayedTotals.maybe}</span>
            <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
            activeMetrics.has('maybe') 
                ? 'bg-yellow-600 border-yellow-600' 
                : 'border-slate-300 hover:border-yellow-600 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('maybe') 
                ? '0 4px 12px rgba(180, 83, 9, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)' 
                : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
          }}>
            {activeMetrics.has('maybe') && (
              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        
        {/* Not Going */}
        <button
          onClick={() => toggleMetric('no')}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          style={{ 
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
          }}
        >
            <span className="text-2xl font-medium text-slate-700 whitespace-nowrap tracking-tight" style={{ lineHeight: '1', minWidth: '6.5rem', textAlign: 'right' }}>Not Going</span>
            <span className="text-2xl font-semibold text-slate-900 tracking-tight" style={{ lineHeight: '1', minWidth: '4rem', textAlign: 'center' }}>{displayedTotals.no}</span>
            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
            activeMetrics.has('no') 
                ? 'bg-red-700 border-red-700' 
                : 'border-slate-300 hover:border-red-700 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('no') 
                ? '0 4px 12px rgba(185, 28, 28, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)' 
                : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
          }}>
            {activeMetrics.has('no') && (
              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
          </div>
        </div>
        
        {/* Background click layer - captures clicks on empty space */}
        <div 
          className="absolute inset-0 z-0"
          onClick={(e) => {
            // Trigger background click when clicking on empty space
            if (onBackgroundClick) {
              onBackgroundClick();
            }
          }}
        />
        
        {/* Visual layer - smooth, gap-free appearance with subtle blur */}
        <div 
          ref={visualContainerRef}
          className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          style={{
            filter: 'blur(0.3px)', // Minimal blur to fill tiny gaps while preserving sharp edges
            transform: selectedDistrictId 
              ? 'scale(1.05) translateX(0px)' // Larger scale, centered when panel open
              : 'scale(1.03) translateX(-50px)', // Make map just a tiny bit bigger and shift left
            transformOrigin: 'center',
          }}
        />
        
        {/* Pie charts layer - removed per user request */}
        
        {/* NXA National Button - Positioned absolutely, transforms with map */}
        {!selectedDistrictId && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{
            transform: selectedDistrictId 
              ? 'scale(1.05) translateX(0px)'
              : 'scale(1.03) translateX(-50px)',
            transformOrigin: 'center',
          }}
        >
          <div
            className="absolute cursor-pointer pointer-events-auto"
            style={{
              left: '12%', // Moved to the left a little
              bottom: '5%', // Moved up a little
              transform: 'translate(-50%, 50%)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNationalClick?.();
            }}
            onMouseEnter={(e) => {
              const circle = e.currentTarget.querySelector('div');
              if (circle) circle.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              const circle = e.currentTarget.querySelector('div');
              if (circle) circle.style.backgroundColor = '#334155';
            }}
          >
            <div
              className="rounded-full bg-slate-700 hover:bg-red-700 flex items-center justify-center transition-colors duration-200"
              style={{
                width: '3.5vw', // Larger default size, scales with viewport
                height: '3.5vw',
                minWidth: '40px', // Minimum size
                minHeight: '40px',
              }}
            >
              <span className="text-white text-sm font-semibold">NXA</span>
            </div>
          </div>
        </div>
        )}
        
        {/* Click layer for NXA button */}
        {!selectedDistrictId && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-45 pointer-events-none"
          style={{
            transform: 'scale(1.03) translateX(-20px)',
            transformOrigin: 'center',
          }}
        >
          <div
            className="absolute cursor-pointer pointer-events-auto"
            style={{
              left: '12%',
              bottom: '5%',
              transform: 'translate(-50%, 50%)',
              width: '3.5vw',
              height: '3.5vw',
              minWidth: '40px',
              minHeight: '40px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNationalClick?.();
            }}
          />
        </div>
        )}
        
        {/* Invisible SVG click zones */}
        <div 
          ref={svgContainerRef} 
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{ 
            opacity: 0, 
            pointerEvents: 'auto',
            transform: selectedDistrictId
              ? 'scale(1.05) translateX(0px)' // Match visual layer when panel open
              : 'scale(1.03) translateX(-50px)', // Match visual layer scale and shift left - FIXED: was -20px
            transformOrigin: 'center',
          }}
          onClick={(e) => {
            // If clicking on the SVG container itself (not a path), close panels
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
              if (onBackgroundClick) {
                onBackgroundClick();
              }
            }
          }}
        />
        
        {/* Metric Overlays - Anchored to Region Labels around map edges */}
        <div className="absolute inset-0 flex items-center justify-center z-35 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid meet">
            {activeMetrics.size > 0 && (() => {
                // Aggregate stats by region
                const regionStats: Record<string, DistrictStats> = {};
                districts.forEach(district => {
                  const stats = districtStats[district.id];
                  if (!stats) return;
                  const region = district.region || 'Unknown';
                  if (!regionStats[region]) {
                    regionStats[region] = { yes: 0, maybe: 0, no: 0, notInvited: 0, total: 0 };
                  }
                  regionStats[region].yes += stats.yes;
                  regionStats[region].maybe += stats.maybe;
                  regionStats[region].no += stats.no;
                  regionStats[region].notInvited += stats.notInvited;
                  regionStats[region].total += stats.total;
                });
                
                // Pre-calculate all regions and their heights for collision detection
                const allRegions: string[] = [];
                const allTotalHeights: Record<string, number> = {};
                const allMetricsToShow: Record<string, Array<{ label: string; value: number }>> = {};
                
                Object.keys(baseRegionPositions).forEach(region => {
                  const stats = regionStats[region] || { yes: 0, maybe: 0, no: 0, notInvited: 0, total: 0 };
                  const metricsToShow: Array<{ label: string; value: number }> = [];
                  if (activeMetrics.has('yes')) metricsToShow.push({ label: 'Going', value: stats.yes });
                  if (activeMetrics.has('maybe')) metricsToShow.push({ label: 'Maybe', value: stats.maybe });
                  if (activeMetrics.has('no')) metricsToShow.push({ label: 'Not Going', value: stats.no });
                  if (activeMetrics.has('notInvited')) metricsToShow.push({ label: 'Not Invited', value: stats.notInvited });
                  
                  if (metricsToShow.length > 0) {
                    allRegions.push(region);
                    allMetricsToShow[region] = metricsToShow;
                    const isSingleMetric = metricsToShow.length === 1;
                    const lineHeight = isSingleMetric ? 26 : 22;
                    allTotalHeights[region] = metricsToShow.length * lineHeight;
                  }
                });
                
                return allRegions.map((region) => {
                  const stats = regionStats[region] || { yes: 0, maybe: 0, no: 0, notInvited: 0, total: 0 };
                  const metricsToShow = allMetricsToShow[region];
                  
                  if (!metricsToShow || metricsToShow.length === 0) return null;
                  
                  const isSingleMetric = metricsToShow.length === 1;
                  const lineHeight = isSingleMetric ? 26 : 22;
                  const isHovered = hoveredRegionLabel === region;
                  const totalHeight = allTotalHeights[region];
                  
                  // Calculate position with collision detection
                  const pos = getDynamicPosition(region, activeMetrics.size, totalHeight, allRegions, allTotalHeights);
                  const direction = pos.labelDirection;
                  
                  // Calculate region name position based on direction with more padding
                  let nameX = pos.labelX;
                  let nameY = pos.labelY;
                  let nameAnchor: 'start' | 'middle' | 'end' = 'middle';
                  const namePadding = 24; // Increased padding to avoid overlap with numbers
                  
                  if (direction === 'above') {
                    nameY = pos.labelY - namePadding;
                  } else if (direction === 'below') {
                    nameY = pos.labelY + totalHeight + namePadding;
                  } else if (direction === 'left') {
                    nameX = pos.labelX - namePadding;
                    nameY = pos.labelY - (totalHeight / 2) + 4;
                    nameAnchor = 'end';
                  } else if (direction === 'right') {
                    nameX = pos.labelX + namePadding;
                    nameY = pos.labelY - (totalHeight / 2) + 4;
                    nameAnchor = 'start';
                  }
                  
                  return (
                    <g 
                      key={region} 
                      className="metric-label-group cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => setHoveredRegionLabel(region)}
                      onMouseLeave={() => setHoveredRegionLabel(null)}
                    >
                      {/* Invisible hit area for hover detection */}
                      <rect
                        x={pos.labelX - 40}
                        y={pos.labelY - 25}
                        width={80}
                        height={totalHeight + 40}
                        fill="transparent"
                        rx="4"
                      />
                      
                      {/* Region name - only visible on hover, bigger with more spacing */}
                      <text
                        x={nameX}
                        y={nameY}
                        textAnchor={nameAnchor}
                        fill="#64748b"
                        fontSize={isSingleMetric ? '13px' : '12px'}
                        fontWeight="600"
                        letterSpacing="0.5px"
                        className="select-none"
                        style={{ 
                          textTransform: 'uppercase',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 0.15s ease'
                        }}
                      >
                        {region}
                      </text>
                      
                      {/* Metric values with colored dots */}
                      {metricsToShow.map((metric, index) => {
                        // Professional color mapping for each metric type
                        const dotColor = 
                          metric.label === 'Going' ? '#047857' :      // emerald-700
                          metric.label === 'Maybe' ? '#ca8a04' :      // yellow-600
                          metric.label === 'Not Going' ? '#b91c1c' :  // red-700
                          '#64748b';                                   // slate-500 for Not Invited
                        
                        const dotRadius = isSingleMetric ? 6 : 5;
                        
                        return (
                          <g key={metric.label}>
                            {/* Colored dot */}
                            <circle
                              cx={pos.labelX - (isSingleMetric ? 26 : 18)}
                              cy={pos.labelY + (index * lineHeight) - (isSingleMetric ? 6 : 4)}
                              r={dotRadius}
                              fill={dotColor}
                              className="select-none"
                            />
                            {/* Metric number */}
                            <text
                              x={pos.labelX}
                              y={pos.labelY + (index * lineHeight)}
                              textAnchor="middle"
                              fill={isHovered ? '#0f172a' : '#334155'}
                              fontSize={isSingleMetric ? '22px' : '15px'}
                              fontWeight="700"
                              letterSpacing="-0.3px"
                              className="select-none"
                              style={{ 
                                transition: 'fill 0.15s ease',
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                              }}
                            >
                              {metric.value}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                });
              })()}
            
          </svg>
        </div>
      </div>
      
      {/* Tooltip */}
      {renderTooltip()}
      

    </div>
  );
}
