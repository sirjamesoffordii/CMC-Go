import ConsoleLayout from "@/components/ConsoleLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Database, Play, Table } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConsoleDatabase() {
  const [query, setQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const commonQueries = [
    {
      name: "List all users",
      query: "SELECT * FROM users ORDER BY createdAt DESC LIMIT 10;",
    },
    {
      name: "Count users by role",
      query: "SELECT role, COUNT(*) as count FROM users GROUP BY role;",
    },
    {
      name: "Recent activity logs",
      query: "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;",
    },
    {
      name: "System metrics summary",
      query:
        "SELECT metricType, COUNT(*) as count FROM system_metrics GROUP BY metricType;",
    },
  ];

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setIsExecuting(true);
    setResults(null);

    try {
      // Note: This is a placeholder. In a real implementation, you would call a backend API
      // that safely executes queries with proper validation and security measures
      toast.info("Query execution feature coming soon");

      // Simulated response for demonstration
      setResults({
        success: true,
        message:
          "Query execution is not yet implemented. This feature requires backend integration with proper security measures.",
        rowCount: 0,
        executionTime: "0ms",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Query failed: ${errorMessage}`);
      setResults({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Database Explorer
          </h1>
          <p className="mt-2 text-muted-foreground">
            Execute SQL queries and explore database schema
          </p>
        </div>

        {/* Warning Banner */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <Database className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Database Access Warning
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Direct database access should be used with caution. Always
                  test queries in a development environment first. Write
                  operations cannot be undone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schema Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              Database Schema
            </CardTitle>
            <CardDescription>
              Available tables and their structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "users",
                  description: "User accounts and authentication data",
                  columns:
                    "id, openId, name, email, role, createdAt, updatedAt, lastSignedIn",
                },
                {
                  name: "activity_logs",
                  description: "System activity and audit trail",
                  columns:
                    "id, userId, action, resource, details, ipAddress, userAgent, created_at",
                },
                {
                  name: "api_endpoints",
                  description: "Registered API endpoints",
                  columns:
                    "id, method, path, description, isPublic, createdAt, updatedAt",
                },
                {
                  name: "system_metrics",
                  description: "System health and performance metrics",
                  columns:
                    "id, metricType, metricName, value, status, createdAt",
                },
              ].map(table => (
                <div
                  key={table.name}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <code className="text-sm font-semibold text-primary">
                        {table.name}
                      </code>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {table.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Columns: {table.columns}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Query Builder */}
        <Card>
          <CardHeader>
            <CardTitle>SQL Query Builder</CardTitle>
            <CardDescription>
              Write and execute custom SQL queries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="SELECT * FROM users WHERE role = 'admin';"
                value={query}
                onChange={e => setQuery(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleExecuteQuery}
              disabled={isExecuting}
              className="w-full"
            >
              {isExecuting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Query
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Query Results</CardTitle>
              <CardDescription>
                {results.success
                  ? "Query executed successfully"
                  : "Query execution failed"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm text-foreground">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Common Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Common Queries</CardTitle>
            <CardDescription>Frequently used database queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonQueries.map((cq, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{cq.name}</p>
                      <code className="mt-2 block text-xs text-muted-foreground">
                        {cq.query}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery(cq.query)}
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
