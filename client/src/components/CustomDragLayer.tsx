import { useDragLayer } from 'react-dnd';
import { User } from 'lucide-react';
import { Person } from '../../../drizzle/schema';

const reverseStatusMap = {
  'Yes': 'director' as const,
  'Maybe': 'staff' as const,
  'No': 'co-director' as const,
  'Not Invited': 'not-invited' as const,
};

const statusColors = {
  director: 'text-green-500',
  staff: 'text-yellow-600',
  'co-director': 'text-red-500',
  'not-invited': 'text-gray-400'
};

interface CustomDragLayerProps {
  getPerson: (personId: string, campusId: string | number) => Person | undefined;
}

export function CustomDragLayer({ getPerson }: CustomDragLayerProps) {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset()
  }));

  if (!isDragging || !currentOffset || !item) {
    return null;
  }

  const person = getPerson(item.personId, item.campusId);
  if (!person) return null;

  const firstName = person.name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName = capitalizedFirstName.length > 10 ? capitalizedFirstName.slice(0, 10) + '.' : capitalizedFirstName;
  const figmaStatus = reverseStatusMap[person.status] || 'not-invited';

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 100,
        left: 0,
        top: 0,
        transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
      }}
    >
      <div className="flex flex-col items-center w-[50px] opacity-80">
        {/* Name */}
        <div className="text-xs text-gray-600 font-medium text-center mb-1">
          {truncatedName}
        </div>
        
        {/* Icon */}
        <div className="relative">
          {person.notes && person.notes.toLowerCase().includes('spouse') && (
            <User
              className="w-10 h-10 text-gray-300 absolute top-0 left-3"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          <User
            className={`w-10 h-10 ${statusColors[figmaStatus]} relative z-10`}
            strokeWidth={1.5}
            fill="currentColor"
          />
        </div>
      </div>
    </div>
  );
}

