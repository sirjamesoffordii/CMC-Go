import { useDrag } from 'react-dnd';
import { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableCampusRowProps {
  campusId: number;
  children: ReactNode;
  isDragging?: boolean;
}

export function DraggableCampusRow({ campusId, children, isDragging }: DraggableCampusRowProps) {
  const [{ isDragging: dragState }, drag, dragPreview] = useDrag(() => ({
    type: 'campus',
    item: { campusId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [campusId]);

  const opacity = (isDragging || dragState) ? 0.5 : 1;

  return (
    <div
      ref={drag}
      style={{ opacity }}
      className="relative group/campus"
    >
      {/* Drag Handle */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/campus:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-600" />
      </div>
      {children}
    </div>
  );
}

