import { useDrag } from "react-dnd";
import { ReactNode, useCallback } from "react";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useEffect } from "react";

interface DraggableCampusRowProps {
  campusId: number;
  children: ReactNode;
  isDragging?: boolean;
  canInteract?: boolean;
}

export function DraggableCampusRow({
  campusId,
  children,
  isDragging,
  canInteract = true,
}: DraggableCampusRowProps) {
  const [{ isDragging: dragState }, drag, preview] = useDrag(
    () => ({
      type: "campus",
      item: { campusId },
      canDrag: canInteract,
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [campusId, canInteract]
  );

  // Use the actual element as the drag preview instead of default
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const setDragRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && canInteract) {
        drag(node);
      }
    },
    [drag, canInteract]
  );

  const opacity = isDragging || dragState ? 0.5 : 1;

  return (
    <div
      ref={setDragRef}
      style={{ opacity }}
      className={`relative z-10 ${canInteract ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
    >
      {children}
    </div>
  );
}
