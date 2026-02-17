import { MenuPanel } from "@/components/ui/menu-panel";
import { Info, ExternalLink } from "lucide-react";

const CMC_REGISTER_URL = "https://brushfire.com/agusa/xa/615201/register";

interface EventInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Event Info (About CMC) — consistent MenuPanel layout.
 * Hero image top half, description + CTA bottom half.
 */
export function EventInfoPanel({ open, onOpenChange }: EventInfoPanelProps) {
  return (
    <MenuPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Event Info"
      icon={<Info className="w-4 h-4" />}
    >
      <div className="space-y-4 -mx-5 -mt-4">
        {/* Hero image */}
        <div className="w-full overflow-hidden">
          <img
            src="/cmc-2026-hero.png"
            alt="CMC 2026 - Campus Missions Conference"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Description */}
        <div className="px-5 pb-2 space-y-4">
          <p className="text-base text-gray-700 leading-relaxed">
            Campus Missions Conference is National Chi Alpha's largest gathering!
            Every four years, Chi Alpha Missionaries get to gather together for
            fellowship and training. Save the date now, and look out for more
            details!
          </p>
          <a
            href={CMC_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Register for CMC
          </a>
          <a
            href={CMC_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-gray-500 hover:text-gray-700 break-all"
          >
            {CMC_REGISTER_URL}
          </a>
        </div>
      </div>
    </MenuPanel>
  );
}
