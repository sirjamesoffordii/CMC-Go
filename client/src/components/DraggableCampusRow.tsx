// @ts-nocheck
import { useDrag } from 'react-dnd';
import { ReactNode } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useEffect } from 'react';

interface DraggableCampusRowProps {
  campusId: number;
  children: ReactNode;
  isDragging?: boolean;
}

export function DraggableCampusRow({ campusId, children, isDragging }: DraggableCampusRowProps) {
  const [{ isDragging: dragState }, drag, preview] = useDrag(() => ({
    type: 'campus',
    item: { campusId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [campusId]);

  // Use the actual element as the drag preview instead of default
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const opacity = (isDragging || dragState) ? 0.5 : 1;

  return (
    <div
      ref={drag}
      style={{ opacity }}
      className="relative cursor-grab active:cursor-grabbing z-10"
    >
      {children}
    </div>
  );
}

