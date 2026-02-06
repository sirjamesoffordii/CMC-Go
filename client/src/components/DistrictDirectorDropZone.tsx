import { useDrop, useDrag } from "react-dnd";
import { User, Plus, Edit2 } from "lucide-react";
import { Person } from "../../../drizzle/schema";
import { useState, useRef, useCallback } from "react";
import { PersonTooltip } from "./PersonTooltip";
import { trpc } from "../lib/trpc";
import { Input } from "./ui/input";

const reverseStatusMap = {
  Yes: "director" as const,
  Maybe: "staff" as const,
  No: "co-director" as const,
  "Not Invited": "not-invited" as const,
};

const statusColors = {
  director: "text-emerald-700",
  staff: "text-yellow-600",
  "co-director": "text-red-700",
  "not-invited": "text-slate-500",
};

interface DistrictDirectorDropZoneProps {
  person: Person | null;
  onDrop: (personId: string, fromCampusId: string | number) => void;
  onEdit: (campusId: string | number, person: Person) => void;
  onClick: () => void;
  onAddClick: () => void;
  quickAddMode?: boolean;
  quickAddName?: string;
  onQuickAddNameChange?: (name: string) => void;
  onQuickAddSubmit?: () => void;
  onQuickAddCancel?: () => void;
  onQuickAddClick?: (e: React.MouseEvent) => void;
  quickAddInputRef?: React.RefObject<HTMLInputElement | null>;
  districtId?: string | null; // For XAN, use "National Director" instead of "District Director"
  canInteract?: boolean;
  maskIdentity?: boolean;
}

