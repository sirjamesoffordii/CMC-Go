import ConsoleLayout from "@/components/ConsoleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Database, Shield, Server, Key } from "lucide-react";

export default function ConsoleConfig() {
  const configSections = [
    {
      title: "Database Configuration",
      icon: Database,
      items: [
        { key: "DATABASE_URL", value: "••••••••", description: "MySQL/TiDB connection string" },
      ],
    },
    {
      title: "Authentication",
      icon: Shield,
      items: [
        { key: "JWT_SECRET", value: "••••••••", description: "Session cookie signing secret" },
        { key: "OAUTH_SERVER_URL", value: "https://api.manus.im", description: "OAuth backend URL" },
        { key: "VITE_OAUTH_PORTAL_URL", value: "https://manus.im", description: "Login portal URL" },
      ],
    },
    {
      title: "Application Settings",
      icon: Server,
      items: [
        { key: "VITE_APP_ID", value: "cmc-go-m3", description: "Application identifier" },
        { key: "VITE_APP_TITLE", value: "CMC Go m3", description: "Application title" },
      ],
    },
    {
      title: "API Keys",
      icon: Key,
      items: [
        { key: "BUILT_IN_FORGE_API_KEY", value: "••••••••", description: "Server-side API key" },
        { key: "VITE_FRONTEND_FORGE_API_KEY", value: "••••••••", description: "Frontend API key" },
      ],
    },
  ];

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuration</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage system configuration and environment variables
          </p>
        </div>

        {/* Warning Banner */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <Settings className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Configuration Management</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Environment variables are managed by the Manus platform. Sensitive values are
                  masked for security. To modify configuration, use the Manus Management UI Settings
                  panel.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        {configSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>System configuration variables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <code className="text-sm font-semibold text-primary">{item.key}</code>
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <code className="ml-4 rounded bg-muted px-2 py-1 text-xs text-foreground">
                          {item.value}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              System Information
            </CardTitle>
            <CardDescription>Runtime environment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Node.js Version", value: "22.13.0" },
                { label: "Framework", value: "React 19 + tRPC 11 + Express 4" },
                { label: "Database", value: "MySQL/TiDB" },
                { label: "Authentication", value: "Manus OAuth" },
                { label: "Deployment", value: "Manus Platform" },
              ].map((info) => (
                <div
                  key={info.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <span className="text-sm text-muted-foreground">{info.label}</span>
                  <span className="text-sm font-medium text-foreground">{info.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
