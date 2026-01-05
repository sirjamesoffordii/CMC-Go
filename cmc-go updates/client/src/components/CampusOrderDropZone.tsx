import { useDrop } from 'react-dnd';

interface CampusOrderDropZoneProps {
  index: number;
  onDrop: (draggedCampusId: number, targetIndex: number) => void;
  position?: 'before' | 'after';
}

export function CampusOrderDropZone({ index, onDrop, position = 'before' }: CampusOrderDropZoneProps) {
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
      className={`absolute left-0 right-0 z-0 pointer-events-auto ${
        position === 'before' 
          ? 'top-0' 
          : 'bottom-0'
      }`}
      style={{
        height: '100px', // Large drop zone for easy snapping
        [position === 'before' ? 'top' : 'bottom']: '-50px', // Extend beyond row boundaries
      }}
    />
  );
}
