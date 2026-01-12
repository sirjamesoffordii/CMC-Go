import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface QueryResultsTableProps {
  data: Array<Record<string, unknown>>;
  executionTime: number;
  onExport: (format: "csv" | "json") => void;
  isExporting?: boolean;
}

export function QueryResultsTable({
  data,
  executionTime,
  onExport,
  isExporting = false,
}: QueryResultsTableProps) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 50;

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No results to display</p>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIdx = page * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageData = data.slice(startIdx, endIdx);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.length}</span> rows returned in{" "}
          <span className="font-semibold text-foreground">{executionTime}ms</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("csv")}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("json")}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-muted/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={`${idx}-${col}`}
                    className="px-4 py-3 text-foreground break-words max-w-xs"
                  >
                    <span className="font-mono text-xs">
                      {formatValue(row[col])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
