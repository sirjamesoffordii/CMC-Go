import { useDrag, useDrop } from "react-dnd";
import { motion } from "framer-motion";
import { User, Edit2 } from "lucide-react";
import { NeedIndicator } from "./NeedIndicator";
import { useEffect, useState, useRef, useCallback } from "react";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Person } from "../../../drizzle/schema";
import { PersonTooltip } from "./PersonTooltip";
import { trpc } from "../lib/trpc";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useIsMobile } from "@/hooks/useIsMobile";

// Map Figma status to database status (kept for reference)
const _statusMap = {
  director: "Yes" as const,
  staff: "Maybe" as const,
  "co-director": "No" as const,
  "not-invited": "Not Invited" as const,
};

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

interface DroppablePersonProps {
  person: Person;
  campusId: string | number;
  index: number;
  onEdit: (campusId: string | number, person: Person) => void;
  onClick: (campusId: string | number, person: Person) => void;
  onMove: (
    draggedId: string,
    draggedCampusId: string | number,
    targetCampusId: string | number,
    targetIndex: number
  ) => void;
  hasNeeds?: boolean;
  onPersonStatusChange?: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
  canInteract?: boolean;
  maskIdentity?: boolean;
  /** When true, name is visible but details (status color, role, needs, tooltip) are hidden.
   *  This is used for people within the user's Scope but outside their Detail View. */
  maskDetails?: boolean;
  slowAnimation?: boolean;
}

// Interface kept for future use
interface _Need {
  id: number;
  personId: string;
  type: string;
  description: string;
  amount?: number | null;
  isActive: boolean;
}

