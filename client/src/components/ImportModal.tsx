import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVRow {
  name: string;
  campus?: string;
  district?: string;
  role?: string;
  status?: "Yes" | "Maybe" | "No" | "Not Invited";
  notes?: string;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const importMutation = trpc.people.importCSV.useMutation({
    onSuccess: data => {
      setResults(data);
      setImporting(false);
      // Refresh all data
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.districts.list.invalidate();
      utils.campuses.list.invalidate();
      utils.followUp.list.invalidate();
      utils.people.getNational.invalidate();
    },
    onError: error => {
      console.error("Import failed:", error);
      setImporting(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResults(null);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const rows = result.data as Record<string, string>[];
        const mapped: CSVRow[] = rows
          .map(row => ({
            name: row.name || row.Name || "",
            campus: row.campus || row.Campus || undefined,
            district: row.district || row.District || undefined,
            role: row.role || row.Role || undefined,
            status: (row.status || row.Status) as CSVRow["status"],
            notes: row.notes || row.Notes || undefined,
          }))
          .filter(row => row.name); // Filter out rows without names

        setParsedData(mapped);
      },
      error: error => {
        console.error("CSV parse error:", error);
      },
    });
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    importMutation.mutate({ rows: parsedData });
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with contacts. Required: <strong>name</strong>.
            Optional: campus, district, role, status, notes.
            <br />• <strong>Campus + District:</strong> Campus-level assignment
            <br />• <strong>District only (no campus):</strong> District-level
            (appears in "No Campus Assigned" column)
            <br />• <strong>No district/campus:</strong> National-level
            assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          {!file && !results && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Click to upload or drag and drop a CSV file
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" />
                Select CSV File
              </Button>
            </div>
          )}

          {/* Preview */}
          {file && parsedData.length > 0 && !results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({parsedData.length} contacts)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Campus</th>
                        <th className="text-left p-2 font-medium">District</th>
                        <th className="text-left p-2 font-medium">Role</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-muted-foreground">
                            {row.campus || <em>National</em>}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {row.district || <em>National</em>}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {row.role || "-"}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {row.status || "Not Invited"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                    ... and {parsedData.length - 10} more
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : "Import Contacts"}
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{results.imported}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{results.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <X className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold">
                    {results.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-medium mb-2">Errors:</h4>
                  <ul className="space-y-1 text-sm">
                    {results.errors.map((error, i) => (
                      <li key={i} className="text-red-600">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
