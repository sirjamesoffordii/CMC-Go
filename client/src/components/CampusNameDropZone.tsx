// @ts-nocheck
import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface CampusNameDropZoneProps {
  campusId: string | number;
  onDrop: (personId: string, fromCampusId: string | number, toCampusId: string | number) => void;
  children: ReactNode;
  canInteract?: boolean;
}

export function CampusNameDropZone({ campusId, onDrop, children, canInteract = true }: CampusNameDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number }) => {
      if (!canInteract) return;
      onDrop(item.personId, item.campusId, campusId);
    },
    canDrop: () => canInteract,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }), [campusId, onDrop, canInteract]);

  return (
    <div 
      ref={drop}
      className="flex items-center gap-3"
    >
      {children}
    </div>
  );
}

