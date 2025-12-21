import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign, Pencil } from "lucide-react";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface PersonRowProps {
  person: Person;
  onStatusChange: (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
  onClick: (person: Person) => void;
  hasNotes?: boolean;
  hasNeeds?: boolean;
  onPersonUpdate: () => void;
}

// Universal response language for editing
const STATUS_COLORS = {
  "Yes": "bg-emerald-700",
  "Maybe": "bg-yellow-600",
  "No": "bg-red-700",
  "Not Invited": "bg-slate-500",
};

const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
  "Not Invited",
  "Maybe",
  "Yes",
  "No",
];

export function PersonRow({ person, onStatusChange, onClick, hasNotes, hasNeeds, onPersonUpdate }: PersonRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
  const updatePersonName = trpc.people.updateName.useMutation({
    onSuccess: () => onPersonUpdate(),
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
    const currentIndex = STATUS_CYCLE.indexOf(person.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.personId, nextStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Bar - Compact - NOT draggable, only clickable */}
      <div
        className={`w-1.5 h-8 rounded-l cursor-pointer ${STATUS_COLORS[person.status]} hover:brightness-110 transition-all flex-shrink-0`}
        onClick={handleStatusClick}
        title={`Click to cycle status (current: ${person.status})`}
      />

      {/* Person Info - Compact - Draggable area */}
      <div 
        className="flex-1 py-1.5 pr-2 min-w-0"
        onClick={() => onClick(person)}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
            <EditableText
              value={person.name}
              onSave={(newName) => {
                updatePersonName.mutate({ personId: person.personId, name: newName });
              }}
              className="text-xs font-medium text-slate-800"
              inputClassName="text-xs font-medium text-slate-800 w-full"
            />
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {hasNotes && (
              <StickyNote className="h-3 w-3 text-slate-600" />
            )}
            {hasNeeds && (
              <DollarSign className="h-3 w-3 text-yellow-600" />
            )}
            {isHovered && (
              <button
                onClick={(e) => {
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
          <span className="text-[10px] text-slate-500 leading-tight truncate">{person.primaryRole}</span>
        )}
      </div>
    </div>
  );
}
