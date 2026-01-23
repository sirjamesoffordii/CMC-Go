import { useDrop, useDrag } from "react-dnd";
import { User, Plus, Edit2 } from "lucide-react";

interface Person {
  id: string;
  name: string;
  role: string;
  status: "director" | "staff" | "co-director" | "not-invited";
  need?: string;
  notes?: string;
  spouse?: string;
  kids?: string;
}

interface DistrictDirectorDropZoneProps {
  person: Person | null;
  onDrop: (personId: string, fromCampusId: string) => void;
  onEdit: (campusId: string, person: Person) => void;
  onClick: () => void;
  onAddClick: () => void;
}

const statusColors = {
  director: "text-green-500",
  staff: "text-yellow-500",
  "co-director": "text-red-500",
  "not-invited": "text-gray-400",
};

export function DistrictDirectorDropZone({
  person,
  onDrop,
  onEdit,
  onClick,
  onAddClick,
}: DistrictDirectorDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "person",
    drop: (item: { id: string; campusId: string }) => {
      onDrop(item.id, item.campusId);
    },
    canDrop: (item: { id: string; campusId: string }) => {
      // Can't drop on itself if it's already the district director
      return item.campusId !== "district";
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "person",
      item: person ? { id: person.id, campusId: "district" } : null,
      canDrag: () => !!person,
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [person]
  );

  if (!person) {
    // Show add button when no district director
    return (
      <div
        ref={drop}
        className="flex flex-col items-center group/person w-[50px] transition-transform"
      >
        <div className="h-[18px]"></div>{" "}
        {/* Spacer to match name label height */}
        <button
          onClick={onAddClick}
          className="relative group/add"
          title="Add district director"
        >
          <User
            className="w-10 h-10 text-gray-200 group-hover/add:text-gray-400 transition-all group-hover/add:scale-110 active:scale-95"
            strokeWidth={1.5}
            fill="none"
            stroke="currentColor"
          />
          <Plus
            className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/add:opacity-100 transition-opacity"
            strokeWidth={2.5}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={drop}
      className="flex flex-col items-center group/person w-[50px] transition-transform"
    >
      {/* Name Label with Edit Button */}
      <div className="relative flex items-center justify-center mb-1 group/name">
        <div className="text-xs text-gray-600 font-medium text-center">
          {(() => {
            const firstName = person.name.split(" ")[0];
            return firstName.length > 7
              ? firstName.slice(0, 7) + "."
              : firstName;
          })()}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit("district", person);
          }}
          className="absolute -top-1 -right-2 opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
          title="Edit person"
        >
          <Edit2 className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div
        ref={drag}
        className="relative"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          onClick={onClick}
          className="relative transition-all hover:scale-110 active:scale-95 cursor-move"
        >
          {/* Gray spouse icon behind - shown when person has a wife */}
          {person.spouse && (
            <User
              className="w-10 h-10 text-gray-300 absolute top-0 left-3 pointer-events-none"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon */}
          <User
            className={`w-10 h-10 ${statusColors[person.status]} transition-colors cursor-pointer relative z-10`}
            strokeWidth={1.5}
            fill="currentColor"
          />
        </button>

        {/* Role Label - Absolutely positioned, shown on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/person:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {person.role}
        </div>
      </div>
    </div>
  );
}
