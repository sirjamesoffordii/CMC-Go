import { Person } from "../../../drizzle/schema";
import { Check, Edit2 } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "../lib/trpc";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useIsMobile";

interface PersonTooltipProps {
  person: Person;
  need?: {
    type: string;
    description: string;
    amount?: number | null;
    fundsReceived?: number | null;
    isActive: boolean;
  } | null;
  position: { x: number; y: number };
  centered?: boolean;
  /** When provided, shows an Edit button that calls this on click */
  onEdit?: () => void;
}

export function PersonTooltip({
  person,
  need,
  position,
  centered = false,
  onEdit,
}: PersonTooltipProps) {
  const isMobile = useIsMobile();
  // Fetch household if person has one
  const { data: household } = trpc.households.getById.useQuery(
    { id: person.householdId! },
    {
      enabled: !!person.householdId && person.householdId !== null,
      retry: false,
    }
  );
  // Fetch all people to get household members
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const hasFamilyGuestInfo =
    person.spouseAttending ||
    (person.childrenCount != null && person.childrenCount > 0) ||
    (person.guestsCount != null && person.guestsCount > 0) ||
    (person.kids && parseInt(person.kids, 10) > 0) ||
    (person.guests && parseInt(person.guests, 10) > 0);

  const hasNotes = !!(person.notes || (need && need.description));

  // When centered with edit (click from district view): position over map area.
  // On mobile, map is top 45dvh when drawer is open — center tooltip at 22.5dvh.
  // On desktop, use viewport center (map is typically in center).
  const centeredTop =
    centered && isMobile ? "22.5dvh" : centered ? "50%" : undefined;

  const tooltipContent = (
    <div
      className={`fixed z-[99999] bg-white backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/80 p-4 tooltip-animate min-w-[200px] sm:min-w-[280px] max-w-[calc(100vw-32px)] sm:max-w-[400px] max-h-[calc(100dvh-32px)] overflow-y-auto ${onEdit ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        left: centered ? "50%" : position.x + 15,
        top: centered ? centeredTop : position.y,
        transform: centered ? "translate(-50%, -50%)" : "translateY(-50%)",
      }}
    >
      <div className="space-y-4">
        {/* Family & Guests Section - only when there is actual attendance info */}
        {hasFamilyGuestInfo && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1" />
            {person.householdId && household && (
              <div className="text-xs mb-2">
                <span className="font-medium text-slate-900 italic">
                  {(() => {
                    const label =
                      household.label ||
                      (() => {
                        const members = allPeople.filter(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (p: any) => p.householdId === household.id
                        );
                        return members.length > 0
                          ? `${members[0].name?.split(" ").pop() || "Household"} Household`
                          : "Household";
                      })();
                    return label.endsWith(" Household")
                      ? label
                      : `${label} Household`;
                  })()}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Spouse Attending
                </div>
                <div className="font-medium text-slate-900 flex justify-center">
                  {person.spouseAttending ? (
                    <Check
                      className="w-3 h-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  ) : (
                    <Checkbox
                      checked={false}
                      disabled
                      className="h-3.5 w-3.5 border-slate-400"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Children
                </div>
                <div className="font-medium text-slate-900 text-center">
                  {(person.householdId &&
                    household &&
                    household.childrenCount > 0) ||
                  (!person.householdId &&
                    person.childrenCount &&
                    person.childrenCount > 0) ||
                  (!person.childrenCount &&
                    person.kids &&
                    parseInt(person.kids, 10) > 0) ? (
                    person.householdId && household ? (
                      household.childrenCount
                    ) : (
                      person.childrenCount ||
                      (person.kids ? parseInt(person.kids, 10) : 0)
                    )
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Guests
                </div>
                <div className="font-medium text-slate-900 text-center">
                  {(person.householdId &&
                    household &&
                    household.guestsCount > 0) ||
                  (!person.householdId &&
                    person.guestsCount &&
                    person.guestsCount > 0) ||
                  (!person.guestsCount &&
                    person.guests &&
                    parseInt(person.guests, 10) > 0) ? (
                    person.householdId && household ? (
                      household.guestsCount
                    ) : (
                      person.guestsCount ||
                      (person.guests ? parseInt(person.guests, 10) : 0)
                    )
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Needs Section (no category title) */}
        {need && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1" />
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Need
                </div>
                <div
                  className={`font-medium text-center ${need.isActive ? "text-slate-900" : "text-slate-500 line-through"}`}
                >
                  {need.type}
                  {!need.isActive && (
                    <Check
                      className="w-3 h-3 text-emerald-600 inline ml-1"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Funds Needed
                </div>
                <div
                  className={`font-medium text-center ${need.isActive ? "text-slate-900" : "text-slate-500 line-through"}`}
                >
                  {need.amount ? (
                    `$${(need.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Funds Received
                </div>
                <div
                  className={`font-medium text-center ${need.fundsReceived ? "text-slate-900" : "text-slate-400"}`}
                >
                  {need.fundsReceived ? (
                    `$${(need.fundsReceived / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium text-center">
                  Needs Met
                </div>
                <div className="font-medium text-slate-900 flex justify-center">
                  {!need.isActive ? (
                    <Check
                      className="w-3 h-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  ) : (
                    <Checkbox
                      checked={false}
                      disabled
                      className="h-3.5 w-3.5 border-slate-400"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes - combined need note + journey notes, single label for space */}
        {hasNotes && (
          <div className="space-y-1">
            <div className="border-b border-slate-200 pb-1" />
            <div className="text-slate-600 text-xs font-medium">Notes</div>
            <div className="text-slate-700 text-xs space-y-1 min-w-0">
              {need && need.description && (
                <div
                  className={need.isActive ? "" : "line-through text-slate-400"}
                >
                  {need.description}
                </div>
              )}
              {person.notes && <div>{person.notes}</div>}
            </div>
          </div>
        )}

        {/* Deposit paid - only show when paid */}
        {person.depositPaid && (
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-700">Deposit paid</span>
              <Checkbox
                checked
                disabled
                className="h-3.5 w-3.5 border-slate-400 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        )}

        {/* Nothing to show - when no family/guest info, no need, no notes, and deposit not paid */}
        {!need && !hasFamilyGuestInfo && !hasNotes && !person.depositPaid && (
          <div className="text-xs text-slate-400 italic">nothing to show</div>
        )}

        {/* Edit button - when onEdit is provided (e.g. name click in district view) */}
        {onEdit && (
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render tooltip at document body level to avoid z-index stacking context issues
  if (typeof document !== "undefined") {
    return createPortal(tooltipContent, document.body);
  }

  return tooltipContent;
}
