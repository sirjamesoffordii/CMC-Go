import { X } from "lucide-react";
import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Whether content should be full-height (for scrollable content) */
  fullContent?: boolean;
}

const SWIPE_CLOSE_THRESHOLD = 80; // pixels to swipe down before closing
const SWIPE_VELOCITY_THRESHOLD = 400; // velocity in px/s for quick swipes

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  title,
  fullContent = true,
}: MobileDrawerProps) {
  const controls = useAnimation();
  const [contentHeight, setContentHeight] = useState("70vh");

  // Calculate safe height on mount and resize
  useEffect(() => {
    const calculateHeight = () => {
      // Use visualViewport for better mobile keyboard handling
      const vh = window.visualViewport?.height || window.innerHeight;
      const maxHeight = Math.min(vh * 0.85, vh - 60); // Leave room for header
      setContentHeight(`${maxHeight}px`);
    };

    if (isOpen) {
      calculateHeight();
      window.addEventListener("resize", calculateHeight);
      window.visualViewport?.addEventListener("resize", calculateHeight);
    }

    return () => {
      window.removeEventListener("resize", calculateHeight);
      window.visualViewport?.removeEventListener("resize", calculateHeight);
    };
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
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
            className="fixed inset-0 bg-black/50 z-[55] md:hidden backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={controls}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 400,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 bg-white z-[60] md:hidden rounded-t-3xl shadow-2xl flex flex-col mobile-drawer-bottom"
            style={{
              height: contentHeight,
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "drawer-title" : undefined}
          >
            {/* Drag Handle Area - larger touch target */}
            <div
              className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
              style={{ minHeight: "32px" }}
            >
              <div
                className="w-14 h-1.5 bg-slate-300 rounded-full"
                aria-hidden="true"
              />
            </div>

            {/* Header - touch-friendly with better spacing */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-100 bg-slate-50/80">
              {title && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-slate-900 truncate pr-3 flex-1"
                >
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto -mr-1 p-3 hover:bg-slate-200 active:bg-slate-300 rounded-full transition-colors flex items-center justify-center min-w-[48px] min-h-[48px]"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Content - scrollable with momentum on iOS */}
            <div
              className={`flex-1 overflow-y-auto overscroll-contain scrollbar-hide mobile-drawer-content ${
                fullContent ? "pb-4" : ""
              }`}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
