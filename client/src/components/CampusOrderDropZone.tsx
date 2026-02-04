import { useDrop } from "react-dnd";
import { useCallback } from "react";

interface CampusOrderDropZoneProps {
  index: number;
  onDrop: (draggedCampusId: number, targetIndex: number) => void;
  position?: "before" | "after";
  canInteract?: boolean;
}

export function CampusOrderDropZone({
  index,
  onDrop,
  position = "before",
  canInteract = true,
}: CampusOrderDropZoneProps) {
  const [{ isOver: _isOver }, drop] = useDrop(
    () => ({
      accept: "campus",
      drop: (item: { campusId: number }) => {
        if (!canInteract) return;
        onDrop(item.campusId, index);
      },
      canDrop: () => canInteract,
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [index, onDrop, canInteract]
  );

  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        drop(node);
      }
    },
    [drop]
  );

  return (
    <div
      ref={setDropRef}
      className={`absolute left-0 right-0 z-0 pointer-events-auto ${
        position === "before" ? "top-0" : "bottom-0"
      }`}
      style={{
        height: "100px", // Large drop zone for easy snapping
        [position === "before" ? "top" : "bottom"]: "-50px", // Extend beyond row boundaries
      }}
    />
  );
}
