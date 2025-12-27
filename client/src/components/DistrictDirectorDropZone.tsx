import { useDrop, useDrag } from 'react-dnd';
import { User, Plus, Edit2 } from 'lucide-react';
import { Person } from '../../../drizzle/schema';
import { useState, useRef } from 'react';
import { PersonTooltip } from './PersonTooltip';
import { trpc } from '../lib/trpc';
import { Input } from './ui/input';

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
  quickAddMode?: boolean;
  quickAddName?: string;
  onQuickAddNameChange?: (name: string) => void;
  onQuickAddSubmit?: () => void;
  onQuickAddCancel?: () => void;
  onQuickAddClick?: (e: React.MouseEvent) => void;
  quickAddInputRef?: React.RefObject<HTMLInputElement>;
}

interface Need {
  id: number;
  personId: string;
  type: string;
  description: string;
  amount?: number | null;
  isActive: boolean;
}

export function DistrictDirectorDropZone({ 
  person, 
  onDrop, 
  onEdit, 
  onClick, 
  onAddClick,
  quickAddMode = false,
  quickAddName = '',
  onQuickAddNameChange,
  onQuickAddSubmit,
  onQuickAddCancel,
  onQuickAddClick,
  quickAddInputRef
}: DistrictDirectorDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  
  // Fetch needs by person to get all needs (including inactive) to show met needs with checkmark
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery({ personId: person?.personId || '' }, { enabled: !!person });
  const personNeed = person && personNeeds.length > 0 ? personNeeds[0] : null;
  
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

  const handleNameMouseEnter = (e: React.MouseEvent) => {
    if (person) {
      setIsHovered(true);
      if (nameRef.current) {
        const rect = nameRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
      }
    }
  };

  const handleNameMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };

  const handleNameMouseMove = (e: React.MouseEvent) => {
    if (nameRef.current && isHovered && person) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };

  if (!person) {
    // Show add button when no district director
    return (
      <div
        ref={drop}
        className="flex flex-col items-center group/person w-[50px] transition-transform"
      >
        <div className="relative flex flex-col items-center w-[50px] group/add">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddClick();
          }}
          className="flex flex-col items-center w-[50px]"
        >
          {/* Plus sign in name position - clickable for quick add */}
          <div className="relative flex items-center justify-center mb-1">
            {quickAddMode ? (
              <div className="relative">
                <Input
                  ref={quickAddInputRef}
                  value={quickAddName}
                  onChange={(e) => onQuickAddNameChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onQuickAddSubmit?.();
                    } else if (e.key === 'Escape') {
                      onQuickAddCancel?.();
                    }
                  }}
                  onBlur={() => {
                    onQuickAddSubmit?.();
                  }}
                  placeholder="Name"
                  className="w-16 h-5 text-xs px-1.5 py-0.5 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  autoFocus
                />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 whitespace-nowrap pointer-events-none">
                  Quick Add
                </div>
              </div>
            ) : (
              <Plus 
                className="w-3 h-3 text-black opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110 cursor-pointer" 
                strokeWidth={1.5}
                onClick={(e) => {
                  e.stopPropagation();
                  // This will be handled by parent
                }}
              />
            )}
          </div>
          {/* Icon - solid */}
          <div className="relative">
            <User 
              className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95" 
              strokeWidth={1.5} 
              fill="currentColor"
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
  const firstName = person.name?.split(' ')[0] || person.personId || 'Person';
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const truncatedName = capitalizedFirstName.length > 10 ? capitalizedFirstName.slice(0, 10) + '.' : capitalizedFirstName;

  return (
    <>
      <div
        ref={drop}
        className="flex flex-col items-center group/person w-[50px] transition-transform"
      >
      {/* Name Label with Edit Button */}
          <div 
            ref={nameRef}
            className="relative flex items-center justify-center mb-1 group/name w-full min-w-0 cursor-pointer"
            onMouseEnter={handleNameMouseEnter}
            onMouseLeave={handleNameMouseLeave}
            onMouseMove={handleNameMouseMove}
          >
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
        ref={(node) => {
          iconRef.current = node;
          drag(node);
        }}
        className="relative"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          onClick={onClick}
          className="relative transition-all hover:scale-110 active:scale-95"
        >
          {/* Gray spouse icon behind - shown when person has a spouse */}
          {person.spouse && (
            <User 
              className="w-10 h-10 text-slate-300 absolute top-0 left-2 pointer-events-none z-0"
              strokeWidth={1.5}
              fill="currentColor"
            />
          )}
          {/* Main person icon - solid */}
          <div 
            className={`relative ${statusColors[figmaStatus]} ${person.depositPaid ? 'deposit-glow' : ''}`}
          >
            <User 
              className={`w-10 h-10 transition-colors cursor-pointer relative z-10`}
              strokeWidth={1.5}
              fill="currentColor"
            />
          </div>
        </button>
        
        {/* Role Label - Absolutely positioned, shown on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/person:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {person.primaryRole || 'District Director'}
        </div>
      </div>
      </div>
      {/* Person Tooltip */}
      {isHovered && tooltipPos && person && (personNeed || person.notes || person.depositPaid) && (
        <PersonTooltip
          person={person}
          need={personNeed ? {
            type: personNeed.type,
            description: personNeed.description,
            amount: personNeed.amount,
            isActive: personNeed.isActive,
          } : null}
          position={tooltipPos}
        />
      )}
    </>
  );
}

