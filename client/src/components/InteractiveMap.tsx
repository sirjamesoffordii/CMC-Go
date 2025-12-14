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

      // Regional color mapping - more muted, professional tones
      const regionColors: Record<string, string> = {
        "Northwest": "#5dade2",           // muted cyan/blue
        "Big Sky": "#b8936d",             // muted tan/brown
        "Great Plains North": "#8e44ad", // muted purple
        "Great Lakes": "#3498db",        // muted blue
        "Great Plains South": "#f4d03f", // muted yellow
        "Mid-Atlantic": "#e67e22",       // muted coral/orange
        "Mid-Atlantic (Extended)": "#e67e22", // muted coral/orange
        "Northeast": "#e91e63",          // muted pink
        "South Central": "#e74c3c",      // muted red
        "Southeast": "#27ae60",          // muted green
        "Texico": "#9b59b6",             // muted magenta/purple
        "West Coast": "#e67e22",         // muted orange
      };

      const baseColor = regionColors[district.region] || "#e5e7eb";

      // Set initial styles
      path.style.cursor = "pointer";
      path.style.transition = "all 0.2s ease";
      
      // Apply selected state
      if (selectedDistrictId === pathId) {
        path.style.fill = baseColor;
        path.style.stroke = "#2c3e50";
        path.style.strokeWidth = "2";
        path.style.filter = "brightness(0.9)";
      } else {
        path.style.fill = baseColor;
        path.style.stroke = "#ffffff";
        path.style.strokeWidth = "0.75";
        path.style.filter = "none";
      }

      // Hover effects
      path.addEventListener("mouseenter", () => {
        if (selectedDistrictId !== pathId) {
          path.style.filter = "brightness(1.1)";
          path.style.strokeWidth = "1.25";
        }
      });

      path.addEventListener("mouseleave", () => {
        if (selectedDistrictId !== pathId) {
          path.style.fill = baseColor;
          path.style.stroke = "#ffffff";
          path.style.strokeWidth = "0.75";
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
