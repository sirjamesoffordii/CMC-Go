import { useEffect, useRef, useState } from "react";
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

// Dynamic positioning function - only pushes metrics away if they would touch the map
const getDynamicPosition = (
  region: string, 
  activeMetricCount: number,
  totalHeight: number
): { labelX: number; labelY: number; labelDirection: 'above' | 'below' | 'left' | 'right' } => {
  const base = baseRegionPositions[region];
  if (!base) return { labelX: 0, labelY: 0, labelDirection: 'above' };
  
  let labelX = base.baseX;
  let labelY = base.baseY;
  
  // Calculate metric bounds
  const metricWidth = 80; // Approximate width of metric text + dot
  const metricPadding = 15; // Minimum padding from map edge
  const dotOffset = 26; // Distance from center to dot (for 'right' direction)
  const textHeight = totalHeight;
  
  // Check if metrics would overlap with map and calculate required offset
  let requiredOffset = 0;
  
  switch (base.labelDirection) {
    case 'above': {
      // Metrics extend upward from labelY by textHeight/2
      // Check if bottom of metrics (labelY + textHeight/2) would be above map top edge
      const metricBottom = labelY + (textHeight / 2);
      if (metricBottom > MAP_BOUNDS.top - metricPadding) {
        requiredOffset = metricBottom - (MAP_BOUNDS.top - metricPadding);
      }
      labelY -= requiredOffset;
      break;
    }
    case 'below': {
      // Metrics extend downward from labelY by textHeight/2
      // Check if top of metrics (labelY - textHeight/2) would be below map bottom edge
      const metricTop = labelY - (textHeight / 2);
      const wouldTouchMap = metricTop < MAP_BOUNDS.bottom + metricPadding;
      const wouldGoOffScreen = labelY + (textHeight / 2) > MAP_BOUNDS.viewBoxHeight - 15; // 15px margin from bottom
      
      if (wouldGoOffScreen) {
        // Push up to stay on screen
        requiredOffset = (labelY + (textHeight / 2)) - (MAP_BOUNDS.viewBoxHeight - 15);
        labelY -= requiredOffset;
      } else if (wouldTouchMap) {
        // Push down to clear map
        requiredOffset = (MAP_BOUNDS.bottom + metricPadding) - metricTop;
        labelY += requiredOffset;
      }
      break;
    }
    case 'right': {
      // Metrics extend rightward from labelX
      // Check if left edge of metrics (labelX - metricWidth/2) would be to the left of map right edge
      const metricLeft = labelX - (metricWidth / 2);
      if (metricLeft < MAP_BOUNDS.right + metricPadding) {
        requiredOffset = (MAP_BOUNDS.right + metricPadding) - metricLeft;
      }
      labelX += requiredOffset;
      break;
    }
    case 'left': {
      // Metrics extend leftward from labelX
      // Check if right edge of metrics (labelX + metricWidth/2) would be to the right of map left edge
      const metricRight = labelX + (metricWidth / 2);
      if (metricRight > MAP_BOUNDS.left - metricPadding) {
        requiredOffset = metricRight - (MAP_BOUNDS.left - metricPadding);
      }
      labelX -= requiredOffset;
      break;
    }
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
  "Alaska": { x: 110, y: 77 },
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

    // Regional color mapping – richer, deeper palette (premium, not cartoon)
    // Goal: clear differentiation with deeper saturation while staying refined.
    const regionColors: Record<string, string> = {
      "Northwest": "#6FA7C8",                 // deep coastal blue
      "Big Sky": "#A79263",                   // rich warm stone
      "Great Plains North": "#6E5C8B",        // deep purple
      "Great Lakes": "#5F97B8",               // rich steel blue
      "Great Plains South": "#D0B457",        // golden wheat
      "Mid-Atlantic": "#C6846A",              // terracotta clay
      "Northeast": "#C65E86",                 // deep rose
      "South Central": "#B96863",             // rich brick
      "Southeast": "#5FA37C",                 // deep sage
      "Texico": "#B85FA3",                    // pink-purple magenta
      "West Coast": "#C08A4F",                // warm amber
    };

    // Premium map styling constants - editorial dashboard style
    const BORDER_COLOR = "rgba(250,250,248,0.85)";  // off-white instead of pure white
    const BORDER_WIDTH = "0.25";          // thinner borders for editorial look
    const BORDER_WIDTH_HOVER = "0.6";
    const TRANSITION = "filter 200ms ease, opacity 200ms ease, stroke-width 200ms ease, transform 200ms ease";
    const DIM_OPACITY = "0.88";            // more subtle dimming
    const DIM_FILTER = "saturate(0.95) brightness(1.00)";
    const LIFT_FILTER = "saturate(1.05) brightness(0.85) drop-shadow(0 1px 3px rgba(0,0,0,0.1))";
    const SELECTED_FILTER = "saturate(0.95) brightness(0.98)";

    // Style visual paths (what user sees)
    visualPaths.forEach(path => {
      const pathId =
        path.getAttribute("inkscape:label") ||
        path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
        path.getAttribute("id");
      if (!pathId) return;

      const district = districts.find(d => d.id === pathId);
      // Get region from district in database, or from mapping if not in database yet
      const region = district?.region || (pathId ? districtRegionMap[pathId] : undefined);
      const baseColor = region ? (regionColors[region] || "#e5e7eb") : "#e5e7eb";

      path.style.fill = baseColor;
      path.style.stroke = BORDER_COLOR;
      path.style.strokeWidth = BORDER_WIDTH;
      path.style.strokeDasharray = "";
      path.style.transition = TRANSITION;
      path.style.transformOrigin = "center";
      path.style.transform = "scale(1) translateY(0)";

      if (selectedDistrictId === pathId) {
        path.style.filter = SELECTED_FILTER;
      } else {
        path.style.filter = "none";
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
      const district = districts.find(d => d.id === pathId);

      path.style.cursor = "pointer";
      
      // Click handler - allow clicking even if district not in database
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        onDistrictSelect(pathId);
      });

       // Hover behavior: focus district, highlight region, dim others
      path.addEventListener("mouseenter", (e: MouseEvent) => {
        setHoveredDistrict(pathId);
        // Get region from district or mapping
        const region = district?.region || (pathId ? districtRegionMap[pathId] : undefined);
        if (region) {
          setHoveredRegion(region);
        }
        setTooltipPos({ x: e.clientX, y: e.clientY });
        
        visualPaths.forEach(vPath => {
          const vPathId =
            vPath.getAttribute("inkscape:label") ||
            vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
            vPath.getAttribute("id");
          if (!vPathId) return;
          
          const vDistrict = districts.find(d => d.id === vPathId);
          const vRegion = vDistrict?.region || districtRegionMap[vPathId];
          const currentRegion = district?.region || (pathId ? districtRegionMap[pathId] : undefined);
          const isInSameRegion = vRegion && currentRegion && vRegion === currentRegion;

          if (vPathId === pathId) {
            // Hovered district - breaking apart effect with elevation
            vPath.style.opacity = "1";
            vPath.style.filter = selectedDistrictId === pathId ? SELECTED_FILTER : LIFT_FILTER;
            vPath.style.strokeWidth = BORDER_WIDTH_HOVER;
            vPath.style.transform = "scale(1.005) translateY(-0.5px)";
            vPath.style.transformOrigin = "center";
          } else if (isInSameRegion) {
            // Same region - subtle highlight only
            vPath.style.opacity = "1";
            vPath.style.filter = "saturate(1.02) brightness(1.05)";
            vPath.style.strokeWidth = BORDER_WIDTH;
            vPath.style.stroke = BORDER_COLOR;
            vPath.style.transform = "scale(1) translateY(0)";
          } else {
            // Other regions - dimmed
            vPath.style.opacity = DIM_OPACITY;
            vPath.style.filter = DIM_FILTER;
            vPath.style.strokeWidth = BORDER_WIDTH;
            vPath.style.transform = "scale(1) translateY(0)";
          }
        });
      });

      path.addEventListener("mousemove", (e: MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      });

      path.addEventListener("mouseleave", () => {
        setHoveredDistrict(null);
        setHoveredRegion(null);
        setTooltipPos(null);

        visualPaths.forEach(vPath => {
          const vPathId =
            vPath.getAttribute("inkscape:label") ||
            vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ||
            vPath.getAttribute("id");

          if (selectedDistrictId === vPathId) {
            vPath.style.filter = SELECTED_FILTER;
          } else {
            vPath.style.filter = "none";
          }
          vPath.style.strokeWidth = BORDER_WIDTH;
          vPath.style.stroke = BORDER_COLOR;
          vPath.style.opacity = "1";
          vPath.style.transform = "scale(1) translateY(0)";
        });
      });
    });

    // Cleanup
    return () => {
      clickPaths.forEach(path => {
        path.replaceWith(path.cloneNode(true));
      });
    };
  }, [svgContent, districts, selectedDistrictId, onDistrictSelect]);

  // Generate pie chart SVG
  const generatePieChart = (stats: DistrictStats, size: number = 40) => {
    const { yes, maybe, no, notInvited, total } = stats;
    
    const radius = size / 2;
    const center = size / 2;
    
    // If no people, show empty gray circle with "No Data" text
    if (total === 0) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1" />
          <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#9ca3af" font-weight="500">No</text>
          <text x="${center}" y="${center + 10}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#9ca3af" font-weight="500">Data</text>
        </svg>
      `;
    }
    
    // Calculate percentages
    const yesPercent = yes / total;
    const maybePercent = maybe / total;
    const noPercent = no / total;
    const notInvitedPercent = notInvited / total;

    // Colors matching the document requirements
    const colors = {
      yes: "#10b981",      // green
      maybe: "#eab308",    // yellow
      no: "#ef4444",       // red
      notInvited: "#d1d5db" // light gray
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
        <div className="text-gray-800 mb-3" style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '-0.01em' }}>
          {getDistrictDisplayName(hoveredDistrict)} {district?.region && (
            <>
              <span className="text-gray-300 mx-1">|</span> <span className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>{district.region}</span>
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
          <div className="flex-1" style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                <span className="text-gray-600">Going:</span>
              </div>
              <span className="text-gray-800" style={{ fontWeight: 500 }}>{stats.yes}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#eab308]"></div>
                <span className="text-gray-600">Maybe:</span>
              </div>
              <span className="text-gray-800" style={{ fontWeight: 500 }}>{stats.maybe}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                <span className="text-gray-600">Not Going:</span>
              </div>
              <span className="text-gray-800" style={{ fontWeight: 500 }}>{stats.no}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#d1d5db]"></div>
                <span className="text-gray-600 whitespace-nowrap">Not Invited Yet:</span>
              </div>
              <span className="text-gray-800" style={{ fontWeight: 500 }}>{stats.notInvited}</span>
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
          // Subtle elevation effect - soft diffused shadow for grounded presence
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.06)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.04))',
        }}
      >
        {/* Not Yet Invited Count */}
        <div className="absolute left-6 z-40 flex flex-col gap-1" style={{ top: '12px' }}>
          <div className="flex items-center gap-3">
            {/* Not Invited Toggle */}
            <button
              onClick={() => toggleMetric('notInvited')}
              className="flex items-center transition-all duration-200 hover:scale-110"
            >
              <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                activeMetrics.has('notInvited') 
                  ? 'bg-gray-400 border-gray-400' 
                  : 'border-gray-300 hover:border-gray-400 bg-white'
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
            <span className="text-3xl text-gray-800">
              <span className="font-bold">{nationalTotals.notInvited}</span> <span className="font-normal">Not Invited Yet</span>
            </span>
          </div>
          {/* Days until CMC - aligned with the number */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5"></div>
            <span className="text-xl text-gray-600">{daysUntilCMC} days until CMC</span>
          </div>
        </div>
        
        {/* Floating Metric Toggles - Visual Hierarchy */}
        {/* Label above metrics - centered */}
        <div 
          className="absolute right-4 z-40 transition-all duration-300"
          style={{ 
            top: '6px',
            right: '16px'
          }}
        >
          <span 
            className="text-5xl font-bold text-gray-800 transition-opacity duration-300"
            style={{
              fontFamily: '"Caveat", "Dancing Script", "Brush Script MT", "Comic Sans MS", cursive'
            }}
          >
            {displayedLabel}
          </span>
        </div>
        
        {/* Going */}
        <button
          onClick={() => toggleMetric('yes')}
          className="absolute top-[90px] z-40 flex items-center gap-3 transition-all duration-200 hover:scale-105"
          style={{ 
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
            right: '16px'
          }}
        >
          <span className="text-3xl font-normal text-gray-700 text-right" style={{ minWidth: '5.5rem' }}>Going</span>
          <span className="text-3xl font-bold text-gray-900 text-center" style={{ minWidth: '3.5rem' }}>{displayedTotals.yes}</span>
          <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
            activeMetrics.has('yes') 
              ? 'bg-green-500 border-green-500' 
              : 'border-gray-300 hover:border-green-400 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('yes') 
              ? '0 4px 12px rgba(34, 197, 94, 0.4), 0 2px 4px rgba(0, 0, 0, 0.15)' 
              : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)'
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
          className="absolute top-[135px] z-40 flex items-center gap-3 transition-all duration-200 hover:scale-105"
          style={{ 
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
            right: '16px'
          }}
        >
          <span className="text-2xl font-normal text-gray-700 text-right" style={{ minWidth: '5.5rem' }}>Maybe</span>
          <span className="text-2xl font-bold text-gray-900 text-center" style={{ minWidth: '3.5rem' }}>{displayedTotals.maybe}</span>
          <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
            activeMetrics.has('maybe') 
              ? 'bg-yellow-500 border-yellow-500' 
              : 'border-gray-300 hover:border-yellow-400 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('maybe') 
              ? '0 4px 12px rgba(234, 179, 8, 0.4), 0 2px 4px rgba(0, 0, 0, 0.15)' 
              : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)'
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
          className="absolute top-[180px] z-40 flex items-center gap-3 transition-all duration-200 hover:scale-105"
          style={{ 
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
            right: '16px'
          }}
        >
          <span className="text-xl font-normal text-gray-700 text-right whitespace-nowrap" style={{ minWidth: '5.5rem' }}>Not Going</span>
          <span className="text-xl font-bold text-gray-900 text-center" style={{ minWidth: '3.5rem' }}>{displayedTotals.no}</span>
          <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
            activeMetrics.has('no') 
              ? 'bg-red-500 border-red-500' 
              : 'border-gray-300 hover:border-red-400 bg-white'
          }`}
          style={{
            boxShadow: activeMetrics.has('no') 
              ? '0 4px 12px rgba(239, 68, 68, 0.4), 0 2px 4px rgba(0, 0, 0, 0.15)' 
              : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>
            {activeMetrics.has('no') && (
              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        
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
            transform: 'scale(1.03) translateX(-50px)', // Make map just a tiny bit bigger and shift left
            transformOrigin: 'center',
          }}
        />
        
        {/* Pie charts layer - removed per user request */}
        
        {/* Invisible SVG click zones */}
        <div 
          ref={svgContainerRef} 
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{ 
            opacity: 0, 
            pointerEvents: 'auto',
            transform: 'scale(1.03) translateX(-20px)', // Match visual layer scale and shift left
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
                
                return Object.keys(baseRegionPositions).map((region) => {
                  const stats = regionStats[region];
                  if (!stats || stats.total === 0) return null;
                  
                  // Get the single active metric value
                  let metricValue = 0;
                  let metricLabel = '';
                  if (activeMetrics.has('yes')) { metricValue = stats.yes; metricLabel = 'Going'; }
                  else if (activeMetrics.has('maybe')) { metricValue = stats.maybe; metricLabel = 'Maybe'; }
                  else if (activeMetrics.has('no')) { metricValue = stats.no; metricLabel = 'Not Going'; }
                  else if (activeMetrics.has('notInvited')) { metricValue = stats.notInvited; metricLabel = 'Not Invited'; }
                  
                  // For multiple metrics, show stacked
                  const metricsToShow: Array<{ label: string; value: number }> = [];
                  if (activeMetrics.has('yes')) metricsToShow.push({ label: 'Going', value: stats.yes });
                  if (activeMetrics.has('maybe')) metricsToShow.push({ label: 'Maybe', value: stats.maybe });
                  if (activeMetrics.has('no')) metricsToShow.push({ label: 'Not Going', value: stats.no });
                  if (activeMetrics.has('notInvited')) metricsToShow.push({ label: 'Not Invited', value: stats.notInvited });
                  
                  if (metricsToShow.length === 0) return null;
                  
                  const isSingleMetric = metricsToShow.length === 1;
                  const lineHeight = isSingleMetric ? 26 : 22;
                  const isHovered = hoveredRegionLabel === region;
                  const totalHeight = metricsToShow.length * lineHeight;
                  
                  // Calculate position based on whether metrics would touch the map
                  const pos = getDynamicPosition(region, activeMetrics.size, totalHeight);
                  const direction = pos.labelDirection;
                  
                  // Calculate region name position based on direction
                  let nameX = pos.labelX;
                  let nameY = pos.labelY;
                  let nameAnchor: 'start' | 'middle' | 'end' = 'middle';
                  
                  if (direction === 'above') {
                    nameY = pos.labelY - 18;
                  } else if (direction === 'below') {
                    nameY = pos.labelY + totalHeight + 14;
                  } else if (direction === 'left') {
                    nameX = pos.labelX - 8;
                    nameY = pos.labelY - 12;
                    nameAnchor = 'end';
                  } else if (direction === 'right') {
                    nameX = pos.labelX + 8;
                    nameY = pos.labelY - 12;
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
                      
                      {/* Region name - only visible on hover */}
                      <text
                        x={nameX}
                        y={nameY}
                        textAnchor={nameAnchor}
                        fill="#6b7280"
                        fontSize={isSingleMetric ? '10px' : '9px'}
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
                        // Color mapping for each metric type
                        const dotColor = 
                          metric.label === 'Going' ? '#22c55e' :      // Green
                          metric.label === 'Maybe' ? '#eab308' :      // Yellow
                          metric.label === 'Not Going' ? '#ef4444' :  // Red
                          '#9ca3af';                                   // Gray for Not Invited
                        
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
                              fill={isHovered ? '#111827' : '#374151'}
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
            
            {/* NXA National Circle - Inside South Missouri district */}
            <g 
                onClick={() => onNationalClick?.()}
                className="cursor-pointer group"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Circle with subdued color matching map */}
                <circle
                  cx="590"
                  cy="335"
                  r="10"
                  fill="#374151"
                  stroke="#ffffff"
                  strokeWidth="1"
                  className="transition-all duration-200 group-hover:fill-[#b91c1c]"
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                  }}
                />
                {/* NXA Text */}
                <text
                  x="590"
                  y="338"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="6"
                  fontWeight="600"
                  fontFamily="Arial, sans-serif"
                  className="pointer-events-none select-none"
                >
                  NXA
                </text>
            </g>
          </svg>
        </div>
      </div>
      
      {/* Tooltip */}
      {renderTooltip()}
      

    </div>
  );
}
