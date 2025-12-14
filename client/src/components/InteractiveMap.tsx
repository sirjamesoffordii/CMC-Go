import { useEffect, useRef, useState } from "react";
import { District } from "../../../drizzle/schema";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
}

export function InteractiveMap({ districts, selectedDistrictId, onDistrictSelect }: InteractiveMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    // Load SVG content
    fetch("/map.svg")
      .then(res => res.text())
      .then(svg => setSvgContent(svg))
      .catch(err => console.error("Failed to load map:", err));
  }, []);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;

    const container = svgContainerRef.current;
    container.innerHTML = svgContent;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Make SVG responsive
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    // Get all path elements
    const paths = svg.querySelectorAll("path");

    paths.forEach(path => {
      // Try multiple ways to get the label
      const pathId = path.getAttribute("inkscape:label") || 
                     path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || 
                     path.getAttribute("id");
      if (!pathId) return;

      // Check if this path corresponds to a district
      const district = districts.find(d => d.id === pathId);
      if (!district) return;

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

      const baseColor = regionColors[district.region] || "#e5e7eb";

      // Set initial styles
      path.style.cursor = "pointer";
      path.style.transition = "all 0.2s ease";
      
      // Apply selected state
      if (selectedDistrictId === pathId) {
        path.style.fill = baseColor;
        path.style.stroke = "#37474F";
        path.style.strokeWidth = "1.5";
        path.style.filter = "brightness(0.92)";
      } else {
        path.style.fill = baseColor;
        path.style.stroke = "#ffffff";
        path.style.strokeWidth = "0.3";
        path.style.filter = "none";
      }

      // Hover effects
      path.addEventListener("mouseenter", () => {
        if (selectedDistrictId !== pathId) {
          path.style.filter = "brightness(1.08)";
          path.style.strokeWidth = "0.5";
        }
      });

      path.addEventListener("mouseleave", () => {
        if (selectedDistrictId !== pathId) {
          path.style.fill = baseColor;
          path.style.stroke = "#ffffff";
          path.style.strokeWidth = "0.3";
          path.style.filter = "none";
        }
      });

      // Click handler
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        onDistrictSelect(pathId);
      });
    });

    // Cleanup
    return () => {
      paths.forEach(path => {
        path.replaceWith(path.cloneNode(true));
      });
    };
  }, [svgContent, districts, selectedDistrictId, onDistrictSelect]);

  return (
    <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
      <div 
        ref={svgContainerRef} 
        className="w-full h-full min-h-[500px] flex items-center justify-center"
      />
    </div>
  );
}
