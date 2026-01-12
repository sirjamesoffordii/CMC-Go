import ConsoleLayout from "@/components/ConsoleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, Shield, User, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConsoleUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.console.users.list.useQuery({ limit: 100 });
  const { data: searchResults } = trpc.console.users.search.useQuery(
    { searchTerm, limit: 100 },
    { enabled: searchTerm.length > 0 }
  );

  const updateRoleMutation = trpc.console.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      utils.console.users.list.invalidate();
      utils.console.users.search.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const displayUsers = searchTerm.length > 0 ? searchResults : users;

  const handleRoleChange = (userId: number, role: "user" | "admin") => {
    updateRoleMutation.mutate({ userId, role });
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage platform users and their permissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{users?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {users?.filter((u) => u.role === "admin").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Admin accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {users?.filter((u) => u.role === "user").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Standard accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>Find users by name, email, or ID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {searchTerm.length > 0
                ? `Search results for "${searchTerm}"`
                : "All registered users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : displayUsers && displayUsers.length > 0 ? (
              <div className="space-y-3">
                {displayUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>ID: {user.id}</span>
                          <span>•</span>
                          <span>
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            Last login: {new Date(user.lastSignedIn).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as "user" | "admin")
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {user.role === "admin" && (
                        <div className="rounded-full bg-primary/10 px-3 py-1">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UsersIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm.length > 0 ? "No users found" : "No users registered yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
