import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign } from "lucide-react";

interface PersonRowProps {
  person: Person;
  onStatusChange: (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onClick: (person: Person) => void;
  hasNotes?: boolean;
  hasNeeds?: boolean;
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

export function PersonRow({ person, onStatusChange, onClick, hasNotes, hasNeeds }: PersonRowProps) {
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = STATUS_CYCLE.indexOf(person.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.id, nextStatus);
  };

  return (
    <div
      className="flex items-center gap-1.5 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
      onClick={() => onClick(person)}
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
            {person.name}
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
        {person.role && (
          <span className="text-[10px] text-gray-500 leading-tight">{person.role}</span>
        )}
      </div>
    </div>
  );
}
