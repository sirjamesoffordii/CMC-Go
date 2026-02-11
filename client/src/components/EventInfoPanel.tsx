import { EventInfoContent } from "@/pages/EventInfo";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface EventInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Event Info (About CMC) – centered panel, no scroll:
 * Top half = just the picture (face visible); bottom = date, location, description, big Mighty App CTA.
 */
export function EventInfoPanel({ open, onOpenChange }: EventInfoPanelProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Event Info"
      className="max-w-[420px] h-[min(88vh,680px)] overflow-hidden p-0"
      snapPoints={[100]}
      defaultSnap={0}
      fullScreen
      showSnapPoints={false}
      mobileContentClassName="p-0"
    >
      <EventInfoContent isPanel />
    </ResponsiveDialog>
  );
}
