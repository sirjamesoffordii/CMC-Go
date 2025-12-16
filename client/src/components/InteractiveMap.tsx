import { useEffect, useRef, useState } from "react";
import { District } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
  onBackgroundClick?: () => void;
}

interface DistrictStats {
  yes: number;
  maybe: number;
  no: number;
  notInvited: number;
  total: number;
}

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
  "NorthMissouri": { x: 557, y: 262 },
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
  "SouthMissouri": { x: 581, y: 291 },
  "SouthTexas": { x: 503, y: 430 },
  "Tennessee": { x: 650, y: 312 },
  "Utah": { x: 323, y: 239 },
  "Washington": { x: 238, y: 100 },
  "WestFlorida": { x: 666, y: 401 },
  "WestTexas": { x: 422, y: 390 },
  "Wisconsin-NorthMichigan": { x: 597, y: 154 },
  "Wyoming": { x: 377, y: 195 },
};

export function InteractiveMap({ districts, selectedDistrictId, onDistrictSelect, onBackgroundClick }: InteractiveMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const visualContainerRef = useRef<HTMLDivElement>(null);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  
  // Fetch all people to calculate district stats
  const { data: allPeople = [] } = trpc.people.list.useQuery();

  // Calculate stats for each district
  const districtStats = districts.reduce<Record<string, DistrictStats>>((acc, district) => {
    const districtPeople = allPeople.filter(p => p.districtId === district.id);
    acc[district.id] = {
      yes: districtPeople.filter(p => p.status === "Going").length,
      maybe: districtPeople.filter(p => p.status === "Maybe").length,
      no: districtPeople.filter(p => p.status === "Not Going").length,
      notInvited: districtPeople.filter(p => p.status === "Not invited yet").length,
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

    // Regional color mapping - sophisticated, premium tones
    const regionColors: Record<string, string> = {
      "Northwest": "#6CB4E8",           // soft cyan
      "Big Sky": "#B89968",             // refined tan
      "Great Plains North": "#7D3C98", // deep purple
      "Great Lakes": "#5499C7",        // refined blue
      "Great Plains South": "#F7DC6F", // soft gold
      "Mid-Atlantic": "#E59866",       // warm terracotta
      "Mid-Atlantic (Extended)": "#E59866", // warm terracotta
      "Northeast": "#EC407A",          // refined pink
      "South Central": "#E57373",      // soft red
      "Southeast": "#66BB6A",          // refined green
      "Texico": "#AB47BC",             // refined purple
      "West Coast": "#FF9800",         // warm orange
    };

    // Style visual paths (what user sees) - smooth, no borders
    visualPaths.forEach(path => {
      const pathId = path.getAttribute("inkscape:label") || 
                     path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                     path.getAttribute("id");
      if (!pathId) return;

      const district = districts.find(d => d.id === pathId);
      if (!district) return;

      const baseColor = regionColors[district.region] || "#e5e7eb";

      // Visual layer: solid colors with white outlines
      path.style.fill = baseColor;
      path.style.stroke = "#ffffff";
      path.style.strokeWidth = "0.6";
      path.style.strokeDasharray = ""; // Solid line by default
      path.style.transition = "all 0.2s ease";
      
      // Apply selected state styling
      if (selectedDistrictId === pathId) {
        path.style.filter = "brightness(0.92)";
      } else {
        path.style.filter = "none";
      }
    });

    // Setup click handlers on invisible layer
    clickPaths.forEach(path => {
      const pathId = path.getAttribute("inkscape:label") || 
                     path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                     path.getAttribute("id");
      if (!pathId) return;

      const district = districts.find(d => d.id === pathId);
      if (!district) return;

      path.style.cursor = "pointer";
      
      // Click handler
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        onDistrictSelect(pathId);
      });

      // Hover effects - update visual layer when hovering over click layer
      path.addEventListener("mouseenter", (e: MouseEvent) => {
        setHoveredDistrict(pathId);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        
        const hoveredRegion = district.region;
        
        // Apply region-based highlighting
        visualPaths.forEach(vPath => {
          const vPathId = vPath.getAttribute("inkscape:label") || 
                         vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                         vPath.getAttribute("id");
          
          const vDistrict = districts.find(d => d.id === vPathId);
          if (!vDistrict) return;
          
          if (vPathId === pathId) {
            // Hovered district: brighten and thicken border
            if (selectedDistrictId !== pathId) {
              vPath.style.filter = "brightness(1.08)";
              vPath.style.strokeWidth = "1.2";
            }
          } else if (vDistrict.region === hoveredRegion) {
            // Same region: subtly increase opacity
            vPath.style.opacity = "1";
          } else {
            // Other regions: fade slightly
            vPath.style.opacity = "0.6";
          }
        });
      });

      path.addEventListener("mousemove", (e: MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      });

      path.addEventListener("mouseleave", () => {
        setHoveredDistrict(null);
        setTooltipPos(null);
        
        // Reset all paths to default state
        visualPaths.forEach(vPath => {
          const vPathId = vPath.getAttribute("inkscape:label") || 
                         vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                         vPath.getAttribute("id");
          
          if (selectedDistrictId !== vPathId) {
            vPath.style.filter = "none";
            vPath.style.strokeWidth = "0.6";
            vPath.style.opacity = "1";
          }
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
    if (total === 0) return null;

    const radius = size / 2;
    const center = size / 2;
    
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

  // Render tooltip
  const renderTooltip = () => {
    if (!hoveredDistrict || !tooltipPos) return null;
    
    const district = districts.find(d => d.id === hoveredDistrict);
    if (!district) return null;
    
    const stats = districtStats[hoveredDistrict];
    const invited = stats.yes + stats.maybe + stats.no;
    const pieChartSvg = generatePieChart(stats, 80); // Larger pie chart for tooltip
    
    return (
      <div
        className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-300 p-3 pointer-events-none"
        style={{
          left: tooltipPos.x + 15,
          top: tooltipPos.y + 15,
        }}
      >
        <div className="font-bold text-lg text-gray-900 mb-2">
          {district.id} <span className="text-gray-400">|</span> <span className="text-sm font-normal text-gray-600">{district.region}</span>
        </div>
        
        {/* Pie Chart and Stats Side by Side */}
        <div className="flex gap-3 items-center">
          {/* Pie Chart */}
          {pieChartSvg && (
            <div className="flex-shrink-0" dangerouslySetInnerHTML={{ __html: pieChartSvg }} />
          )}
          
          {/* Stats */}
          <div className="text-xs space-y-1 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                <span className="font-medium">Going:</span>
              </div>
              <span className="font-semibold">{stats.yes}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
                <span className="font-medium">Maybe:</span>
              </div>
              <span className="font-semibold">{stats.maybe}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                <span className="font-medium">Not Going:</span>
              </div>
              <span className="font-semibold">{stats.no}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#d1d5db]"></div>
                <span className="font-medium whitespace-nowrap">Not Invited Yet:</span>
              </div>
              <span className="font-semibold">{stats.notInvited}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div 
        className="relative w-full h-full min-h-[700px]"
        style={{
          // Subtle elevation effect - soft diffused shadow for grounded presence
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.06)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.04))',
        }}
      >
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
          }}
        />
        
        {/* Pie charts layer - removed per user request */}
        
        {/* Invisible SVG click zones */}
        <div 
          ref={svgContainerRef} 
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{ opacity: 0, pointerEvents: 'auto' }}
          onClick={(e) => {
            // If clicking on the SVG container itself (not a path), close panels
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
              if (onBackgroundClick) {
                onBackgroundClick();
              }
            }
          }}
        />
      </div>
      
      {/* Tooltip */}
      {renderTooltip()}
    </div>
  );
}
