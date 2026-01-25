import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  success: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  totalRows: number;
  errors: ImportError[];
}

export default function Import() {
  const { user, isAuthenticated: _isAuthenticated, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Check if user is a leader
  const isLeader =
    user &&
    [
      "CO_DIRECTOR",
      "CAMPUS_DIRECTOR",
      "DISTRICT_DIRECTOR",
      "REGION_DIRECTOR",
      "ADMIN",
    ].includes(user.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication disabled - allow all users to import
  if (false) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only leaders can import data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = event => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error("Please select a CSV file");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response = await fetch("/api/import/people", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          "X-File-Name": file?.name || "import.csv",
        },
        credentials: "include",
        body: csvText,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const data: ImportResult = await response.json();
      setResult(data);

      if (data.errorCount === 0) {
        toast.success(
          `Import completed: ${data.createdCount} created, ${data.updatedCount} updated`
        );
      } else {
        toast.warning(`Import completed with ${data.errorCount} errors`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!result || result.errors.length === 0) return;

    const errorsCsv = Papa.unparse(
      result.errors.map(e => ({
        Row: e.row,
        Error: e.message,
      }))
    );

    const blob = new Blob([errorsCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Import People from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file to import or update people. The import is
            idempotent - re-importing the same file won't create duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={importing}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          {/* CSV Preview */}
          {csvText && (
            <div className="space-y-2">
              <Label>CSV Preview (first 5 rows)</Label>
              <Textarea
                value={csvText.split("\n").slice(0, 6).join("\n")}
                readOnly
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!csvText.trim() || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {result.createdCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {result.updatedCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Updated
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {result.skippedCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Skipped
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {result.errorCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Errors
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Errors Table */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Errors ({result.errors.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadErrorsCsv}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Errors CSV
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Row
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((error, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 font-mono">{error.row}</td>
                            <td className="px-4 py-2 text-red-600">
                              {error.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-semibold">CSV Format</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Required columns:</p>
              <ul className="list-disc list-inside ml-2">
                <li>
                  <code>name</code> - Person's full name (required)
                </li>
              </ul>
              <p className="mt-2">Optional columns:</p>
              <ul className="list-disc list-inside ml-2">
                <li>
                  <code>email</code> - Email address (for matching)
                </li>
                <li>
                  <code>phone</code> - Phone number (for matching)
                </li>
                <li>
                  <code>campusId</code> - Campus ID (number)
                </li>
                <li>
                  <code>districtId</code> - District ID (string)
                </li>
                <li>
                  <code>regionId</code> - Region ID (string)
                </li>
                <li>
                  <code>status</code> - Status: Yes, Maybe, No, or Not Invited
                </li>
              </ul>
              <p className="mt-2 text-xs">
                Note: Import respects your permission scope. You can only import
                people within your allowed campus/district/region.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
