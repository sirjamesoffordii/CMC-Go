import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const MIGHTY_APP_EVENT_URL = "https://chialpha.mn.co/events/cmc-2026";

export function handleEventInfoShare() {
  if (navigator.share) {
    navigator
      .share({
        title: "CMC 2026 - Campus Missions Conference",
        url: MIGHTY_APP_EVENT_URL,
        text: "Campus Missions Conference is National Chi Alpha's largest gathering! Save the date: July 6–10, 2026.",
      })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(MIGHTY_APP_EVENT_URL);
  }
}

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
    <div className="min-h-full flex flex-col bg-slate-900">
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

      {/* Hero */}
      <header className="relative flex-shrink-0 w-full overflow-hidden">
        <div
          className="relative w-full min-h-[200px] sm:min-h-[240px]"
          style={{
            backgroundColor: "#b8952e",
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 14px,
              rgba(0,0,0,0.04) 14px,
              rgba(0,0,0,0.04) 28px
            )`,
          }}
        >
          <img
            src="/cmc-2026-hero.png"
            alt="CMC 2026 - Campus Missions Conference"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-900/5" />
        </div>
        <div
          className="w-full h-1 flex-shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #0f172a 0%, #b8952e 50%, #0f172a 100%)",
          }}
        />
      </header>

      {/* Event strip */}
      <div className="flex-shrink-0 bg-slate-900/95 border-t border-slate-700/50">
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 flex flex-col items-center justify-center rounded-xl bg-slate-800 text-white border border-slate-700/50 flex-shrink-0">
                <span className="text-xl font-bold leading-none tabular-nums">
                  06
                </span>
                <span className="text-[10px] uppercase tracking-widest mt-0.5 font-medium text-slate-400">
                  Jul
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <span>Mon, Jul 6 – Fri, Jul 10, 2026 • CDT</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm mt-0.5">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <span>Arizona Grand Resort, Phoenix, AZ</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={MIGHTY_APP_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-sm transition-colors shadow-lg shadow-emerald-900/30"
              >
                <ExternalLink className="h-4 w-4" />
                More info on Chi Alpha Mighty App
              </a>
              <button
                type="button"
                onClick={handleEventInfoShare}
                className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Share event"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 px-4 py-5 overflow-auto">
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Campus Missions Conference is National Chi Alpha's largest gathering!
          Every four years, Chi Alpha Missionaries get to gather together for
          fellowship and training. Save the date now, and look out for more
          details!
        </p>
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
