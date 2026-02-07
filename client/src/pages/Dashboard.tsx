import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Shield, Clock } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: "Account Status",
      value: "Active",
      description: "Your account is in good standing",
      icon: Activity,
      color: "text-green-600",
    },
    {
      title: "Role",
      value: user?.role === "admin" ? "Administrator" : "User",
      description: "Current access level",
      icon: Shield,
      color: "text-blue-600",
    },
    {
      title: "Member Since",
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        : "-",
      description: "Account creation date",
      icon: Clock,
      color: "text-purple-600",
    },
    {
      title: "Profile",
      value: user?.name || "Not set",
      description: "Display name",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="container max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col gap-5 sm:gap-8">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            {user?.role === "admin" && (
              <Badge variant="default" className="h-6">
                Admin
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Here's an overview of your account and activity
          </p>
        </div>

        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
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

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Update Profile</p>
                  <p className="text-xs text-muted-foreground">
                    Manage your account information
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">View Activity</p>
                  <p className="text-xs text-muted-foreground">
                    Check recent account activity
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">
                    Configure your preferences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your current account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">
                  {user?.email || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Login Method
                </span>
                <span className="text-sm font-medium capitalize">
                  {user?.loginMethod || "OAuth"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Last Sign In
                </span>
                <span className="text-sm font-medium">
                  {user?.lastSignedIn
                    ? new Date(user.lastSignedIn).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Account ID
                </span>
                <span className="text-sm font-medium font-mono">
                  #{user?.id || "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
