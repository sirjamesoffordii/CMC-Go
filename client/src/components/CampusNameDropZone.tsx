// @ts-nocheck
import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface CampusNameDropZoneProps {
  campusId: string | number;
  onDrop: (personId: string, fromCampusId: string | number, toCampusId: string | number) => void;
  children: ReactNode;
}

export function CampusNameDropZone({ campusId, onDrop, children }: CampusNameDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }) => {
      onDrop(item.personId, item.campusId, campusId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }), [campusId, onDrop]);

  return (
    <div 
      ref={drop}
      className="flex items-center gap-3"
    >
      {children}
    </div>
  );
}

