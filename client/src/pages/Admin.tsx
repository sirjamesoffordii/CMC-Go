// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Users,
  Database,
  Settings,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const allUsers = trpc.admin.getAllUsers.useQuery();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Please sign in to access this page
        </p>
      </div>
    );
  }

  // Temporarily allow all users to access admin console

  const adminStats = [
    {
      title: "Total Users",
      value: allUsers.data?.length.toString() || "0",
      description: "Registered accounts",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Admin Users",
      value:
        allUsers.data?.filter(u => u.role === "admin").length.toString() || "0",
      description: "Administrator accounts",
      icon: Shield,
      color: "text-purple-600",
    },
    {
      title: "Database",
      value: "Connected",
      description: "System status",
      icon: Database,
      color: "text-green-600",
    },
    {
      title: "Settings",
      value: "Active",
      description: "Configuration status",
      icon: Settings,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="container max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col gap-5 sm:gap-8">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="mr-1 sm:mr-2 text-black hover:bg-red-600 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Admin Panel
            </h1>
            <Badge variant="default" className="h-6">
              Admin
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage users, settings, and system configuration
          </p>
        </div>

        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          {adminStats.map(stat => (
            <Card
              key={stat.title}
              className="transition-all hover:shadow-elegant-md"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage all registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allUsers.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allUsers.error ? (
              <div className="text-center py-8 text-destructive">
                Failed to load users: {allUsers.error.message}
              </div>
            ) : (
              <div className="space-y-3">
                {allUsers.data?.map(u => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border hover:bg-accent/50 transition-colors gap-1 sm:gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {u.name || "Unnamed User"}
                        </p>
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className="h-5 text-xs"
                        >
                          {u.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email || "No email"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      <span>ID: {u.id}</span>
                      <span>·</span>
                      <span>
                        Joined{" "}
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Actions</CardTitle>
            <CardDescription>
              Administrative tools and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Database Backup</p>
                <p className="text-xs text-muted-foreground">
                  Create a backup of the database
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Feature coming soon")}
              >
                Backup
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">System Logs</p>
                <p className="text-xs text-muted-foreground">
                  View application logs
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Feature coming soon")}
              >
                View Logs
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Configuration</p>
                <p className="text-xs text-muted-foreground">
                  Manage system settings
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Feature coming soon")}
              >
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
