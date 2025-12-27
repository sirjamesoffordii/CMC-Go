import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface CampusOrderDropZoneProps {
  index: number;
  onDrop: (draggedCampusId: number, targetIndex: number) => void;
  children?: ReactNode;
}

export function CampusOrderDropZone({ index, onDrop, children }: CampusOrderDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'campus',
    drop: (item: { campusId: number }) => {
      onDrop(item.campusId, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }), [index, onDrop]);

  return (
    <div
      ref={drop}
      // Keep drop zones easy to hit without creating visible "gaps" between campus rows.
      className={`transition-all -my-1 mx-2 rounded ${
        isOver
          ? 'h-8 bg-blue-100 border border-blue-300 shadow-sm'
          : 'h-2 hover:h-6 hover:bg-slate-50'
      }`}
    >
      {children}
    </div>
  );
}
