import ConsoleLayout from "@/components/ConsoleLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Activity, FileText, Search } from "lucide-react";
import { useState } from "react";

export default function ConsoleLogs() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading } = trpc.console.activityLogs.list.useQuery({
    limit: 100,
  });
  const { data: searchResults } = trpc.console.activityLogs.search.useQuery(
    { searchTerm, limit: 100 },
    { enabled: searchTerm.length > 0 }
  );

  const displayLogs = searchTerm.length > 0 ? searchResults : logs;

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes("create")) return "text-green-500";
    if (action.toLowerCase().includes("delete")) return "text-red-500";
    if (action.toLowerCase().includes("update")) return "text-blue-500";
    return "text-foreground";
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
          <p className="mt-2 text-muted-foreground">
            Track system events and user actions across the platform
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {logs?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Logged activities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {logs?.filter(log => {
                  const logDate = new Date(log.createdAt);
                  const today = new Date();
                  return logDate.toDateString() === today.toDateString();
                }).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Events today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {logs?.filter(log => {
                  const logDate = new Date(log.createdAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return logDate >= weekAgo;
                }).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Events this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Logs</CardTitle>
            <CardDescription>
              Filter logs by action, resource, or details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              {searchTerm.length > 0
                ? `Search results for "${searchTerm}"`
                : "Recent system activities"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : displayLogs && displayLogs.length > 0 ? (
              <div className="space-y-3">
                {displayLogs.map(log => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Activity
                            className={`h-4 w-4 ${getActionColor(log.action)}`}
                          />
                          <p
                            className={`font-medium ${getActionColor(log.action)}`}
                          >
                            {log.action}
                          </p>
                        </div>
                        {log.resource && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Resource: {log.resource}
                          </p>
                        )}
                        {log.details && (
                          <p className="mt-1 text-sm text-foreground">
                            {log.details}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                          {log.userId && (
                            <>
                              <span>•</span>
                              <span>User ID: {log.userId}</span>
                            </>
                          )}
                          {log.ipAddress && (
                            <>
                              <span>•</span>
                              <span>IP: {log.ipAddress}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm.length > 0
                    ? "No logs found"
                    : "No activity logs yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Activity logs will appear here as events occur
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
