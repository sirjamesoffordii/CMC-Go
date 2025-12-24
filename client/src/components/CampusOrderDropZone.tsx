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
      className={`transition-all my-2 ${
        isOver 
          ? 'h-8 bg-blue-200 border-t-2 border-b-2 border-blue-500 rounded shadow-md' 
          : 'h-4 hover:h-6 hover:bg-slate-100'
      }`}
    >
      {children}
    </div>
  );
}

