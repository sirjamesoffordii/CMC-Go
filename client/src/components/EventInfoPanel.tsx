import { Sheet, SheetContent } from "@/components/ui/sheet";
import { EventInfoContent } from "@/pages/EventInfo";

interface EventInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Event Info (About CMC) as a large slide-over panel from the right.
 * Pretty big but not full screen: ~85vw up to 42rem (672px).
 */
export function EventInfoPanel({ open, onOpenChange }: EventInfoPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="h-full w-[min(90vw,42rem)] max-w-[42rem] border-slate-700/50 bg-slate-900 p-0 gap-0 overflow-hidden text-slate-300 [&_button.absolute]:text-white [&_button.absolute]:hover:bg-white/10 [&_button.absolute]:border-0"
      >
        <div className="h-full overflow-auto">
          <EventInfoContent isPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
