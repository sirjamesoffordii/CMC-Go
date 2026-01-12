import ConsoleLayout from "@/components/ConsoleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, Database, Terminal, Users, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Console() {
  const { data: healthData } = trpc.console.health.check.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: users } = trpc.console.users.list.useQuery({ limit: 5 });
  const { data: logs } = trpc.console.activityLogs.list.useQuery({ limit: 5 });

  const quickStats = [
    {
      title: "Total Users",
      value: users?.length || 0,
      icon: Users,
      href: "/console/users",
      color: "text-blue-500",
    },
    {
      title: "Recent Activity",
      value: logs?.length || 0,
      icon: Activity,
      href: "/console/logs",
      color: "text-green-500",
    },
    {
      title: "System Status",
      value: healthData?.database === "healthy" ? "Healthy" : "Error",
      icon: Zap,
      href: "/console/monitoring",
      color: healthData?.database === "healthy" ? "text-green-500" : "text-red-500",
    },
    {
      title: "API Endpoints",
      value: "Active",
      icon: Terminal,
      href: "/console/api",
      color: "text-purple-500",
    },
  ];

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Developer Console</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor and manage your CMC Go platform resources
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <a>
                  <Card className="transition-all hover:border-primary hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            );
          })}
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
            <CardDescription>Real-time system status and health metrics</CardDescription>
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
                    <p className="font-medium text-foreground">Database</p>
                    <p className="text-sm text-muted-foreground">MySQL Connection</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    healthData?.database === "healthy" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {healthData?.database === "healthy" ? "Healthy" : "Error"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-foreground">API Server</p>
                    <p className="text-sm text-muted-foreground">tRPC Backend</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-500">Healthy</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent Users
              </CardTitle>
              <CardDescription>Latest registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {users && users.length > 0 ? (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      {log.resource && (
                        <p className="text-xs text-muted-foreground">{log.resource}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity logs found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common developer tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/console/users">
                <a className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-accent">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Manage Users</span>
                </a>
              </Link>
              <Link href="/console/logs">
                <a className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-accent">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">View Logs</span>
                </a>
              </Link>
              <Link href="/console/api">
                <a className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-accent">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Test APIs</span>
                </a>
              </Link>
              <Link href="/console/database">
                <a className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-accent">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Query Database</span>
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
