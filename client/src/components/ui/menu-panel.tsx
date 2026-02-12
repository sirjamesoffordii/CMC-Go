import { useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileDrawer } from "@/components/MobileDrawer";

interface MenuPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional icon rendered before the title */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Desktop max-width CSS value (default: "860px") */
  maxWidth?: string;
  /** Extra className on the panel container */
  className?: string;
}

// ─── Shared header + content (desktop only) ───
function DesktopHeaderContent({
  title,
  icon,
  onClose,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200/80 flex-shrink-0 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-600 text-white flex-shrink-0 ring-2 ring-white/70">
            {icon}
          </span>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-black truncate">
          {title}
        </h2>
      </div>
      <button
        onClick={onClose}
        className="ml-2 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

/**
 * Consistent menu panel used by all hamburger-menu items.
 *
 * Desktop: drops below the toolbar, centered, premium styling.
 * Mobile: uses MobileDrawer (same as district/table) — full width, slides up from bottom,
 * covers toolbar, black header bar with handle + X, swipe-down to dismiss.
 */
export function MenuPanel({
  open,
  onOpenChange,
  title,
  icon,
  children,
  maxWidth = "860px",
  className = "",
}: MenuPanelProps) {
  const isMobile = useIsMobile();

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const bodyContent = (
    <div className="px-6 py-5 text-[15px] sm:text-base leading-relaxed">
      {children}
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        isOpen={open}
        onClose={handleClose}
        title={title}
        showHeader={true}
        fullContent={true}
        initialSnap="full"
        coverToolbar={true}
        closeOnBackdropClick={true}
      >
        {bodyContent}
      </MobileDrawer>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="menu-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[150] bg-black/40"
            onClick={handleClose}
            aria-hidden
          />

          <motion.div
            key="menu-panel-desktop"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal
            aria-label={title}
            style={{ width: "90vw", maxWidth }}
            className={[
              "fixed z-[151] flex flex-col bg-gradient-to-b from-white via-white to-gray-50/80 text-black shadow-[0_20px_70px_-35px_rgba(0,0,0,0.65)] overflow-hidden border border-gray-200/80 ring-1 ring-black/5",
              "left-1/2 -translate-x-1/2 top-[60px] max-h-[calc(100vh-80px)] rounded-2xl",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Red accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 flex-shrink-0" />

            <DesktopHeaderContent
              title={title}
              icon={icon}
              onClose={handleClose}
            />
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {bodyContent}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
