import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign, Pencil } from "lucide-react";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface PersonRowProps {
  person: Person;
  onStatusChange: (personId: string, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onClick: (person: Person) => void;
  hasNotes?: boolean;
  hasNeeds?: boolean;
  onPersonUpdate: () => void;
}

const STATUS_COLORS = {
  "Going": "bg-green-500",
  "Maybe": "bg-yellow-500",
  "Not Going": "bg-red-500",
  "Not invited yet": "bg-gray-400",
};

const STATUS_CYCLE: Array<"Not invited yet" | "Maybe" | "Going" | "Not Going"> = [
  "Not invited yet",
  "Maybe",
  "Going",
  "Not Going",
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
      className="flex items-center gap-1.5 bg-gray-50 hover:bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer group relative"
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
          <span className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900 transition-colors">
            <EditableText
              value={person.name}
              onSave={(newName) => {
                updatePersonName.mutate({ personId: person.personId, name: newName });
              }}
              className="text-xs font-medium text-gray-800"
              inputClassName="text-xs font-medium text-gray-800 w-full"
            />
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {hasNotes && (
              <StickyNote className="h-3 w-3 text-blue-500" />
            )}
            {hasNeeds && (
              <DollarSign className="h-3 w-3 text-orange-500" />
            )}
            {isHovered && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
                className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500 transition-colors"
                title="Edit name"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {person.primaryRole && (
          <span className="text-[10px] text-gray-500 leading-tight truncate">{person.primaryRole}</span>
        )}
      </div>
    </div>
  );
}
