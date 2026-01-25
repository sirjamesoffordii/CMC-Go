import Papa from "papaparse";

/**
 * Exports data to CSV and triggers a browser download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  // Generate CSV using papaparse
  const csv = Papa.unparse(data);

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Formats a date as YYYY-MM-DD for use in filenames
 */
export function formatDateForFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
