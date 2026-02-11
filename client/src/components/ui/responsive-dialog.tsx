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
  /** Disable backdrop click to close on mobile */
  closeOnBackdrop?: boolean;
  /** Hide close button on mobile */
  showCloseButton?: boolean;
  /** Hide snap point indicators on mobile */
  showSnapPoints?: boolean;
  /** Reduce header height on mobile */
  compactHeader?: boolean;
  /** Force full-screen height on mobile */
  fullScreen?: boolean;
  /** Mobile content wrapper className (default: "px-4 pb-4") */
  mobileContentClassName?: string;
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
  closeOnBackdrop = true,
  showCloseButton = true,
  showSnapPoints = true,
  compactHeader = false,
  fullScreen = false,
  mobileContentClassName = "px-4 pb-4",
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
        closeOnBackdrop={closeOnBackdrop}
        showCloseButton={showCloseButton}
        showSnapPoints={showSnapPoints}
        compactHeader={compactHeader}
        fullScreen={fullScreen}
      >
        <div className={mobileContentClassName}>{children}</div>
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
