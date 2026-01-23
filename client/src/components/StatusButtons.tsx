import { Person } from "../../../drizzle/schema";
import { toast } from "sonner";

interface StatusButtonsProps {
  person: Person;
  onStatusChange: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited",
    previousStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
}

const STATUS_COLORS = {
  Yes: "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900",
  Maybe: "bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800",
  No: "bg-red-700 hover:bg-red-800 active:bg-red-900",
  "Not Invited": "bg-slate-500 hover:bg-slate-600 active:bg-slate-700",
};

export function StatusButtons({ person, onStatusChange }: StatusButtonsProps) {
  const currentStatus = person.status || "Not Invited";

  const handleStatusClick = (
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => {
    if (newStatus === currentStatus) return;

    const previousStatus = currentStatus;

    // Update the status immediately
    onStatusChange(person.personId, newStatus, previousStatus);

    // Show toast with undo option
    toast.success(`Status updated to ${newStatus}`, {
      action: {
        label: "Undo",
        onClick: () => {
          onStatusChange(person.personId, previousStatus, newStatus);
        },
      },
      duration: 5000,
    });
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      {(["Yes", "Maybe", "No", "Not Invited"] as const).map(status => (
        <button
          key={status}
          onClick={e => {
            e.stopPropagation();
            handleStatusClick(status);
          }}
          className={`
            min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-white text-xs font-medium
            transition-all duration-200 touch-manipulation
            ${STATUS_COLORS[status]}
            ${
              currentStatus === status
                ? "ring-2 ring-offset-2 ring-slate-900"
                : ""
            }
          `}
          title={`Set status to ${status}`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
