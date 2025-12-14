import { useEffect, useRef, useState } from "react";
import { District } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
}

interface DistrictStats {
  yes: number;
  maybe: number;
  no: number;
  notInvited: number;
  total: number;
}

// District centroids for pie chart positioning (approximate center of each state)
const districtCentroids: Record<string, { x: number; y: number }> = {
  "Alabama A": { x: 620, y: 420 },
  "Alabama B": { x: 620, y: 450 },
  "Alaska A": { x: 120, y: 580 },
  "Alaska B": { x: 120, y: 620 },
  "Arizona A": { x: 180, y: 420 },
  "Arizona B": { x: 180, y: 450 },
  "Connecticut A": { x: 850, y: 220 },
  "Connecticut B": { x: 850, y: 250 },
  "Florida A": { x: 720, y: 540 },
  "Florida B": { x: 720, y: 570 },
  "Hawaii A": { x: 280, y: 620 },
  "Hawaii B": { x: 280, y: 650 },
  "Illinois A": { x: 580, y: 280 },
  "Illinois B": { x: 580, y: 310 },
  "Indiana A": { x: 620, y: 280 },
  "Indiana B": { x: 620, y: 310 },
  "Kentucky A": { x: 640, y: 350 },
  "Kentucky B": { x: 640, y: 380 },
  "Louisiana A": { x: 560, y: 480 },
  "Louisiana B": { x: 560, y: 510 },
  "Maine A": { x: 880, y: 160 },
  "Maine B": { x: 880, y: 190 },
  "Massachusetts A": { x: 860, y: 210 },
  "Massachusetts B": { x: 860, y: 240 },
  "Michigan A": { x: 620, y: 240 },
  "Michigan B": { x: 620, y: 270 },
  "Mississippi A": { x: 580, y: 450 },
  "Mississippi B": { x: 580, y: 480 },
  "Montana A": { x: 280, y: 180 },
  "Montana B": { x: 280, y: 210 },
  "Nebraska A": { x: 420, y: 280 },
  "Nebraska B": { x: 420, y: 310 },
  "Nevada A": { x: 180, y: 280 },
  "Nevada B": { x: 180, y: 310 },
  "New Jersey A": { x: 820, y: 260 },
  "New Jersey B": { x: 820, y: 290 },
  "New York A": { x: 800, y: 220 },
  "New York B": { x: 800, y: 250 },
  "North Carolina A": { x: 740, y: 380 },
  "North Carolina B": { x: 740, y: 410 },
  "North Dakota A": { x: 380, y: 180 },
  "North Dakota B": { x: 380, y: 210 },
  "Ohio A": { x: 660, y: 300 },
  "Ohio B": { x: 660, y: 330 },
  "Oklahoma A": { x: 480, y: 400 },
  "Oklahoma B": { x: 480, y: 430 },
  "Oregon A": { x: 140, y: 200 },
  "Oregon B": { x: 140, y: 230 },
  "Pennsylvania A": { x: 780, y: 280 },
  "Pennsylvania B": { x: 780, y: 310 },
  "South Carolina A": { x: 720, y: 410 },
  "South Carolina B": { x: 720, y: 440 },
  "South Dakota A": { x: 380, y: 240 },
  "South Dakota B": { x: 380, y: 270 },
  "Tennessee A": { x: 640, y: 390 },
  "Tennessee B": { x: 640, y: 420 },
  "Vermont A": { x: 840, y: 180 },
  "Vermont B": { x: 840, y: 210 },
  "Virginia A": { x: 740, y: 340 },
  "Virginia B": { x: 740, y: 370 },
  "Washington A": { x: 140, y: 140 },
  "Washington B": { x: 140, y: 170 },
  "West Virginia A": { x: 700, y: 330 },
  "West Virginia B": { x: 700, y: 360 },
  "Wisconsin A": { x: 560, y: 240 },
  "Wisconsin B": { x: 560, y: 270 },
  "Wyoming A": { x: 300, y: 260 },
  "Wyoming B": { x: 300, y: 290 },
  "North California A": { x: 140, y: 300 },
  "North California B": { x: 140, y: 330 },
  "South California A": { x: 160, y: 380 },
  "South California B": { x: 160, y: 410 },
  "North Idaho A": { x: 220, y: 160 },
  "North Idaho B": { x: 220, y: 190 },
  "South Idaho A": { x: 220, y: 240 },
  "South Idaho B": { x: 220, y: 270 },
  "North Missouri A": { x: 520, y: 340 },
  "North Missouri B": { x: 520, y: 370 },
  "South Missouri A": { x: 520, y: 380 },
  "South Missouri B": { x: 520, y: 410 },
  "North Texas A": { x: 480, y: 460 },
  "North Texas B": { x: 480, y: 490 },
  "South Texas A": { x: 460, y: 520 },
  "South Texas B": { x: 460, y: 550 },
  "West Florida A": { x: 660, y: 520 },
  "West Florida B": { x: 660, y: 550 },
  "West Texas A": { x: 400, y: 480 },
  "West Texas B": { x: 400, y: 510 },
};

export function InteractiveMap({ districts, selectedDistrictId, onDistrictSelect }: InteractiveMapProps) {
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
      maybe: "#f59e0b",    // amber
      no: "#64748b",       // slate
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
        className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-300 p-4 pointer-events-none"
        style={{
          left: tooltipPos.x + 15,
          top: tooltipPos.y + 15,
          minWidth: '240px',
        }}
      >
        <div className="font-bold text-lg text-gray-900 mb-1">{district.id}</div>
        <div className="text-sm text-gray-600 mb-3">{district.region}</div>
        
        {/* Pie Chart */}
        {pieChartSvg && (
          <div className="flex justify-center mb-3" dangerouslySetInnerHTML={{ __html: pieChartSvg }} />
        )}
        
        {/* Stats */}
        <div className="text-sm space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
              <span className="font-medium">Yes:</span>
            </div>
            <span className="font-semibold">{stats.yes}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
              <span className="font-medium">Maybe:</span>
            </div>
            <span className="font-semibold">{stats.maybe}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#64748b]"></div>
              <span className="font-medium">No:</span>
            </div>
            <span className="font-semibold">{stats.no}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d1d5db]"></div>
              <span className="font-medium">Not invited:</span>
            </div>
            <span className="font-semibold">{stats.notInvited}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between font-bold">
              <span>Total Invited:</span>
              <span>{invited}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="relative w-full h-full min-h-[700px]">
        {/* Visual layer - smooth, gap-free appearance with subtle blur */}
        <div 
          ref={visualContainerRef}
          className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          style={{
            filter: 'blur(0.3px)', // Minimal blur to fill tiny gaps while preserving sharp edges
          }}
        />
        
        {/* Pie charts layer */}
        <div 
          ref={pieContainerRef}
          className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"
        >
          <div className="relative w-full h-full">
            {districts.map(district => {
              const centroid = districtCentroids[district.id];
              if (!centroid) return null;
              
              const stats = districtStats[district.id];
              if (!stats || stats.total === 0) return null;
              
              const pieChart = generatePieChart(stats);
              if (!pieChart) return null;
              
              return (
                <div
                  key={district.id}
                  className="absolute"
                  style={{
                    left: `${(centroid.x / 1000) * 100}%`,
                    top: `${(centroid.y / 700) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  dangerouslySetInnerHTML={{ __html: pieChart }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Invisible SVG click zones */}
        <div 
          ref={svgContainerRef} 
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        />
      </div>
      
      {/* Tooltip */}
      {renderTooltip()}
    </div>
  );
}
