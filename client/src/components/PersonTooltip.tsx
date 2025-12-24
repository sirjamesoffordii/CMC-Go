import { Person } from "../../../drizzle/schema";
import { Check } from "lucide-react";

interface PersonTooltipProps {
  person: Person;
  need?: {
    type: string;
    description: string;
    amount?: number | null;
    isActive: boolean;
  } | null;
  position: { x: number; y: number };
}

export function PersonTooltip({ person, need, position }: PersonTooltipProps) {
  return (
    <div
      className="fixed z-50 bg-white backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/80 p-3 pointer-events-none tooltip-animate min-w-[200px] max-w-[300px]"
      style={{
        left: position.x + 15,
        top: position.y + 15,
      }}
    >
      {/* Person Name */}
      <div className="text-sm font-semibold text-gray-800 mb-2">
        {person.name}
      </div>
      
      {/* Need Information */}
      {need && (
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">Need:</span>
            <span className={`font-medium ${need.isActive ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
              {need.type}
            </span>
            {!need.isActive && (
              <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" strokeWidth={3} />
            )}
          </div>
          {need.amount && (
            <div className="text-xs text-gray-600 mt-1">
              Amount: <span className={`font-medium ${need.isActive ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                ${(need.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {need.description && need.type !== 'Financial' && (
            <div className={`text-xs mt-1 ${need.isActive ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
              {need.description}
            </div>
          )}
        </div>
      )}
      
      {/* Notes */}
      {person.notes && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-1">Notes:</div>
          <div className="text-xs text-gray-800 line-clamp-3">{person.notes}</div>
        </div>
      )}
      
      {/* Deposit Paid */}
      {person.depositPaid && (
        <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
          <Check className="w-3 h-3" strokeWidth={3} />
          Deposit Paid
        </div>
      )}
    </div>
  );
}

