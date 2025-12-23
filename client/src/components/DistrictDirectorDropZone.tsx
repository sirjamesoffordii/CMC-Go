import { useDrop, useDrag } from 'react-dnd';
import { User, Plus, Edit2 } from 'lucide-react';
import { Person } from '../../../drizzle/schema';

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

interface DistrictDirectorDropZoneProps {
  person: Person | null;
  onDrop: (personId: string, fromCampusId: string | number) => void;
  onEdit: (campusId: string | number, person: Person) => void;
  onClick: () => void;
  onAddClick: () => void;
}

export function DistrictDirectorDropZone({ person, onDrop, onEdit, onClick, onAddClick }: DistrictDirectorDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }) => {
      onDrop(item.personId, item.campusId);
    },
    canDrop: (item: { personId: string; campusId: string | number }) => {
      // Can't drop on itself if it's already the district director
      return item.campusId !== 'district';
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }));

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'person',
    item: person ? { personId: person.personId, campusId: 'district' } : null,
    canDrag: () => !!person,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [person]);

  if (!person) {
    // Show add button when no district director
    return (
      <div
        ref={drop}
        className="flex flex-col items-center group/person w-[50px] transition-transform"
      >
        <div className="relative flex flex-col items-center w-[50px] group/add">
        <button 
          onClick={onAddClick}
          className="flex flex-col items-center w-[50px]"
        >
          {/* Plus sign in name position */}
          <div className="relative flex items-center justify-center mb-1">
            <Plus className="w-3 h-3 text-black opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110" strokeWidth={1.5} />
          </div>
          {/* Icon */}
          <div className="relative">
            <User 
              className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95" 
              strokeWidth={1} 
              fill="none"
              stroke="currentColor"
            />
            <User 
              className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none" 
              strokeWidth={1} 
              fill="none"
              stroke="currentColor"
            />
            <User 
              className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none" 
              strokeWidth={0} 
              fill="currentColor"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
              }}
            />
          </div>
        </button>
          {/* Label - Absolutely positioned, shown on hover */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/add:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Add
          </div>
        </div>
      </div>
    );
  }

  const figmaStatus = reverseStatusMap[person.status] || 'not-invited';
  const firstName = person.name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName = capitalizedFirstName.length > 10 ? capitalizedFirstName.slice(0, 10) + '.' : capitalizedFirstName;

  return (
    <div
      ref={drop}
      className="flex flex-col items-center group/person w-[50px] transition-transform"
    >
      {/* Name Label with Edit Button */}
          <div className="relative flex items-center justify-center mb-1 group/name w-full min-w-0">
        <div className="text-xs text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
          {truncatedName}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit('district', person);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-1.5 -right-2 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-10"
          title="Edit person"
        >
          <Edit2 className="w-2.5 h-2.5 text-slate-500" />
        </button>
      </div>
      
      <div
        ref={drag}
        className="relative"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          onClick={onClick}
          className="relative transition-all hover:scale-110 active:scale-95"
        >
          {/* Gray spouse icon behind - shown when person has a spouse */}
          {person.notes && person.notes.toLowerCase().includes('spouse') && (
            <User 
              className="w-10 h-10 text-slate-300 absolute top-0 left-3 pointer-events-none"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon */}
          <div className="relative">
            <User 
              className={`w-10 h-10 ${statusColors[figmaStatus]} transition-colors cursor-pointer relative z-10`}
              strokeWidth={1.5}
              fill="currentColor"
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
              className="w-10 h-10 text-gray-700 absolute top-0 left-0 opacity-0 group-hover/person:opacity-100 transition-opacity pointer-events-none z-30"
              strokeWidth={0.25}
              fill="none"
              stroke="currentColor"
            />
          </div>
        </button>
        
        {/* Role Label - Absolutely positioned, shown on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/person:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {person.primaryRole || 'District Director'}
        </div>
      </div>
    </div>
  );
}

