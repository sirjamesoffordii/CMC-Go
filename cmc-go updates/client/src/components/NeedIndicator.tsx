import { DollarSign, Home, Car, HelpCircle } from "lucide-react";

type NeedType = "Financial" | "Housing" | "Transportation" | "Other" | string;

const NEED_ICON = {
  Financial: DollarSign,
  Housing: Home,
  Transportation: Car,
  Other: null, // Use custom "O" instead of icon
} as const;

/**
 * Visual indicator for person needs.
 *
 * Design intent:
 * - A small icon in a white circle representing the need type.
 * - Icons are positioned upright on the right side of the head.
 */
export function NeedIndicator({ type }: { type?: NeedType | null }) {
  const Icon = (type && (NEED_ICON as any)[type] && (NEED_ICON as any)[type] !== null) 
    ? (NEED_ICON as any)[type] 
    : (type === "Other" ? null : HelpCircle);
  const isOther = type === "Other";

  return (
    <div
      className="absolute top-1 -right-1 z-20 pointer-events-none m-0 p-0"
      style={{ margin: 0, padding: 0 }}
      aria-hidden="true"
      title={type || "Need"}
    >
      {/* Need type icon */}
      <div
        className="flex items-center justify-center m-0 p-0"
        style={{
          width: 13,
          height: 13,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(0,0,0,0.06)",
          margin: 0,
          padding: 0,
        }}
      >
        {isOther ? (
          <span 
            style={{ 
              fontSize: '8px', 
              fontWeight: 'bold', 
              color: '#b45309',
              lineHeight: 1,
              margin: 0,
              padding: 0,
            }}
          >
            O
          </span>
        ) : Icon ? (
          <Icon 
            className="w-3.5 h-3.5" 
            style={{ margin: 0, padding: 0, strokeWidth: 2 }} 
            color="#b45309" 
          />
        ) : (
          <HelpCircle 
            className="w-3.5 h-3.5" 
            style={{ margin: 0, padding: 0, strokeWidth: 2 }} 
            color="#b45309" 
          />
        )}
      </div>
    </div>
  );
}
