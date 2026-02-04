import { useDrop } from "react-dnd";
import { ReactNode, useCallback } from "react";

interface CampusDropZoneProps {
  campusId: string | number;
  onDrop: (
    personId: string,
    fromCampusId: string | number,
    toCampusId: string | number
  ) => void;
  children: ReactNode;
  canInteract?: boolean;
}

export function CampusDropZone({
  campusId,
  onDrop,
  children,
  canInteract = true,
}: CampusDropZoneProps) {
  const [{ isOver: _isOver, canDrop: _canDrop }, drop] = useDrop(
    () => ({
      accept: "person",
      drop: (
        item: { personId: string; campusId: string | number },
        monitor
      ) => {
        if (!canInteract) return;
        // Only handle if not dropped on a specific person
        if (!monitor.didDrop()) {
          onDrop(item.personId, item.campusId, campusId);
        }
      },
      canDrop: () => canInteract,
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [campusId, onDrop, canInteract]
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
    <div ref={setDropRef} className="flex-1 transition-colors">
      {children}
    </div>
  );
}
