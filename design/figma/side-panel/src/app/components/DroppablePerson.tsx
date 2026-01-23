import { useDrag, useDrop } from "react-dnd";
import { motion } from "motion/react";
import { User, Edit2, Check } from "lucide-react";
import { useEffect } from "react";
import { getEmptyImage } from "react-dnd-html5-backend";

interface Person {
  id: string;
  name: string;
  role: string;
  status: "director" | "staff" | "co-director" | "not-invited";
  spouse?: string;
  kids?: string;
  need?: string;
  notes?: string;
}

const statusColors = {
  director: "text-green-500",
  staff: "text-yellow-500",
  "co-director": "text-red-500",
  "not-invited": "text-gray-400",
};

interface DroppablePersonProps {
  person: Person;
  campusId: string;
  index: number;
  onEdit: (campusId: string, person: Person) => void;
  onClick: (campusId: string, person: Person) => void;
  onMove: (
    draggedId: string,
    draggedCampusId: string,
    targetCampusId: string,
    targetIndex: number
  ) => void;
}

export function DroppablePerson({
  person,
  campusId,
  index,
  onEdit,
  onClick,
  onMove,
}: DroppablePersonProps) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: "person",
      item: { personId: person.id, campusId, index },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [person.id, campusId, index]
  );

  // Hide the default drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "person",
      drop: (item: { personId: string; campusId: string; index: number }) => {
        if (item.personId !== person.id) {
          onMove(item.personId, item.campusId, campusId, index);
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
      }),
    }),
    [person.id, campusId, index, onMove]
  );

  const firstName = person.name.split(" ")[0];
  const truncatedName =
    firstName.length > 7 ? firstName.slice(0, 7) + "." : firstName;

  return (
    <motion.div
      ref={node => drag(drop(node))}
      key={person.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.2 },
      }}
      className="relative group/person flex flex-col items-center w-[50px] cursor-grab active:cursor-grabbing"
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* First Name Label with Edit Button */}
      <div className="relative flex items-center justify-center mb-1 group/name">
        <div className="text-xs text-gray-600 font-medium text-center">
          {truncatedName}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit(campusId, person);
          }}
          className="absolute -top-1 -right-2 opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
          title="Edit person"
        >
          <Edit2 className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => onClick(campusId, person)}
          className="relative transition-all hover:scale-110 active:scale-95"
        >
          {/* Gray spouse icon behind */}
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
    </motion.div>
  );
}
