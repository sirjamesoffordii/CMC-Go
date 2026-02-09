export type PersonStatus = "Yes" | "Maybe" | "No" | "Not Invited";

const STATUS_DISPLAY_LABELS: Record<PersonStatus, string> = {
  Yes: "Yes",
  Maybe: "Maybe",
  No: "No",
  "Not Invited": "Not Invited Yet",
};

export function formatStatusLabel(status?: PersonStatus | null) {
  if (!status) return "";
  return STATUS_DISPLAY_LABELS[status] ?? status;
}
