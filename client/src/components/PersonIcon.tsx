import { Person } from "../../drizzle/schema";
import { User, Edit2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef } from "react";
import { PersonTooltip } from "./PersonTooltip";
import { trpc } from "@/lib/trpc";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";

interface PersonIconProps {
  person: Person;
  onStatusChange: (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
  onClick: (person: Person) => void;
  onEdit?: (person: Person) => void;
}

const STATUS_COLORS = {
  "Yes": "text-emerald-700",
  "Maybe": "text-yellow-600",
  "No": "text-red-700",
  "Not Invited": "text-slate-500",
};

interface Need {
  id: number;
  personId: string;
  type: string;
  description: string;
  amount?: number | null;
  isActive: boolean;
}

export function PersonIcon({ person, onStatusChange, onClick, onEdit }: PersonIconProps) {
  const { isAuthenticated } = usePublicAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  
  // Fetch needs by person to get all needs (including inactive) to show met needs with checkmark
  // Only fetch in authenticated mode
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person.personId },
    { enabled: isAuthenticated }
  );
  const personNeed = personNeeds.length > 0 ? personNeeds[0] : null;
  
  // Public mode: render neutral placeholder dot
  if (!isAuthenticated) {
    return (
      <div className="relative flex flex-col items-center w-[50px] flex-shrink-0 pointer-events-none">
        <div className="w-3 h-3 rounded-full bg-slate-400 opacity-50" />
      </div>
    );
  }
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.personId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const firstName = person.name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName = capitalizedFirstName.length > 10 ? capitalizedFirstName.slice(0, 10) + '.' : capitalizedFirstName;

  const handleNameMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    if (nameRef.current) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };

  const handleNameMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };

  const handleNameMouseMove = (e: React.MouseEvent) => {
    if (nameRef.current && isHovered) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
      "Not Invited",
      "Yes",
      "Maybe",
      "No",
    ];
    const currentIndex = STATUS_CYCLE.indexOf(person.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.personId, nextStatus);
  };

  return (
    <>
      <div
        ref={(node) => {
          iconRef.current = node;
          setNodeRef(node);
        }}
        style={style}
        className="relative group/person flex flex-col items-center w-[50px] flex-shrink-0 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
      {/* First Name Label with Edit Button */}
      <div 
        ref={nameRef}
        className="relative flex items-center justify-center mb-1 group/name w-full min-w-0 cursor-pointer"
        onMouseEnter={handleNameMouseEnter}
        onMouseLeave={handleNameMouseLeave}
        onMouseMove={handleNameMouseMove}
      >
        <div className="text-xs text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
          {truncatedName}
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(person);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -top-1.5 -right-2 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-10"
            title="Edit person"
          >
            <Edit2 className="w-2.5 h-2.5 text-slate-500" />
          </button>
        )}
      </div>

      <div className="relative">
        <button
          onClick={handleStatusClick}
          className="relative transition-all hover:scale-110 active:scale-95"
        >
          {/* Gray spouse icon behind - shown when person has spouse */}
          {person.spouse && (
            <User
              className="w-10 h-10 text-slate-300 absolute top-0 left-2 pointer-events-none z-0"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon - solid */}
          <div 
            className={`relative ${STATUS_COLORS[person.status]} ${person.depositPaid ? 'deposit-glow' : ''}`}
          >
            <User
              className={`w-10 h-10 transition-colors cursor-pointer relative z-10`}
              strokeWidth={1.5}
              fill="currentColor"
            />
          </div>
        </button>

        {/* Role Label - Absolutely positioned, shown on hover */}
        {person.primaryRole && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/person:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {person.primaryRole}
          </div>
        )}
      </div>
      </div>
      {/* Person Tooltip */}
      {isHovered && tooltipPos && (personNeed || person.notes || person.depositPaid) && (
        <PersonTooltip
          person={person}
          need={personNeed ? {
            type: personNeed.type,
            description: personNeed.description,
            amount: personNeed.amount,
            isActive: personNeed.isActive,
          } : null}
          position={tooltipPos}
        />
      )}
    </>
  );
}

