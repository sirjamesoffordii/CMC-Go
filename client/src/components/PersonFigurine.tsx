import { useState } from "react";

interface PersonFigurineProps {
  personId: number;
  name: string;
  gender: "male" | "female";
  status: "Yes" | "Maybe" | "No" | "Not Invited";
  onStatusChange: (personId: number, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
}

const STATUS_COLORS = {
  "Yes": "#22c55e",      // Green
  "Maybe": "#eab308",    // Yellow
  "No": "#ef4444",       // Red
  "Not Invited": "#9ca3af", // Gray
};

const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = ["Yes", "Maybe", "No", "Not Invited"];

export function PersonFigurine({ personId, name, gender, status, onStatusChange }: PersonFigurineProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const color = STATUS_COLORS[status];
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
  
  const handleClick = () => {
    onStatusChange(personId, nextStatus);
  };
  
  // Male figurine SVG path
  const MaleIcon = () => (
    <svg viewBox="0 0 24 36" width="18" height="27" className="cursor-pointer transition-transform hover:scale-110">
      {/* Head */}
      <circle cx="12" cy="5" r="4.5" fill={color} />
      {/* Body */}
      <path
        d="M12 10 L12 22 M12 14 L6 18 M12 14 L18 18 M12 22 L7 34 M12 22 L17 34"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
  
  // Female figurine SVG path (with dress/skirt shape)
  const FemaleIcon = () => (
    <svg viewBox="0 0 24 36" width="18" height="27" className="cursor-pointer transition-transform hover:scale-110">
      {/* Head */}
      <circle cx="12" cy="5" r="4.5" fill={color} />
      {/* Body with dress */}
      <path
        d="M12 10 L12 16 M12 14 L6 18 M12 14 L18 18"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dress/skirt */}
      <path
        d="M6 16 L12 16 L18 16 L16 28 L8 28 Z"
        fill={color}
      />
      {/* Legs */}
      <path
        d="M9 28 L7 34 M15 28 L17 34"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      title={`${name} - ${status} (click to change to ${nextStatus})`}
    >
      {gender === "male" ? <MaleIcon /> : <FemaleIcon />}
      
      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
          {name}
          <div className="text-gray-400 text-[10px]">{status}</div>
        </div>
      )}
    </div>
  );
}
