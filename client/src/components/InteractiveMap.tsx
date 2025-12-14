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
      // Try inkscape:label first, then fall back to id
      const pathId = path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || path.getAttribute("id");
      if (!pathId) return;

      // Check if this path corresponds to a district
      const district = districts.find(d => d.id === pathId);
      if (!district) return;

      // Set initial styles
      path.style.cursor = "pointer";
      path.style.transition = "all 0.2s ease";
      
      // Apply selected state
      if (selectedDistrictId === pathId) {
        path.style.fill = "#3b82f6";
        path.style.stroke = "#1d4ed8";
        path.style.strokeWidth = "2";
      } else {
        path.style.fill = "#e5e7eb";
        path.style.stroke = "#9ca3af";
        path.style.strokeWidth = "1";
      }

      // Hover effects
      path.addEventListener("mouseenter", () => {
        if (selectedDistrictId !== pathId) {
          path.style.fill = "#d1d5db";
          path.style.stroke = "#6b7280";
          path.style.strokeWidth = "1.5";
        }
      });

      path.addEventListener("mouseleave", () => {
        if (selectedDistrictId !== pathId) {
          path.style.fill = "#e5e7eb";
          path.style.stroke = "#9ca3af";
          path.style.strokeWidth = "1";
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
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div 
        ref={svgContainerRef} 
        className="w-full h-full min-h-[500px] flex items-center justify-center"
      />
    </div>
  );
}
