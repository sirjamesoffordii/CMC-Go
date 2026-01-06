// @ts-nocheck
import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface CampusDropZoneProps {
  campusId: string | number;
  onDrop: (personId: string, fromCampusId: string | number, toCampusId: string | number) => void;
  children: ReactNode;
}

export function CampusDropZone({ campusId, onDrop, children }: CampusDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }, monitor) => {
      // Only handle if not dropped on a specific person
      if (!monitor.didDrop()) {
        onDrop(item.personId, item.campusId, campusId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  }), [campusId, onDrop]);

  return (
    <div 
      ref={drop}
      className="flex-1 transition-colors"
    >
      {children}
    </div>
  );
}

