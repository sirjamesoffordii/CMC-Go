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
  getCampus?: (campusId: number) => { name: string; people: Person[] } | undefined;
}

export function CustomDragLayer({ getPerson, getCampus }: CustomDragLayerProps) {
  const { isDragging, item, currentOffset, itemType } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
    itemType: monitor.getItemType()
  }));

  if (!isDragging || !currentOffset || !item) {
    return null;
  }

  // Handle campus drag
  if (itemType === 'campus' && getCampus && item.campusId) {
    const campus = getCampus(item.campusId);
    if (!campus) return null;

    return (
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 100,
          left: 0,
          top: 0,
          transform: `translate(${currentOffset.x - 20}px, ${currentOffset.y - 10}px)`,
        }}
      >
        <div className="bg-white rounded-lg shadow-xl border-2 border-blue-500 p-3 opacity-95 min-w-[300px]">
          <div className="font-semibold text-slate-900 mb-2">{campus.name}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {campus.people.slice(0, 8).map((person) => {
              const figmaStatus = reverseStatusMap[person.status] || 'not-invited';
              return (
                <div key={person.personId} className="flex flex-col items-center w-[50px]">
                  <div className="text-xs text-slate-600 text-center mb-1 truncate w-full">
                    {person.name?.split(' ')[0] || person.personId || 'Person'}
                  </div>
                  <User
                    className={`w-8 h-8 ${statusColors[figmaStatus]}`}
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                </div>
              );
            })}
            {campus.people.length > 8 && (
              <div className="flex items-center justify-center w-[50px] h-[50px] text-xs text-slate-500">
                +{campus.people.length - 8}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle person drag (existing logic)
  const person = getPerson(item.personId, item.campusId);
  if (!person) return null;

  const firstName = person.name?.split(' ')[0] || person.personId || 'Person';
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
          {person.notes && person.notes.toLowerCase().includes('spouse') && person.name && (
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

