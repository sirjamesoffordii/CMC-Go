import { Person } from "../../drizzle/schema";
import { User, Edit2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

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

export function PersonIcon({ person, onStatusChange, onClick, onEdit }: PersonIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  
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
    <div
      ref={setNodeRef}
      style={style}
      className="relative group/person flex flex-col items-center w-[50px] flex-shrink-0 cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...attributes}
      {...listeners}
    >
      {/* First Name Label with Edit Button */}
      <div className="relative flex items-center justify-center mb-1 group/name w-full min-w-0">
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
              className="w-10 h-10 text-slate-300 absolute top-0 left-3 pointer-events-none"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon */}
          <div className="relative">
            <User
              className={`w-10 h-10 ${STATUS_COLORS[person.status]} transition-colors cursor-pointer relative z-10 ${person.depositPaid ? 'stroke-slate-700 ring-2 ring-slate-700 ring-offset-1' : ''}`}
              strokeWidth={person.depositPaid ? 2.5 : 1.5}
              fill={person.depositPaid ? 'none' : 'currentColor'}
              style={{
                filter: 'var(--person-shadow, none)',
                transition: 'filter 200ms ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.setProperty('--person-shadow', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.setProperty('--person-shadow', 'none');
              }}
            />
            <User
              className={`w-10 h-10 text-gray-700 absolute top-0 left-0 opacity-0 group-hover/person:opacity-100 transition-opacity pointer-events-none z-30`}
              strokeWidth={0.25}
              fill="none"
              stroke="currentColor"
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
  );
}

