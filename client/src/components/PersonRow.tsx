import { Person } from "../../../drizzle/schema";
import { StickyNote, DollarSign, Pencil, CircleDollarSign } from "lucide-react";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { toast } from "sonner";

interface PersonRowProps {
  person: Person;
  onStatusChange: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
  onClick: (person: Person) => void;
  hasNotes?: boolean;
  hasNeeds?: boolean;
  onPersonUpdate: () => void;
  /** When false, status click is disabled and cursor shows not-allowed */
  canInteract?: boolean;
}

// Universal response language for editing
const STATUS_COLORS = {
  Yes: "bg-emerald-700",
  Maybe: "bg-yellow-600",
  No: "bg-red-700",
  "Not Invited": "bg-slate-500",
};

const STATUS_CYCLE: Array<"Yes" | "Maybe" | "No" | "Not Invited"> = [
  "Not Invited",
  "Maybe",
  "Yes",
  "No",
];

export function PersonRow({
  person,
  onStatusChange,
  onClick,
  hasNotes,
  hasNeeds,
  onPersonUpdate,
  canInteract = true,
}: PersonRowProps) {
  const { isAuthenticated: _isAuthenticated } = usePublicAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [_isEditingName, setIsEditingName] = useState(false);
  const utils = trpc.useUtils();

  const updatePersonName = trpc.people.updateName.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.people.getNational.invalidate();
      onPersonUpdate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rename person");
    },
  });

  const updateDepositPaid = trpc.people.update.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.people.getNational.invalidate();
      onPersonUpdate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update deposit status");
    },
  });

  const handleDepositToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateDepositPaid.mutate({
      personId: person.personId,
      depositPaid: !person.depositPaid,
    });
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.personId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canInteract) return;
    const currentIndex = STATUS_CYCLE.indexOf(person.status || "Not Invited");
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onStatusChange(person.personId, nextStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 bg-slate-50 rounded-lg border transition-all duration-200 group relative ${
        canInteract
          ? "hover:bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"
          : "cursor-not-allowed"
      } ${
        person.depositPaid
          ? "border-emerald-400 ring-2 ring-emerald-300/50 shadow-emerald-100"
          : "border-slate-200"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Bar - Compact - NOT draggable, only clickable */}
      <div
        className={`w-1.5 h-8 rounded-l flex-shrink-0 ${STATUS_COLORS[person.status || "Not Invited"]} transition-all ${canInteract ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed"}`}
        onClick={handleStatusClick}
        title={
          canInteract
            ? `Click to cycle status (current: ${person.status || "Not Invited"})`
            : "You don't have permission to edit"
        }
      />

      {/* Person Info - Compact - Draggable area */}
      <div
        className="flex-1 py-1.5 pr-2 min-w-0"
        onClick={() => onClick(person)}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
            {person.name ? (
              <EditableText
                value={person.name}
                onSave={newName => {
                  updatePersonName.mutate({
                    personId: person.personId,
                    name: newName,
                  });
                }}
                className="text-xs font-medium text-slate-800"
                inputClassName="text-xs font-medium text-slate-800 w-full"
              />
            ) : (
              <span className="text-xs font-medium text-slate-400">—</span>
            )}
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {hasNotes && <StickyNote className="h-3 w-3 text-slate-600" />}
            {hasNeeds && <DollarSign className="h-3 w-3 text-yellow-600" />}
            {/* Deposit Paid indicator - always visible when paid, toggle on hover */}
            {(person.depositPaid || isHovered) && (
              <button
                onClick={handleDepositToggle}
                className={`h-3.5 w-3.5 transition-colors ${
                  person.depositPaid
                    ? "text-emerald-500 hover:text-emerald-700"
                    : "text-slate-400 hover:text-emerald-500"
                }`}
                title={
                  person.depositPaid
                    ? "Deposit paid - click to mark unpaid"
                    : "Click to mark deposit as paid"
                }
                disabled={updateDepositPaid.isPending}
              >
                <CircleDollarSign className="h-3 w-3" />
              </button>
            )}
            {isHovered && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
                className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Edit name"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {person.primaryRole && (
          <span className="text-[10px] text-slate-500 leading-tight truncate">
            {person.primaryRole}
          </span>
        )}
      </div>
    </div>
  );
}
