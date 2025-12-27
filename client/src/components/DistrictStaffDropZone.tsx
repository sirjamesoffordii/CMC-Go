import { useDrop, useDrag } from 'react-dnd';
import { User, Plus, Edit2 } from 'lucide-react';
import { Person } from '../../../drizzle/schema';
import { useState, useRef } from 'react';
import { PersonTooltip } from './PersonTooltip';
import { trpc } from '../lib/trpc';
import { Input } from './ui/input';
import { NeedIndicator } from './NeedIndicator';

// Mirrors DistrictDirectorDropZone but represents a single "District Staff" slot.

const reverseStatusMap = {
  'Yes': 'director' as const,
  'Maybe': 'staff' as const,
  'No': 'co-director' as const,
  'Not Invited': 'not-invited' as const,
};

interface DistrictStaffDropZoneProps {
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

export function DistrictStaffDropZone({
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
  quickAddInputRef,
}: DistrictStaffDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery({ personId: person?.personId || '' }, { enabled: !!person });
  const personNeed = person && personNeeds.length > 0 ? personNeeds[0] : null;

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }) => {
      onDrop(item.personId, item.campusId);
    },
    canDrop: (item: { personId: string; campusId: string | number }) => {
      return item.campusId !== 'district-staff';
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  }));

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'person',
    item: person ? { personId: person.personId, campusId: 'district-staff' } : null,
    canDrag: () => !!person,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [person]);

  const handleNameMouseEnter = () => {
    if (!person) return;
    setIsHovered(true);
    if (nameRef.current) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };
  const handleNameMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };
  const handleNameMouseMove = () => {
    if (!nameRef.current || !isHovered || !person) return;
    const rect = nameRef.current.getBoundingClientRect();
    setTooltipPos({ x: rect.left, y: rect.top });
  };

  if (!person) {
    return (
      <div ref={drop} className="flex flex-col items-center group/person w-[50px] transition-transform">
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
            <div className="relative flex items-center justify-center mb-1">
              {quickAddMode ? (
                <div className="relative">
                  <Input
                    ref={quickAddInputRef}
                    value={quickAddName}
                    onChange={(e) => onQuickAddNameChange?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onQuickAddSubmit?.();
                      if (e.key === 'Escape') onQuickAddCancel?.();
                    }}
                    onBlur={() => onQuickAddSubmit?.()}
                    placeholder="Name"
                    className="w-16 h-5 text-xs px-1.5 py-0.5 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    autoFocus
                  />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 whitespace-nowrap pointer-events-none">
                    Quick Add
                  </div>
                </div>
              ) : (
                <Plus className="w-3 h-3 text-black opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110 cursor-pointer" strokeWidth={1.5} />
              )}
            </div>
            <div className="relative">
              <User className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95" strokeWidth={1.5} fill="currentColor" />
            </div>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/add:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Staff
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
        className={`flex flex-col items-center group/person w-[50px] transition-transform ${
          isOver && canDrop ? 'scale-105' : ''
        }`}
      >
        <div
          ref={nameRef}
          className="relative flex items-center gap-1 mb-1"
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={handleNameMouseLeave}
          onMouseMove={handleNameMouseMove}
        >
          <span className="text-xs text-slate-600 text-center leading-tight cursor-pointer select-none">
            {truncatedName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit('district-staff', person);
            }}
            className="opacity-0 group-hover/person:opacity-100 transition-opacity"
          >
            <Edit2 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div
          ref={drag}
          className={`relative cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-60' : ''}`}
          onClick={onClick}
        >
          <User className="w-10 h-10 text-slate-200" strokeWidth={1.5} fill="currentColor" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/60" />
          </div>
          {personNeed?.isActive && (
            <div className="absolute -right-1 -top-1 w-5 h-5">
              <NeedIndicator type={personNeed.type} />
            </div>
          )}
        </div>
      </div>

      {isHovered && tooltipPos && person && (
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
