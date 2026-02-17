import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const CMC_REGISTER_URL = "https://brushfire.com/agusa/xa/615201/register";

interface EventInfoContentProps {
  onClose?: () => void;
  /** When true, used inside panel (no Back button; panel has its own close) */
  isPanel?: boolean;
}

export function EventInfoContent({
  onClose,
  isPanel = false,
}: EventInfoContentProps) {
  useEffect(() => {
    if (isPanel || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPanel, onClose]);

  return (
    <div
      className={`flex flex-col bg-slate-900 ${isPanel ? "h-full" : "min-h-full"}`}
    >
      {!isPanel && onClose && (
        <div className="flex-shrink-0 p-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white/90 hover:text-white hover:bg-white/10 min-h-[44px] font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Map
          </Button>
        </div>
      )}

      {/* Banner image is the background – no orange; full picture including blue strip */}
      <header
        className="relative flex w-full flex-shrink-0 items-center justify-center overflow-hidden"
        style={isPanel ? { height: "50%" } : { minHeight: "280px" }}
      >
        <img
          src="/cmc-2026-hero.png"
          alt="CMC 2026 - Campus Missions Conference"
          className="h-full w-full object-contain object-center"
        />
      </header>

      {/* Description only – date/location already in the blue section of the image */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-700/50 bg-slate-900">
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Campus Missions Conference is National Chi Alpha's largest
            gathering! Every four years, Chi Alpha Missionaries get to gather
            together for fellowship and training. Save the date now, and look
            out for more details!
          </p>
          <a
            href={CMC_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Register for CMC
          </a>
          <a
            href={CMC_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-xs sm:text-sm text-slate-500 hover:text-slate-300 break-all"
          >
            {CMC_REGISTER_URL}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function EventInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-900">
      <EventInfoContent isPanel={false} onClose={() => setLocation("/")} />
    </div>
  );
}
