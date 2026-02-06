import { Person } from "../../../drizzle/schema";
import { User, Edit2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef } from "react";
import { PersonTooltip } from "./PersonTooltip";
import { NeedIndicator } from "./NeedIndicator";
import { trpc } from "@/lib/trpc";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";

interface PersonIconProps {
  person: Person;
  onStatusChange: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
  onClick: (person: Person) => void;
  onEdit?: (person: Person) => void;
  /** When false, status click is disabled and cursor shows not-allowed */
  canInteract?: boolean;
}

const STATUS_COLORS = {
  Yes: "text-emerald-700",
  Maybe: "text-yellow-600",
  No: "text-red-700",
  "Not Invited": "text-slate-500",
};

// Interface kept for type reference
interface _Need {
  id: number;
  personId: string;
  type: string;
  description: string;
  amount?: number | null;
  isActive: boolean;
}

export function PersonIcon({
  person,
  onStatusChange,
  onClick: _onClick,
  onEdit,
  canInteract = true,
}: PersonIconProps) {
  const { isAuthenticated: _isAuthenticated } = usePublicAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  // Fetch needs by person to get all needs (including inactive) to show met needs with checkmark
  // Only fetch in authenticated mode
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery({
    personId: person.personId,
  });
  const personNeed = personNeeds.length > 0 ? personNeeds[0] : null;

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
    opacity: 1,
    filter: isDragging ? "brightness(1.06)" : undefined,
    boxShadow: isDragging ? "0 10px 30px rgba(0,0,0,0.12)" : undefined,
  };

  const firstName = person.name?.split(" ")[0] || person.personId || "Person";
  const capitalizedFirstName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const handleNameMouseEnter = (_e: React.MouseEvent) => {
    setIsHovered(true);
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right, y: rect.top });
    }
  };

  const handleNameMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };

  const handleNameMouseMove = (_e: React.MouseEvent) => {
    if (iconRef.current && isHovered) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right, y: rect.top });
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canInteract || !onStatusChange) return;
    const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
      "Not Invited",
      "Yes",
      "Maybe",
      "No",
    ];
    const currentIndex = STATUS_CYCLE.indexOf(person.status || "Not Invited");
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.personId, nextStatus);
  };

  return (
    <>
      <div
        ref={node => {
          iconRef.current = node;
          setNodeRef(node);
        }}
        style={style}
        className={`relative group/person flex flex-col items-center w-[60px] flex-shrink-0 ${canInteract ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}`}
        {...attributes}
        {...listeners}
      >
        {/* First Name Label with Edit Button */}
        <div
          ref={nameRef}
          className="relative flex items-center justify-center mb-1 group/name w-full min-w-0"
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={handleNameMouseLeave}
          onMouseMove={handleNameMouseMove}
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="text-sm text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden max-w-full">
              {capitalizedFirstName}
            </div>
            {onEdit && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(person);
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onDragStart={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="absolute left-full top-0 -translate-y-0.5 ml-1.5 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-50 cursor-pointer"
                title="Edit person"
                type="button"
                draggable={false}
              >
                <Edit2 className="w-2.5 h-2.5 text-slate-500 pointer-events-none" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={handleStatusClick}
            className={`relative transition-all ${isDragging ? "ring-2 ring-slate-200/70 rounded-full" : canInteract ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-not-allowed"}`}
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
              className={`relative ${STATUS_COLORS[person.status]} ${person.depositPaid ? "deposit-glow" : ""}`}
            >
              <User
                className={`w-10 h-10 transition-colors cursor-pointer relative z-10`}
                strokeWidth={1.5}
                fill="currentColor"
              />
              {/* Need indicator (arm + icon) */}
              {personNeed?.isActive && <NeedIndicator type={personNeed.type} />}
            </div>
          </button>

          {/* Role Label - Hidden until hover */}
          {person.primaryRole && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/person:opacity-100 transition-opacity">
              {person.primaryRole}
            </div>
          )}
        </div>
      </div>
      {/* Person Tooltip */}
      {isHovered && tooltipPos && (
        <PersonTooltip
          person={person}
          need={
            personNeed
              ? {
                  type: personNeed.type,
                  description: personNeed.description,
                  amount: personNeed.amount,
                  isActive: personNeed.isActive,
                }
              : null
          }
          position={tooltipPos}
        />
      )}
    </>
  );
}
