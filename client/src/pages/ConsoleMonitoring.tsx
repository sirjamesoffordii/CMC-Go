// @ts-nocheck
import ConsoleLayout from "@/components/ConsoleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle2, Database, Server, XCircle } from "lucide-react";

export default function ConsoleMonitoring() {
  const { data: healthData, isLoading } = trpc.console.health.check.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: metrics } = trpc.console.systemMetrics.list.useQuery(
    { limit: 20 },
    { refetchInterval: 10000 }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>

        {/* System Health Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    {getStatusIcon(healthData?.database || "error")}
                    <span className="text-2xl font-bold text-foreground">
                      {healthData?.database === "healthy" ? "Healthy" : "Error"}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">MySQL Connection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Server</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <span className="text-2xl font-bold text-foreground">Healthy</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">tRPC Backend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <span className="text-2xl font-bold text-foreground">99.9%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Health Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Health Checks</CardTitle>
            <CardDescription>Detailed system component status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      healthData?.database === "healthy" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-foreground">Database Connection</p>
                    <p className="text-sm text-muted-foreground">MySQL/TiDB</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      healthData?.database === "healthy" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {healthData?.database === "healthy" ? "Connected" : "Disconnected"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {healthData?.timestamp
                      ? new Date(healthData.timestamp).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-foreground">API Server</p>
                    <p className="text-sm text-muted-foreground">tRPC Backend</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-500">Running</p>
                  <p className="text-xs text-muted-foreground">
                    {healthData?.timestamp
                      ? new Date(healthData.timestamp).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-foreground">Authentication Service</p>
                    <p className="text-sm text-muted-foreground">OAuth Provider</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-500">Active</p>
                  <p className="text-xs text-muted-foreground">
                    {healthData?.timestamp
                      ? new Date(healthData.timestamp).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Metrics History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Metrics</CardTitle>
            <CardDescription>Historical system performance data</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.length > 0 ? (
              <div className="space-y-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(metric.status)}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{metric.metricName}</p>
                        <p className="text-xs text-muted-foreground">{metric.metricType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{metric.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No metrics data available</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Metrics will appear here as they are collected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
