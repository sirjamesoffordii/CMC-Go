export type PersonStatus = "Yes" | "Maybe" | "No" | "Not Invited";

export function formatStatusLabel(status?: PersonStatus | null) {
  if (!status) return "";
  return status === "Not Invited" ? "Not Invited Yet" : status;
}
