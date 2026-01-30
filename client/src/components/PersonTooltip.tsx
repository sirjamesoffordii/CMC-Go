// @ts-nocheck
import { Person } from "../../../drizzle/schema";
import { Check } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "../lib/trpc";
import { createPortal } from "react-dom";

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
      onError: error => {
        console.error("Error fetching household:", error);
      },
    }
  );
  // Fetch all people to get household members
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const tooltipContent = (
    <div
      className="fixed z-[99999] bg-white backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/80 p-4 pointer-events-none tooltip-animate min-w-[280px] max-w-[400px]"
      style={{
        left: position.x + 15,
        top: position.y,
        transform: "translateY(-50%)",
      }}
    >
      <div className="space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-2">
          <div className="border-b border-slate-200 pb-1">
            <h3 className="text-xs font-semibold text-slate-700">
              Basic Information
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="space-y-2">
              <div className="text-slate-600 text-xs font-medium">Name</div>
              <div className="font-semibold text-slate-900">
                {person.name || person.personId || "Person"}
              </div>
            </div>
            {person.primaryRole && (
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium">Role</div>
                <div className="font-medium text-slate-900">
                  {person.primaryRole}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-slate-600 text-xs font-medium">Status</div>
              <div className="font-medium text-slate-900">
                {person.status === "Yes"
                  ? "Going"
                  : person.status === "Maybe"
                    ? "Maybe"
                    : person.status === "No"
                      ? "Not Going"
                      : "Not Invited Yet"}
              </div>
            </div>
          </div>
        </div>

        {/* Family & Guests Section */}
        {(person.householdId ||
          person.spouseAttending ||
          (person.childrenCount && person.childrenCount > 0) ||
          (person.guestsCount && person.guestsCount > 0) ||
          (person.kids && parseInt(person.kids, 10) > 0) ||
          (person.guests && parseInt(person.guests, 10) > 0)) && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h3 className="text-xs font-semibold text-slate-700">
                Family & Guests
              </h3>
            </div>
            {person.householdId && household && (
              <div className="text-xs mb-2">
                <span className="text-slate-600">Household: </span>
                <span className="font-medium text-slate-900 italic">
                  {household.label ||
                    (() => {
                      const members = allPeople.filter(
                        (p: any) => p.householdId === household.id
                      );
                      return members.length > 0
                        ? `${members[0].name?.split(" ").pop() || "Household"} Household`
                        : "Household";
                    })()}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium">
                  Spouse Attending
                </div>
                <div className="font-medium text-slate-900">
                  {person.spouseAttending ? (
                    <Check
                      className="w-3 h-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium">
                  Children
                </div>
                <div className="font-medium text-slate-900">
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
                <div className="text-slate-600 text-xs font-medium">Guests</div>
                <div className="font-medium text-slate-900">
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

        {/* Request Section */}
        {need && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h3 className="text-xs font-semibold text-slate-700">Request</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium">
                  Request
                </div>
                <div
                  className={`font-medium ${need.isActive ? "text-slate-900" : "text-slate-500 line-through"}`}
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
                <div className="text-slate-600 text-xs font-medium">Amount</div>
                <div
                  className={`font-medium ${need.isActive ? "text-slate-900" : "text-slate-500 line-through"}`}
                >
                  {need.amount ? (
                    `$${(need.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-600 text-xs font-medium">
                  Request Met
                </div>
                <div className="font-medium text-slate-900">
                  {!need.isActive ? (
                    <Check
                      className="w-3 h-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            </div>
            {need.description && (
              <div className="col-span-3 space-y-2 mt-2">
                <div className="text-slate-600 text-xs font-medium">
                  Request Notes
                </div>
                <div
                  className={`text-xs text-slate-700 ${need.isActive ? "" : "line-through text-slate-400"}`}
                >
                  {need.description}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Information Section */}
        {(person.notes || person.depositPaid) && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h3 className="text-xs font-semibold text-slate-700">
                Additional Information
              </h3>
            </div>
            {person.notes && (
              <div className="space-y-2 text-xs mb-3">
                <div className="text-slate-600 text-xs font-medium">
                  Journey Note
                </div>
                <div className="text-slate-700">{person.notes}</div>
              </div>
            )}
            {person.depositPaid && (
              <div className="flex items-center gap-2 text-xs">
                <Checkbox checked={true} disabled className="h-3.5 w-3.5" />
                <span className="text-slate-700">Deposit Paid</span>
              </div>
            )}
          </div>
        )}

        {/* No Additional Info - shown when there's no content */}
        {!need &&
          !(
            person.householdId ||
            person.spouseAttending ||
            (person.childrenCount && person.childrenCount > 0) ||
            (person.guestsCount && person.guestsCount > 0) ||
            (person.kids && parseInt(person.kids, 10) > 0) ||
            (person.guests && parseInt(person.guests, 10) > 0)
          ) &&
          !person.notes &&
          !person.depositPaid && (
            <div className="text-xs text-gray-400 italic">
              no additional info
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
