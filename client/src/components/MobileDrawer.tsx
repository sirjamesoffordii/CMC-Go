import { X } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  PanInfo,
  useAnimation,
  useDragControls,
} from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Whether content should be full-height (for scrollable content) */
  fullContent?: boolean;
  /** Hide the header row (title + close button). Drag handle remains. */
  showHeader?: boolean;
  /** Hide title only, show close button in top-right corner with no padding (for district panel) */
  hideTitleCloseInCorner?: boolean;
  /** Initial snap when opening: "half" (55dvh) or "full" (100dvh). Table uses "full". */
  initialSnap?: "half" | "full";
  /** When true, drawer and backdrop use higher z-index to cover the main toolbar (e.g. table full screen). */
  coverToolbar?: boolean;
  /** When false, backdrop does not close the drawer on click. */
  closeOnBackdropClick?: boolean;
  /** When changed, forces the drawer to this snap position (use a counter/key to re-trigger the same value). */
  snapOverride?: { snap: "half" | "full"; key: number };
}

const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 400;

/** Height percentages for snap points */
const SNAP_HALF = 55; // half-screen default
const SNAP_FULL = 100; // full-screen

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  title,
  fullContent = true,
  showHeader = true,
  hideTitleCloseInCorner = false,
  initialSnap = "half",
  coverToolbar = false,
  closeOnBackdropClick = true,
  snapOverride,
}: MobileDrawerProps) {
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [snap, setSnap] = useState<"half" | "full">(initialSnap);

  useBodyScrollLock(isOpen);

  // Reset snap and animation when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSnap(initialSnap);
      controls.start({
        height: initialSnap === "full" ? `${SNAP_FULL}dvh` : `${SNAP_HALF}dvh`,
      });
    }
  }, [isOpen, controls, initialSnap]);

  // External snap override (e.g. expand to full when district selected from map)
  useEffect(() => {
    if (snapOverride && isOpen) {
      setSnap(snapOverride.snap);
      controls.start({
        height:
          snapOverride.snap === "full" ? `${SNAP_FULL}dvh` : `${SNAP_HALF}dvh`,
      });
    }
  }, [snapOverride, isOpen, controls]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const swipedDown =
        info.offset.y > SWIPE_CLOSE_THRESHOLD ||
        info.velocity.y > SWIPE_VELOCITY_THRESHOLD;
      const swipedUp =
        info.offset.y < -SWIPE_CLOSE_THRESHOLD ||
        info.velocity.y < -SWIPE_VELOCITY_THRESHOLD;

      if (snap === "half") {
        if (swipedDown) {
          // Half → close
          controls.start({ height: "0dvh" }).then(onClose);
          return;
        }
        if (swipedUp) {
          // Half → full
          setSnap("full");
          controls.start({ height: `${SNAP_FULL}dvh` });
          return;
        }
        // Snap back to half
        controls.start({ height: `${SNAP_HALF}dvh` });
      } else {
        // Currently full
        if (swipedDown) {
          // Full → half
          setSnap("half");
          controls.start({ height: `${SNAP_HALF}dvh` });
          return;
        }
        // Snap back to full
        controls.start({ height: `${SNAP_FULL}dvh` });
      }
    },
    [controls, onClose, snap]
  );

  const isFullScreen = snap === "full";
  // Only cover the toolbar when the drawer is actually full-screen
  const shouldCoverToolbar = isFullScreen;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent backdrop — excludes header (52px) so toolbar clicks don't close drawer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`fixed inset-x-0 top-[52px] bottom-0 md:hidden ${shouldCoverToolbar ? "z-[255]" : "z-[210]"} ${!closeOnBackdropClick ? "pointer-events-none" : ""}`}
            onClick={closeOnBackdropClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Drawer — pinned to bottom, height animated between snap points */}
          <motion.div
            initial={{ height: "0dvh" }}
            animate={controls}
            exit={{ height: "0dvh" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.15, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            className={[
              "fixed inset-x-0 bottom-0 bg-white md:hidden flex flex-col mobile-drawer-bottom overflow-hidden rounded-t-[1.25rem]",
              shouldCoverToolbar ? "z-[260]" : "z-[220]",
            ].join(" ")}
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
              borderTopLeftRadius: "1.25rem",
              borderTopRightRadius: "1.25rem",
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Dark handle bar with X button */}
            <div
              onPointerDown={e => {
                if (
                  !(e.target instanceof HTMLElement) ||
                  !e.target.closest("button")
                ) {
                  dragControls.start(e);
                }
              }}
              className="relative flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none bg-black"
              style={{
                minHeight: "40px",
                padding: "12px 0 8px",
                touchAction: "none",
              }}
            >
              {showHeader && title && !hideTitleCloseInCorner && (
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
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white hover:bg-white/10 active:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide mobile-drawer-content ${fullContent ? "pb-4" : ""}`}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
