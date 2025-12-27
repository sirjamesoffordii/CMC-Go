import { Person } from "../../../drizzle/schema";
import { Check } from "lucide-react";
import { trpc } from "../lib/trpc";

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
  // Fetch household if person has one
  const { data: household } = trpc.households.getById.useQuery(
    { id: person.householdId! },
    { 
      enabled: !!person.householdId && person.householdId !== null,
      retry: false,
      onError: (error) => {
        console.error('Error fetching household:', error);
      }
    }
  );
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
        {person.name || person.personId || 'Person'}
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
          {!need.isActive && (
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" strokeWidth={3} />
              Need Met
            </div>
          )}
        </div>
      )}
      
      {/* Family & Guests */}
      {(person.householdId || person.spouseAttending || (person.childrenCount && person.childrenCount > 0) || (person.guestsCount && person.guestsCount > 0) || 
        (person.kids && parseInt(person.kids) > 0) || (person.guests && parseInt(person.guests) > 0)) && (
        <div className="mb-2 space-y-1">
          <div className="text-xs font-semibold text-gray-700">Family & Guests:</div>
          {person.householdId && household ? (
            // Show household counts
            <>
              {household.childrenCount > 0 && (
                <div className="text-xs text-gray-600">
                  Children: <span className="font-medium">{household.childrenCount}</span>
                </div>
              )}
              {household.guestsCount > 0 && (
                <div className="text-xs text-gray-600">
                  Guests: <span className="font-medium">{household.guestsCount}</span>
                </div>
              )}
            </>
          ) : (
            // Fallback to person counts (for backwards compatibility)
            <>
              {person.spouseAttending && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Check className="w-3 h-3 text-gray-600" strokeWidth={3} />
                  Spouse attending
                </div>
              )}
              {(person.childrenCount && person.childrenCount > 0) && (
                <div className="text-xs text-gray-600">
                  Children: <span className="font-medium">{person.childrenCount}</span>
                </div>
              )}
              {(person.guestsCount && person.guestsCount > 0) && (
                <div className="text-xs text-gray-600">
                  Guests: <span className="font-medium">{person.guestsCount}</span>
                </div>
              )}
              {/* Legacy fields for backwards compatibility */}
              {!person.childrenCount && person.kids && parseInt(person.kids) > 0 && (
                <div className="text-xs text-gray-600">
                  Children: <span className="font-medium">{person.kids}</span>
                </div>
              )}
              {!person.guestsCount && person.guests && parseInt(person.guests) > 0 && (
                <div className="text-xs text-gray-600">
                  Guests: <span className="font-medium">{person.guests}</span>
                </div>
              )}
            </>
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

