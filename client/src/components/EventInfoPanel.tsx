import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { EventInfoContent } from "@/pages/EventInfo";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface EventInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Toolbar height in px so panel sits right below it */
  headerHeight?: number;
}

/**
 * Event Info (About CMC) as a large panel centered on the screen,
 * covering 50% of the viewport.
 */
export function EventInfoPanel({
  open,
  onOpenChange,
  headerHeight = 56,
}: EventInfoPanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Event Info"
        snapPoints={[100]}
        defaultSnap={0}
        showSnapPoints={false}
        fullScreen={true}
      >
        <div className="-mx-4 -mb-4">
          <EventInfoContent isPanel />
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-black/50"
                  onClick={() => onOpenChange(false)}
                  aria-hidden
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <div
                  className="fixed left-1/2 top-1/2 z-50 flex w-[85vw] min-w-[320px] max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 text-slate-300 shadow-lg"
                  style={{
                    height: "85vh",
                    minHeight: "420px",
                    maxHeight: "90vh",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex h-full flex-col overflow-hidden"
                  >
                  <Dialog.Title className="sr-only">
                    Event Info – CMC 2026 Campus Missions Conference
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute top-3 right-3 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex-1 overflow-auto">
                    <EventInfoContent isPanel />
                  </div>
                  </motion.div>
                </div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
