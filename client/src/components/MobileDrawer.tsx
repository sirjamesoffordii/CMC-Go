import { X } from "lucide-react";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Height of the drawer - can be a CSS value like "50vh" or "45vh" */
  height?: string;
}

const SWIPE_CLOSE_THRESHOLD = 80; // pixels to swipe down before closing
const SWIPE_VELOCITY_THRESHOLD = 400; // velocity in px/s for quick swipes

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  title,
  height = "50vh",
}: MobileDrawerProps) {
  const controls = useAnimation();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset animation when drawer opens
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    }
  }, [isOpen, controls]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldClose =
        info.offset.y > SWIPE_CLOSE_THRESHOLD ||
        info.velocity.y > SWIPE_VELOCITY_THRESHOLD;

      if (shouldClose) {
        // Animate out before closing
        controls.start({ y: "100%" }).then(onClose);
      } else {
        // Snap back to open position
        controls.start({ y: 0 });
      }
    },
    [controls, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={controls}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 350,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 bg-white z-50 md:hidden rounded-t-2xl shadow-2xl flex flex-col mobile-drawer-bottom"
            style={{
              height,
              maxHeight: "90vh",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Drag Handle Indicator - clear affordance */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0">
              <div
                className="w-12 h-1.5 bg-slate-300 rounded-full"
                aria-hidden
              />
            </div>

            {/* Header - touch-friendly */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-100 bg-slate-50/50">
              {title && (
                <h2 className="text-lg font-semibold text-slate-900 truncate pr-2 flex-1">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto p-2.5 hover:bg-slate-200 active:bg-slate-300 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Content - scrollable with momentum on iOS */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
