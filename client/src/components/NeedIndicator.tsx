import { DollarSign, Home, Car, HelpCircle } from "lucide-react";

type NeedType = "Financial" | "Housing" | "Transportation" | "Other" | string;

const NEED_ICON = {
  Financial: DollarSign,
  Housing: Home,
  Transportation: Car,
  Other: HelpCircle,
} as const;

/**
 * Visual replacement for the old yellow "Hand" icon.
 *
 * Design intent:
 * - A small "cylinder arm" extending up and slightly outward from the person icon.
 * - A tiny icon at the end representing the need type.
 */
export function NeedIndicator({ type }: { type?: NeedType | null }) {
  const Icon = (type && (NEED_ICON as any)[type]) ? (NEED_ICON as any)[type] : HelpCircle;

  return (
    <div
      className="absolute -top-1 -right-1 z-20 pointer-events-none"
      style={{ transform: "rotate(-18deg)" }}
      aria-hidden="true"
      title={type || "Need"}
    >
      {/* Arm */}
      <div
        className="relative"
        style={{ width: 18, height: 18 }}
      >
        {/* Upper arm (cylinder-like) */}
        <div
          className="absolute"
          style={{
            left: 7,
            top: 1,
            width: 6,
            height: 12,
            borderRadius: 9999,
            background: "#d97706", // amber-600
            boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
          }}
        />

        {/* Small elbow nub */}
        <div
          className="absolute"
          style={{
            left: 6,
            top: 9,
            width: 8,
            height: 6,
            borderRadius: 9999,
            background: "#d97706",
            opacity: 0.9,
          }}
        />

        {/* Tip icon */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: 9,
            top: -2,
            width: 14,
            height: 14,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Icon className="w-3 h-3" strokeWidth={2.2} color="#b45309" />
        </div>
      </div>
    </div>
  );
}