export function DistrictDirectorDropZone({
  person,
  onDrop,
  onEdit,
  onClick,
  onAddClick,
  quickAddMode = false,
  quickAddName = "",
  onQuickAddNameChange,
  onQuickAddSubmit,
  onQuickAddCancel,
  onQuickAddClick: _onQuickAddClick,
  quickAddInputRef,
  districtId = null,
  canInteract = true,
  maskIdentity = false,
}: DistrictDirectorDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  // Fetch needs by person to get all needs (including inactive) to show met needs with checkmark
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId || "" },
    { enabled: !!person && canInteract && !maskIdentity }
  );
  const personNeed = person && personNeeds.length > 0 ? personNeeds[0] : null;

  const [{ isOver: _isOver, canDrop: _canDrop }, drop] = useDrop(
    () => ({
      accept: "person",
      drop: (item: { personId: string; campusId: string | number }) => {
        if (canInteract) {
          onDrop(item.personId, item.campusId);
        }
      },
      canDrop: (item: { personId: string; campusId: string | number }) => {
        // Can't drop on itself if it's already the district director
        return canInteract && item.campusId !== "district";
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onDrop, canInteract]
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "person",
      item: person ? { personId: person.personId, campusId: "district" } : null,
      canDrag: () => !!person && canInteract,
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [person, canInteract]
  );

  // Callback refs for react-dnd
  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        drop(node);
      }
    },
    [drop]
  );

  const handleNameMouseEnter = (_e: React.MouseEvent) => {
    if (person && canInteract) {
      setIsHovered(true);
      if (nameRef.current) {
        const rect = nameRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
      }
    }
  };

  const handleNameMouseLeave = () => {
    if (canInteract) {
      setIsHovered(false);
      setTooltipPos(null);
    }
  };

  const handleNameMouseMove = (_e: React.MouseEvent) => {
    if (nameRef.current && isHovered && person && canInteract) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };

  if (!person) {
    // In public/masked mode, hide the slot entirely when no district director exists
    if (!canInteract || maskIdentity) {
      return null;
    }

    // Show add button when no district director (only in interactive mode)
    return (
      <div
        ref={setDropRef}
        className="flex flex-col items-center group/person w-[60px] transition-transform -ml-3 -mt-2"
      >
        <div className="relative flex flex-col items-center w-[60px] group/add">
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onAddClick();
            }}
            className="flex flex-col items-center w-[60px]"
          >
            {/* Plus sign in name position - clickable for quick add */}
            <div className="relative flex items-center justify-center mb-1 overflow-visible">
              {quickAddMode ? (
                <div className="relative">
                  <Input
                    ref={quickAddInputRef}
                    list="quick-add-name-suggestions"
                    value={quickAddName}
                    onChange={e => onQuickAddNameChange?.(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        onQuickAddSubmit?.();
                      } else if (e.key === "Escape") {
                        onQuickAddCancel?.();
                      }
                    }}
                    onBlur={() => {
                      onQuickAddSubmit?.();
                    }}
                    placeholder="Name"
                    className="w-16 h-5 text-xs px-1.5 py-0.5 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    autoFocus
                    spellCheck={true}
                    autoComplete="off"
                  />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 whitespace-nowrap pointer-events-none">
                    Quick Add
                  </div>
                </div>
              ) : (
                <span className="relative inline-flex items-center justify-center p-0.5 rounded opacity-0 group-hover/add:opacity-100 transition-all cursor-pointer hover:bg-slate-100 hover:scale-110">
                  <Plus
                    className="w-3 h-3 text-black"
                    strokeWidth={1.5}
                    onClick={e => {
                      e.stopPropagation();
                      // This will be handled by parent
                    }}
                  />
                  <span className="absolute left-full top-1/2 -translate-y-1/2 text-[8px] text-slate-400 whitespace-nowrap pointer-events-none opacity-0 group-hover/add:opacity-100 transition-opacity z-10">
                    Quick Add
                  </span>
                </span>
              )}
            </div>
            {/* Icon - outline User only; plus is above head in name position */}
            <div className="relative inline-block transition-transform hover:scale-105 active:scale-95">
              <User
                className="w-10 h-10 text-gray-300 transition-all"
                strokeWidth={1}
                fill="none"
                stroke="currentColor"
              />
              <User
                className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none"
                strokeWidth={1}
                fill="none"
                stroke="currentColor"
              />
              <User
                className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none"
                strokeWidth={0}
                fill="currentColor"
                style={{
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                }}
              />
            </div>
          </button>
          {/* Label - Absolutely positioned, shown on hover */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/add:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Add
          </div>
        </div>
      </div>
    );
  }

  const figmaStatus = reverseStatusMap[person.status] || "not-invited";
  const firstName = person.name?.split(" ")[0] || person.personId || "Person";
  const capitalizedFirstName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName =
    capitalizedFirstName.length > 10
      ? capitalizedFirstName.slice(0, 10) + "."
      : capitalizedFirstName;

  return (
    <>
      <div
        ref={setDropRef}
        className="flex flex-col items-center group/person w-[60px] transition-transform -ml-3 -mt-2"
      >
        {/* Name Label with Edit Button */}
        <div
          ref={nameRef}
          className={`relative flex items-center justify-center mb-1 group/name w-full min-w-0 ${canInteract ? "cursor-pointer" : "cursor-not-allowed"}`}
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={handleNameMouseLeave}
          onMouseMove={handleNameMouseMove}
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="text-sm text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden max-w-full">
              {maskIdentity ? "\u00A0" : truncatedName}
            </div>
            {canInteract && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit("district", person);
                }}
                onMouseDown={e => e.stopPropagation()}
                className="absolute left-full top-0 -translate-y-0.5 ml-1.5 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-10"
                title="Edit person"
              >
                <Edit2 className="w-2.5 h-2.5 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        <div
          ref={node => {
            iconRef.current = node;
            if (canInteract) {
              drag(node);
            }
          }}
          className={`relative ${canInteract ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}`}
          style={{ opacity: isDragging ? 0.5 : 1 }}
        >
          <button
            onClick={() => {
              if (maskIdentity || !canInteract) return;
              onClick();
            }}
            className={`relative transition-all ${canInteract ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-not-allowed"}`}
          >
            {/* Gray spouse icon behind - shown when person has a spouse */}
            {!maskIdentity && person.spouse && (
              <User
                className="w-10 h-10 text-slate-300 absolute top-0 left-2 pointer-events-none z-0"
                strokeWidth={1.5}
                fill="currentColor"
              />
            )}
            {/* Main person icon - solid */}
            <div
              className={`relative ${maskIdentity ? "text-gray-300" : statusColors[figmaStatus]} ${!maskIdentity && person.depositPaid ? "deposit-glow" : ""}`}
            >
              <User
                className={`w-10 h-10 transition-colors cursor-pointer relative z-10`}
                strokeWidth={1.5}
                fill="currentColor"
              />
            </div>
          </button>

          {/* Role Label - Absolutely positioned, shown on hover */}
          {!maskIdentity && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/person:opacity-100 transition-opacity">
              {(() => {
                // For XAN, first person in header is always National Director
                if (districtId === "XAN") {
                  return person.primaryRole === "District Director" ||
                    !person.primaryRole
                    ? "National Director"
                    : person.primaryRole;
                }
                // For other districts, show primaryRole or fallback to "District Director"
                return person.primaryRole || "District Director";
              })()}
            </div>
          )}
        </div>
      </div>
      {/* Person Tooltip */}
      {!maskIdentity &&
        isHovered &&
        tooltipPos &&
        person &&
        (personNeed || person.notes || person.depositPaid) && (
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
