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

const DEFAULT_SNAP_POINTS = [30, 60, 85];
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const startHeight = useRef(0);

  // Reset to default snap when opening
  useEffect(() => {
    if (open) {
      setCurrentSnap(defaultSnap);
      // Prevent body scroll
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (top) {
        window.scrollTo(0, parseInt(top, 10) * -1);
      }
    }
  }, [open, defaultSnap]);

  const handleDragStart = () => {
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
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
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

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    // Close if swiped down fast or past threshold
    if (info.velocity.y > 500 || info.offset.y > 100) {
      onOpenChange(false);
    }
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
            className="fixed inset-0 bg-black/50 z-[55] md:hidden backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{
              y: `${100 - currentHeight}%`,
              transition: { type: "spring", damping: 30, stiffness: 350 },
            }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl md:hidden",
              "flex flex-col",
              className
            )}
            style={{
              height: `${currentHeight}%`,
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "bottom-sheet-title" : undefined}
          >
            {/* Drag Handle */}
            <div
              className="flex-shrink-0 pt-4 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              style={{ minHeight: "32px" }}
            >
              <div
                className="w-14 h-1.5 bg-gray-300 rounded-full"
                aria-hidden="true"
              />
            </div>

            {/* Header */}
            {title && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                <h2
                  id="bottom-sheet-title"
                  className="text-lg font-semibold text-gray-900 truncate pr-3"
                >
                  {title}
                </h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-3 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Snap Point Indicators */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2">
              {snapPoints.map((snap, index) => (
                <button
                  key={index}
                  onClick={() => snapTo(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all min-w-[32px] min-h-[32px] flex items-center justify-center",
                    index === currentSnap
                      ? "w-10 bg-gray-400"
                      : "w-2 bg-gray-200"
                  )}
                  aria-label={`Snap to ${snap}%`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
