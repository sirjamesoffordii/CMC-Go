import { useDrag, useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { User, Edit2, Hand } from 'lucide-react';
import { useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Person } from '../../../drizzle/schema';

// Map Figma status to database status
const statusMap = {
  'director': 'Yes' as const,
  'staff': 'Maybe' as const,
  'co-director': 'No' as const,
  'not-invited': 'Not Invited' as const,
};

const reverseStatusMap = {
  'Yes': 'director' as const,
  'Maybe': 'staff' as const,
  'No': 'co-director' as const,
  'Not Invited': 'not-invited' as const,
};

const statusColors = {
  director: 'text-emerald-700',
  staff: 'text-yellow-600',
  'co-director': 'text-red-700',
  'not-invited': 'text-slate-500'
};

interface DroppablePersonProps {
  person: Person;
  campusId: string | number;
  index: number;
  onEdit: (campusId: string | number, person: Person) => void;
  onClick: (campusId: string | number, person: Person) => void;
  onMove: (draggedId: string, draggedCampusId: string | number, targetCampusId: string | number, targetIndex: number) => void;
  hasNeeds?: boolean;
}

export function DroppablePerson({ person, campusId, index, onEdit, onClick, onMove, hasNeeds = false }: DroppablePersonProps) {
  // Convert database status to Figma status for display
  const figmaStatus = reverseStatusMap[person.status] || 'not-invited';
  
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'person',
    item: { personId: person.personId, campusId, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [person.personId, campusId, index]);

  // Hide the default drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number; index: number }) => {
      if (item.personId !== person.personId) {
        onMove(item.personId, item.campusId, campusId, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }), [person.personId, campusId, index, onMove]);

  const firstName = person.name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName = capitalizedFirstName.length > 10 ? capitalizedFirstName.slice(0, 10) + '.' : capitalizedFirstName;

  return (
    <motion.div
      ref={(node) => drag(drop(node))}
      key={person.personId}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.2 }
      }}
      className="relative group/person flex flex-col items-center w-[50px] flex-shrink-0 cursor-grab active:cursor-grabbing"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* First Name Label with Edit Button */}
      <div className="relative flex items-center justify-center mb-1 group/name w-full min-w-0">
        <div className="text-xs text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
          {truncatedName}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(campusId, person);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-1.5 -right-2 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-10"
          title="Edit person"
        >
          <Edit2 className="w-2.5 h-2.5 text-slate-500" />
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => onClick(campusId, person)}
          className="relative transition-all hover:scale-110 active:scale-95"
        >
          {/* Gray spouse icon behind - shown when person has spouse */}
          {person.spouse && (
            <User
              className="w-10 h-10 text-slate-300 absolute top-0 left-2 pointer-events-none z-0"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon */}
          <div className="relative">
            <User
              className={`w-10 h-10 ${statusColors[figmaStatus]} transition-colors cursor-pointer relative z-10 ${person.depositPaid ? 'stroke-slate-700 ring-2 ring-slate-700 ring-offset-1' : ''}`}
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
              strokeWidth={1}
              fill="none"
              stroke="currentColor"
            />
          </div>
          {/* Raising hand indicator when person has needs */}
          {hasNeeds && (
            <Hand
              className="w-5 h-5 text-yellow-600 absolute -top-1 -right-1 z-20 pointer-events-none"
              strokeWidth={2.5}
              fill="currentColor"
              style={{ transform: 'rotate(-20deg)' }}
            />
          )}
        </button>

        {/* Role Label - Absolutely positioned, shown on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/person:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {person.primaryRole || 'Staff'}
        </div>
      </div>
    </motion.div>
  );
}


