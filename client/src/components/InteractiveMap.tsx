import { useEffect, useRef, useState } from "react";
import { District } from "../../../drizzle/schema";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
}

export function InteractiveMap({ districts, selectedDistrictId, onDistrictSelect }: InteractiveMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const visualContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");

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
      path.addEventListener("mouseenter", () => {
        if (selectedDistrictId !== pathId) {
          // Find corresponding visual path
          visualPaths.forEach(vPath => {
            const vPathId = vPath.getAttribute("inkscape:label") || 
                           vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                           vPath.getAttribute("id");
            if (vPathId === pathId) {
              vPath.style.filter = "brightness(1.08)";
            }
          });
        }
      });

      path.addEventListener("mouseleave", () => {
        if (selectedDistrictId !== pathId) {
          // Find corresponding visual path
          visualPaths.forEach(vPath => {
            const vPathId = vPath.getAttribute("inkscape:label") || 
                           vPath.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                           vPath.getAttribute("id");
            if (vPathId === pathId) {
              vPath.style.filter = "none";
            }
          });
        }
      });
    });

    // Cleanup
    return () => {
      clickPaths.forEach(path => {
        path.replaceWith(path.cloneNode(true));
      });
    };
  }, [svgContent, districts, selectedDistrictId, onDistrictSelect]);

  return (
    <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
      <div className="relative w-full h-full min-h-[500px]">
        {/* Visual layer - smooth, gap-free appearance with subtle blur */}
        <div 
          ref={visualContainerRef}
          className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          style={{
            filter: 'blur(0.8px)', // Stronger blur to fill gaps and smooth edges
          }}
        />
        {/* Invisible SVG click zones */}
        <div 
          ref={svgContainerRef} 
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        />
      </div>
    </div>
  );
}
