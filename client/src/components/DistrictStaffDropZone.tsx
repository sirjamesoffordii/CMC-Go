// @ts-nocheck
import { useDrop, useDrag } from 'react-dnd';
import { User, Edit2 } from 'lucide-react';
import { Person } from '../../../drizzle/schema';
import { useState, useRef } from 'react';
import { PersonTooltip } from './PersonTooltip';
import { trpc } from '../lib/trpc';
import { NeedIndicator } from './NeedIndicator';

// Mirrors DistrictDirectorDropZone but represents a single "District Staff" slot.

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

interface DistrictStaffDropZoneProps {
  person: Person | null;
  onDrop: (personId: string, fromCampusId: string | number) => void;
  onEdit: (campusId: string | number, person: Person) => void;
  onClick: () => void;
  canInteract?: boolean;
  maskIdentity?: boolean;
}

interface Need {
  id: number;
  personId: string;
  type: string;
  description: string;
  amount?: number | null;
  isActive: boolean;
}

export function DistrictStaffDropZone({
  person,
  onDrop,
  onEdit,
  onClick,
  canInteract = true,
  maskIdentity = false
}: DistrictStaffDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  
  // Fetch needs by person to get all needs (including inactive) to show met needs with checkmark
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId || '' },
    { enabled: !!person && canInteract && !maskIdentity }
  );
  const personNeed = person && personNeeds.length > 0 ? personNeeds[0] : null;

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }) => {
      if (canInteract) {
        onDrop(item.personId, item.campusId);
      }
    },
    canDrop: (item: { personId: string; campusId: string | number }) => {
      return canInteract && item.campusId !== 'district-staff';
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  }), [onDrop, canInteract]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'person',
    item: person ? { personId: person.personId, campusId: 'district-staff' } : null,
    canDrag: () => !!person && canInteract,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [person, canInteract]);

  const handleNameMouseEnter = (e: React.MouseEvent) => {
    if (person && canInteract) {
      setIsHovered(true);
      if (nameRef.current) {
        const rect = nameRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left, y: rect.top });
      }
    }
  };

  const handleNameMouseLeave = () => {
    if (canInteract) {
      setIsHovered(false);
      setTooltipPos(null);
    }
  };

  const handleNameMouseMove = (e: React.MouseEvent) => {
    if (nameRef.current && isHovered && person && canInteract) {
      const rect = nameRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top });
    }
  };

  if (!person) {
    // Empty slot when no district staff
    return (
      <div
        ref={drop}
        className="flex flex-col items-center group/person w-[60px] transition-transform"
      >
        <div className="relative flex flex-col items-center w-[60px]">
          <div className="relative">
            <User
              className="w-10 h-10 text-slate-300"
              strokeWidth={1.5}
              fill="currentColor"
            />
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
        className="flex flex-col items-center group/person w-[60px] transition-transform"
      >
      {/* Name Label with Edit Button */}
          <div 
            ref={nameRef}
            className="relative flex items-center justify-center mb-1 group/name w-full min-w-0 cursor-pointer"
            onMouseEnter={handleNameMouseEnter}
            onMouseLeave={handleNameMouseLeave}
            onMouseMove={handleNameMouseMove}
          >
        <div className="text-sm text-slate-600 font-semibold text-center whitespace-nowrap overflow-hidden max-w-full">
          {maskIdentity ? "\u00A0" : truncatedName}
        </div>
        {canInteract && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit('district-staff', person);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -top-1.5 -right-2 opacity-0 group-hover/name:opacity-100 group-hover/person:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded z-10"
            title="Edit person"
          >
            <Edit2 className="w-2.5 h-2.5 text-slate-500" />
          </button>
        )}
      </div>
      
      <div
        ref={(node) => {
          iconRef.current = node;
          if (canInteract) {
            drag(node);
          }
        }}
        className={`relative ${canInteract ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          onClick={() => {
            if (maskIdentity || !canInteract) return;
            onClick();
          }}
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
            className={`relative ${maskIdentity ? 'text-zinc-400' : statusColors[figmaStatus]} ${(!maskIdentity && person.depositPaid) ? 'deposit-glow' : ''}`}
          >
            <User 
              className={`w-10 h-10 transition-colors cursor-pointer relative z-10`}
              strokeWidth={1.5}
              fill="currentColor"
            />
            {/* Need indicator (arm + icon) */}
            {!maskIdentity && personNeed?.isActive && (
              <NeedIndicator type={personNeed.type} />
            )}
          </div>
        </button>
        
        {/* Role Label - Absolutely positioned, shown on hover */}
        {!maskIdentity && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/person:opacity-100 transition-opacity">
            {person.primaryRole || 'District Staff'}
          </div>
        )}
      </div>
      </div>
      {/* Person Tooltip */}
      {!maskIdentity && isHovered && tooltipPos && person && (personNeed || person.notes || person.depositPaid) && (
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