export function DroppablePerson({
  person,
  campusId,
  index,
  onEdit,
  onClick: _onClick,
  onMove,
  hasNeeds = false,
  onPersonStatusChange,
  canInteract = true,
  maskIdentity = false,
  maskDetails = false,
  slowAnimation = false,
}: DroppablePersonProps) {
  const { isAuthenticated } = usePublicAuth();
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [mobileTooltipOpen, setMobileTooltipOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // Hide details when either maskIdentity (fully hidden) or maskDetails (in-scope but no detail view)
  const hideDetails = maskIdentity || maskDetails;

  // Fetch all needs (including inactive) to show met needs with checkmark
  const needsEnabled = isAuthenticated && !hideDetails;
  const { data: _allNeeds = [] } = trpc.needs.listActive.useQuery(undefined, {
    enabled: needsEnabled,
    retry: false,
  });
  // Also fetch needs by person to get inactive needs
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person.personId },
    { enabled: needsEnabled }
  );
  const personNeed = personNeeds.length > 0 ? personNeeds[0] : null;

  // Convert database status to Figma status for display
  const figmaStatus = person.status
    ? reverseStatusMap[person.status] || "not-invited"
    : "not-invited";

  // Handle status click to cycle through statuses (immediate change, no confirmation)
  const handleStatusClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canInteract || !onPersonStatusChange) return;
      e.stopPropagation();
      const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
        "Not Invited",
        "Yes",
        "Maybe",
        "No",
      ];
      const currentIndex = STATUS_CYCLE.indexOf(person.status || "Not Invited");
      const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
      const nextStatus = STATUS_CYCLE[nextIndex];
      onPersonStatusChange(person.personId, nextStatus);
    },
    [person.status, person.personId, canInteract, onPersonStatusChange]
  );

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: "person",
      item: { personId: person.personId, campusId, index },
      canDrag: canInteract,
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [person.personId, campusId, index, canInteract]
  );

  // Hide the default drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver: _isOver }, drop] = useDrop(
    () => ({
      accept: "person",
      canDrop: () => canInteract,
      drop: (item: {
        personId: string;
        campusId: string | number;
        index: number;
      }) => {
        if (canInteract && item.personId !== person.personId) {
          onMove(item.personId, item.campusId, campusId, index);
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
      }),
    }),
    [person.personId, campusId, index, onMove, canInteract]
  );

  // Set iconRef for tooltip positioning
  const setIconRef = useCallback((node: HTMLDivElement | null) => {
    iconRef.current = node;
  }, []);

  // Apply drag/drop to the draggable content area (not motion.div to avoid ref conflicts)
  const setDragDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        drop(drag(node));
      }
    },
    [drop, drag]
  );

  // Stable edit button click handler (kept for future use)
  const _handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      // Only allow edit if canInteract
      if (!canInteract) return;
      e.stopPropagation();
      e.preventDefault();
      onEdit(campusId, person);
    },
    [campusId, person, onEdit, canInteract]
  );

  const firstName = person.name?.split(" ")[0] || person.personId || "Person";
  const capitalizedFirstName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const handleNameMouseEnter = (_e: React.MouseEvent) => {
    // Only show tooltip if user can see details
    if (hideDetails || isMobile) return;
    setIsHovered(true);
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right, y: rect.top });
    }
  };

  const handleNameMouseLeave = () => {
    // Only handle if user can see details
    if (hideDetails || isMobile) return;
    setIsHovered(false);
    setTooltipPos(null);
  };

  const handleNameMouseMove = (_e: React.MouseEvent) => {
    // Only handle if user can see details
    if (hideDetails || isMobile) return;
    if (iconRef.current && isHovered) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.right, y: rect.top });
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleNamePointerDown = (e: React.PointerEvent) => {
    if (!isMobile || hideDetails || !canInteract) return;
    // Only respond to primary touch/pen.
    if (e.pointerType === "mouse") return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsHovered(true);
      setTooltipPos({ x: 0, y: 0 });
      setMobileTooltipOpen(true);
    }, 450);
  };

  const handleNamePointerUpOrCancel = () => {
    if (!isMobile) return;
    clearLongPressTimer();
    // Don't dismiss tooltip on lift when it was a long-press (user taps backdrop to dismiss)
    if (longPressTriggeredRef.current) return;
    setIsHovered(false);
    setTooltipPos(null);
    window.setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 0);
  };

  const dismissMobileTooltip = () => {
    setMobileTooltipOpen(false);
    setIsHovered(false);
    setTooltipPos(null);
    longPressTriggeredRef.current = false;
  };

  return (
    <>
      <motion.div
        ref={setIconRef}
        key={person.personId}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        // Keep the icon same size while dragging; only add subtle lighting effect
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{
          layout: slowAnimation
            ? { type: "spring", stiffness: 80, damping: 20, mass: 1.2 }
            : { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.15 },
          scale: { duration: 0.2 },
        }}
        className={`relative group/person flex flex-col items-center w-[60px] flex-shrink-0 -mt-2 ${isDragging ? "drop-shadow-lg" : ""}`}
      >
        {/* First Name Label with Edit Button */}
        <div
          ref={nameRef}
          className="relative flex items-center justify-center mb-1 group/name w-full min-w-0"
          onClick={e => {
            if (!canInteract) return;
            if (isMobile && longPressTriggeredRef.current) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onEdit(campusId, person);
          }}
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={handleNameMouseLeave}
          onMouseMove={handleNameMouseMove}
          onPointerDown={handleNamePointerDown}
          onPointerUp={handleNamePointerUpOrCancel}
          onPointerCancel={handleNamePointerUpOrCancel}
          onPointerLeave={handleNamePointerUpOrCancel}
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="text-sm text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden max-w-full">
              {maskIdentity ? "\u00A0" : capitalizedFirstName}
            </div>
            {canInteract && (
              <button
                ref={editButtonRef}
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(campusId, person);
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

        <div
          ref={canInteract ? setDragDropRef : undefined}
          className={`relative ${canInteract ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}`}
          style={
            canInteract
              ? { cursor: isDragging ? "grabbing" : "grab" }
              : { cursor: "not-allowed" }
          }
        >
          <button
            type="button"
            onClick={handleStatusClick}
            disabled={!canInteract}
            className={`relative transition-all ${
              canInteract
                ? "hover:scale-110 active:scale-95 cursor-pointer"
                : "cursor-not-allowed"
            }`}
          >
            {/* Gray spouse icon behind - shown when person has spouse */}
            {!hideDetails && person.spouse && (
              <User
                className="w-10 h-10 text-slate-300 absolute top-0 left-2 pointer-events-none z-0"
                strokeWidth={1.5}
                fill="currentColor"
              />
            )}
            {/* Main person icon - solid */}
            <div
              className={`relative ${hideDetails ? "text-gray-300" : statusColors[figmaStatus]} ${!hideDetails && person.depositPaid ? "deposit-glow" : ""}`}
            >
              <User
                className={`w-10 h-10 transition-colors relative z-10`}
                strokeWidth={1.5}
                fill="currentColor"
              />
            </div>
            {/* Need indicator - show when person has an active need (by type: car for Transportation, etc.) */}
            {!hideDetails && personNeed?.isActive && (
              <NeedIndicator type={personNeed.type} />
            )}
          </button>
        </div>

        {/* Role Label - hidden until hover, positioned relative to motion.div */}
        {!hideDetails && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/person:opacity-100 transition-opacity">
            {person.primaryRole || "Staff"}
          </div>
        )}
      </motion.div>
      {/* Person Tooltip */}
      {!hideDetails && isHovered && tooltipPos && (
        <>
          {isMobile && mobileTooltipOpen && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Close tooltip"
              className="fixed inset-0 z-[99998] bg-black/20"
              onClick={dismissMobileTooltip}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === "Escape")
                  dismissMobileTooltip();
              }}
            />
          )}
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
            centered={isMobile}
          />
        </>
      )}
    </>
  );
}
