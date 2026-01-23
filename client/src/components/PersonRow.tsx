import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign, Pencil, Check } from "lucide-react";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { StatusButtons } from "./StatusButtons";

interface PersonRowProps {
  person: Person;
  onStatusChange: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
  onClick: (person: Person) => void;
  hasNotes?: boolean;
  hasNeeds?: boolean;
  onPersonUpdate: () => void;
  showStatusButtons?: boolean;
}

// Universal response language for editing
const STATUS_COLORS = {
  Yes: "bg-emerald-700",
  Maybe: "bg-yellow-600",
  No: "bg-red-700",
  "Not Invited": "bg-slate-500",
};

const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
  "Not Invited",
  "Maybe",
  "Yes",
  "No",
];

export function PersonRow({
  person,
  onStatusChange,
  onClick,
  hasNotes,
  hasNeeds,
  onPersonUpdate,
  showStatusButtons = false,
}: PersonRowProps) {
  const { isAuthenticated } = usePublicAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMobileStatus, setShowMobileStatus] = useState(false);
  const utils = trpc.useUtils();

  const updatePersonName = trpc.people.updateName.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.people.getNational.invalidate();
      onPersonUpdate();
    },
  });

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

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = STATUS_CYCLE.indexOf(person.status || "Not Invited");
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.personId, nextStatus);
  };

  const handleStatusChangeWithPrevious = (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited",
    _previousStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => {
    // StatusButtons component handles toast notifications
    onStatusChange(personId, newStatus);
  };

  // Authentication disabled - always show full person row
  if (false) {
    return (
      <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 pointer-events-none">
        <div className="w-1.5 h-8 rounded-l bg-slate-400 opacity-30 flex-shrink-0" />
        <div className="flex-1 py-1.5 pr-2 min-w-0">
          <div className="w-16 h-3 bg-slate-300 opacity-30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-col gap-1.5 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-1.5">
          {/* Status Bar - Compact - NOT draggable, only clickable */}
          <div
            className={`w-1.5 h-8 rounded-l cursor-pointer ${STATUS_COLORS[person.status || "Not Invited"]} hover:brightness-110 transition-all flex-shrink-0 md:block ${showStatusButtons ? "hidden" : ""}`}
            onClick={handleStatusClick}
            title={`Click to cycle status (current: ${person.status || "Not Invited"})`}
          />

          {/* Mobile Status Button - shows on mobile when showStatusButtons is true */}
          {showStatusButtons && (
            <div
              className={`w-12 h-8 rounded-l cursor-pointer flex items-center justify-center text-white text-xs font-medium transition-all flex-shrink-0 md:hidden ${STATUS_COLORS[person.status || "Not Invited"]}`}
              onClick={e => {
                e.stopPropagation();
                setShowMobileStatus(!showMobileStatus);
              }}
              title={`Tap to change status (current: ${person.status || "Not Invited"})`}
            >
              {person.status === "Not Invited"
                ? "NI"
                : person.status === "Maybe"
                  ? "M"
                  : person.status === "Yes"
                    ? "Y"
                    : "N"}
            </div>
          )}

          {/* Person Info - Compact - Draggable area */}
          <div
            className="flex-1 py-1.5 pr-2 min-w-0"
            onClick={() => onClick(person)}
            {...attributes}
            {...listeners}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                {person.name ? (
                  <EditableText
                    value={person.name}
                    onSave={newName => {
                      updatePersonName.mutate({
                        personId: person.personId,
                        name: newName,
                      });
                    }}
                    className="text-xs font-medium text-slate-800"
                    inputClassName="text-xs font-medium text-slate-800 w-full"
                  />
                ) : (
                  <span className="text-xs font-medium text-slate-400">—</span>
                )}
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {hasNotes && <StickyNote className="h-3 w-3 text-slate-600" />}
                {hasNeeds && <DollarSign className="h-3 w-3 text-yellow-600" />}
                {isHovered && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                    className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Edit name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            {person.primaryRole && (
              <span className="text-[10px] text-slate-500 leading-tight truncate">
                {person.primaryRole}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Status Buttons - Expandable */}
        {showStatusButtons && showMobileStatus && (
          <div className="px-3 pb-3 md:hidden">
            <StatusButtons
              person={person}
              onStatusChange={handleStatusChangeWithPrevious}
            />
          </div>
        )}
      </div>
    </>
  );
}
