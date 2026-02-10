import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "./bottom-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  /** Desktop dialog className (e.g. "max-w-2xl") */
  className?: string;
  /** BottomSheet snap points (default: [25, 60, 90]) */
  snapPoints?: number[];
  /** Default snap index (default: 1 = 60%) */
  defaultSnap?: number;
}

/**
 * Renders a Dialog on desktop and a swipe-to-dismiss BottomSheet on mobile.
 * Drop-in replacement for Dialog where mobile needs a slide-up sheet.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  children,
  className = "max-w-2xl max-h-[85vh] overflow-y-auto",
  snapPoints = [25, 60, 90],
  defaultSnap = 1,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        snapPoints={snapPoints}
        defaultSnap={defaultSnap}
      >
        <div className="px-4 pb-4">{children}</div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
