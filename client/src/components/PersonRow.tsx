import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign } from "lucide-react";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
      className="flex items-center gap-1.5 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
      onClick={() => onClick(person)}
      {...attributes}
      {...listeners}
    >
      {/* Status Bar - Compact */}
      <div
        className={`w-1 h-7 rounded-l cursor-pointer ${STATUS_COLORS[person.status]} hover:opacity-80 transition-opacity`}
        onClick={handleStatusClick}
        title={`Click to cycle status (current: ${person.status})`}
      />

      {/* Person Info - Compact */}
      <div className="flex-1 py-1 pr-1.5 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-medium text-gray-900 truncate">
            <EditableText
              value={person.name}
              onSave={(newName) => {
                updatePersonName.mutate({ personId: person.personId, name: newName });
              }}
              className="text-xs font-medium text-gray-900"
              inputClassName="text-xs font-medium text-gray-900 w-full"
            />
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {hasNotes && (
              <StickyNote className="h-3 w-3 text-blue-500" />
            )}
            {hasNeeds && (
              <DollarSign className="h-3 w-3 text-orange-500" />
            )}
          </div>
        </div>
        {person.primaryRole && (
          <span className="text-[10px] text-gray-500 leading-tight">{person.primaryRole}</span>
        )}
      </div>
    </div>
  );
}
