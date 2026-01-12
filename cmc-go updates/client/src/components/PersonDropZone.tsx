import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface PersonDropZoneProps {
  campusId: string | number;
  index: number;
  onDrop: (personId: string, fromCampusId: string | number, toCampusId: string | number, targetIndex: number) => void;
  children: ReactNode;
}

export function PersonDropZone({ campusId, index, onDrop, children }: PersonDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'person',
    drop: (item: { personId: string; campusId: string | number; index: number }, monitor) => {
      // Only handle if not dropped on a specific person
      if (!monitor.didDrop()) {
        onDrop(item.personId, item.campusId, campusId, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true })
    })
  }), [campusId, index, onDrop]);

  return (
    <div 
      ref={drop}
      className={`px-4 py-2 -mx-4 -my-2 transition-colors ${isOver ? 'bg-slate-50' : ''}`}
      style={{ minHeight: '70px', minWidth: '40px' }}
    >
      {children}
    </div>
  );
}

