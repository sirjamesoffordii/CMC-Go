import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  PanInfo,
  useAnimation,
  useDragControls,
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // Array of percentages [25, 60, 90]
  defaultSnap?: number; // Default snap point index (0, 1, or 2)
  className?: string;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  showSnapPoints?: boolean;
  compactHeader?: boolean;
  fullScreen?: boolean;
}

const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 400;

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  className,
  closeOnBackdrop = true,
  showCloseButton = true,
}: BottomSheetProps) {
  const controls = useAnimation();
  const dragControls = useDragControls();

  useBodyScrollLock(open);

  // Animate open
  useEffect(() => {
    if (open) {
      controls.start({ height: "100dvh" });
    }
  }, [open, controls]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (
        info.offset.y > SWIPE_CLOSE_THRESHOLD ||
        info.velocity.y > SWIPE_VELOCITY_THRESHOLD
      ) {
        controls.start({ height: "0dvh" }).then(() => onOpenChange(false));
      } else {
        controls.start({ height: "100dvh" });
      }
    },
    [controls, onOpenChange]
  );

  const startDrag = (e: React.PointerEvent) => {
    if (!(e.target instanceof HTMLElement) || !e.target.closest("button")) {
      dragControls.start(e);
    }
  };

  const sheetContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeOnBackdrop ? () => onOpenChange(false) : undefined}
            className="fixed inset-0 bg-black/40 z-[265] md:hidden"
            aria-hidden="true"
          />

          {/* Sheet — same design as MobileDrawer */}
          <motion.div
            initial={{ height: "0dvh" }}
            animate={controls}
            exit={{ height: "0dvh" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed inset-x-0 bottom-0 bg-white z-[270] md:hidden flex flex-col overflow-hidden rounded-t-[1.25rem] mobile-bottom-sheet",
              className
            )}
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
              borderTopLeftRadius: "1.25rem",
              borderTopRightRadius: "1.25rem",
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Dark handle bar — black like Table drawer, title + dash + X in white */}
            <div
              onPointerDown={startDrag}
              className="relative flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none bg-black"
              style={{
                minHeight: "40px",
                padding: "12px 0 8px",
                touchAction: "none",
              }}
            >
              {title && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pr-14 min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {title}
                  </h2>
                </div>
              )}
              <div
                className="w-10 h-1 bg-white rounded-full"
                aria-hidden="true"
              />
              {showCloseButton && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onOpenChange(false);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white hover:bg-white/10 active:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(sheetContent, document.body);
}
