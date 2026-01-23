// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // Array of percentages [25, 60, 90]
  defaultSnap?: number; // Default snap point index (0, 1, or 2)
  className?: string;
}

const DEFAULT_SNAP_POINTS = [25, 60, 90];
const DEFAULT_SNAP = 1; // 60% by default

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  snapPoints = DEFAULT_SNAP_POINTS,
  defaultSnap = DEFAULT_SNAP,
  className,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Reset to default snap when opening
  useEffect(() => {
    if (open) {
      setCurrentSnap(defaultSnap);
    }
  }, [open, defaultSnap]);

  const handleDragStart = () => {
    setIsDragging(true);
    if (sheetRef.current) {
      startHeight.current = sheetRef.current.offsetHeight;
    }
  };

  const handleDrag = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!sheetRef.current) return;

    const deltaY = info.delta.y;
    const newHeight = startHeight.current - deltaY;
    const viewportHeight = window.innerHeight;
    const newPercentage = (newHeight / viewportHeight) * 100;

    // Find closest snap point
    let closestSnap = currentSnap;
    let minDiff = Infinity;

    snapPoints.forEach((snap, index) => {
      const diff = Math.abs(newPercentage - snap);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = index;
      }
    });

    setCurrentSnap(closestSnap);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const snapTo = (index: number) => {
    setCurrentSnap(index);
  };

  const currentHeight = snapPoints[currentSnap];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{
              y: `${100 - currentHeight}%`,
              transition: { type: "spring", damping: 30, stiffness: 300 },
            }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl md:hidden",
              "flex flex-col",
              className
            )}
            style={{
              height: `${currentHeight}%`,
              maxHeight: "90vh",
            }}
          >
            {/* Drag Handle */}
            <div className="flex-shrink-0 pt-3 pb-2 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            {(title || onOpenChange) && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2 border-b">
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {onOpenChange && (
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 -mr-2 touch-target"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Snap Point Indicators (optional) */}
            <div className="flex-shrink-0 flex items-center justify-center gap-1 px-4 py-1">
              {snapPoints.map((_, index) => (
                <button
                  key={index}
                  onClick={() => snapTo(index)}
                  className={cn(
                    "h-1 rounded-full transition-all touch-target",
                    index === currentSnap
                      ? "w-8 bg-gray-400"
                      : "w-1 bg-gray-300"
                  )}
                  aria-label={`Snap to ${snapPoints[index]}%`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
