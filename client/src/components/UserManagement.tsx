// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Trash2,
  Shield,
  Activity,
  Ban,
  Globe,
  Map,
  MapPin,
  Eye,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

// Authorization level constants
const SCOPE_LEVELS = ["NATIONAL", "REGION", "DISTRICT"] as const;
const VIEW_LEVELS = ["NATIONAL", "REGION", "DISTRICT", "CAMPUS"] as const;
const EDIT_LEVELS = [
  "NATIONAL",
  "XAN",
  "REGION",
  "DISTRICT",
  "CAMPUS",
] as const;

type ScopeLevel = (typeof SCOPE_LEVELS)[number];
type ViewLevel = (typeof VIEW_LEVELS)[number];
type EditLevel = (typeof EDIT_LEVELS)[number];

// Level display labels
const LEVEL_LABELS: Record<string, string> = {
  NATIONAL: "National",
  REGION: "Region",
  DISTRICT: "District",
  CAMPUS: "Campus",
  XAN: "XAN (Nat'l Team)",
};

export function UserManagement() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.admin.users.list.useQuery();
  const { data: activeSessions = [] } =
    trpc.admin.sessions.listActive.useQuery();

  const updateRoleMutation = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      utils.admin.users.list.invalidate();
    },
    onError: error => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.admin.users.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("User status updated");
      utils.admin.users.list.invalidate();
    },
    onError: error => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const updateAuthLevelsMutation =
    trpc.admin.users.updateAuthLevels.useMutation({
      onSuccess: () => {
        toast.success("Authorization levels updated");
        utils.admin.users.list.invalidate();
      },
      onError: error => {
        toast.error(`Failed to update authorization: ${error.message}`);
      },
    });

  const deleteUserMutation = trpc.admin.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted");
      utils.admin.users.list.invalidate();
    },
    onError: error => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const handleDeleteUser = (userId: number, fullName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete user "${fullName}"? This action cannot be undone.`
      )
    ) {
      deleteUserMutation.mutate({ userId });
    }
  };

  const handleRoleChange = (userId: number, role: string) => {
    updateRoleMutation.mutate({
      userId,
      role: role as
        | "STAFF"
        | "CO_DIRECTOR"
        | "CAMPUS_DIRECTOR"
        | "DISTRICT_DIRECTOR"
        | "DISTRICT_STAFF"
        | "REGION_DIRECTOR"
        | "REGIONAL_STAFF"
        | "NATIONAL_STAFF"
        | "NATIONAL_DIRECTOR"
        | "FIELD_DIRECTOR"
        | "CMC_GO_ADMIN"
        | "ADMIN",
    });
  };

  const handleScopeChange = (userId: number, scopeLevel: ScopeLevel) => {
    updateAuthLevelsMutation.mutate({ userId, scopeLevel });
  };

  const handleViewChange = (userId: number, viewLevel: ViewLevel) => {
    updateAuthLevelsMutation.mutate({ userId, viewLevel });
  };

  const handleEditChange = (userId: number, editLevel: EditLevel) => {
    updateAuthLevelsMutation.mutate({ userId, editLevel });
  };

  const handleStatusToggle = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    updateStatusMutation.mutate({
      userId,
      approvalStatus: newStatus as "ACTIVE" | "DISABLED",
    });
  };

  const handleBanUser = (userId: number, fullName: string) => {
    if (
      window.confirm(
        `Are you sure you want to ban user "${fullName}"? They will be disabled and unable to access the system.`
      )
    ) {
      updateStatusMutation.mutate({
        userId,
        approvalStatus: "DISABLED",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Sessions ({activeSessions.length})
          </CardTitle>
          <CardDescription>
            Users logged in within the last 30 minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No active sessions</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {session.user?.fullName || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.user?.email} • {session.user?.role}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last seen: {new Date(session.lastSeenAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    Online
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Manage user roles, permissions, and accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-left p-2 font-medium">Campus/District</th>
                  <th className="text-left p-2 font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <Globe className="w-3 h-3" /> Scope
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Map filter scope - what districts user can see on the
                        map
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-2 font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <Eye className="w-3 h-3" /> View
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        View level - who's data the user can see
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-2 font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <Edit className="w-3 h-3" /> Edit
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Edit level - who's data the user can modify
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Last Login</th>
                  <th className="text-left p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {user.fullName}
                        {user.isActiveSession && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 border-green-200"
                          >
                            Online
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-sm text-gray-600">{user.email}</td>
                    <td className="p-2">
                      <Select
                        value={user.role}
                        onValueChange={value =>
                          handleRoleChange(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STAFF">Staff</SelectItem>
                          <SelectItem value="CO_DIRECTOR">
                            Co-Director
                          </SelectItem>
                          <SelectItem value="CAMPUS_DIRECTOR">
                            Campus Director
                          </SelectItem>
                          <SelectItem value="DISTRICT_DIRECTOR">
                            District Director
                          </SelectItem>
                          <SelectItem value="DISTRICT_STAFF">
                            District Staff
                          </SelectItem>
                          <SelectItem value="REGION_DIRECTOR">
                            Region Director (seeded)
                          </SelectItem>
                          <SelectItem value="REGIONAL_STAFF">
                            Regional Staff
                          </SelectItem>
                          <SelectItem value="NATIONAL_STAFF">
                            National Staff
                          </SelectItem>
                          <SelectItem value="NATIONAL_DIRECTOR">
                            National Director (seeded)
                          </SelectItem>
                          <SelectItem value="FIELD_DIRECTOR">
                            Field Director (seeded)
                          </SelectItem>
                          <SelectItem value="CMC_GO_ADMIN">
                            CMC Go Admin
                          </SelectItem>
                          <SelectItem value="ADMIN">Admin (Legacy)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-sm">
                      {user.campusName && <div>{user.campusName}</div>}
                      {user.districtName && (
                        <div className="text-gray-500">{user.districtName}</div>
                      )}
                      {user.regionName && (
                        <div className="text-gray-400">{user.regionName}</div>
                      )}
                      {!user.campusName &&
                        !user.districtName &&
                        !user.regionName && (
                          <span className="text-gray-400">No assignment</span>
                        )}
                    </td>
                    {/* Scope Level */}
                    <td className="p-2">
                      <Select
                        value={user.scopeLevel || "DISTRICT"}
                        onValueChange={value =>
                          handleScopeChange(user.id, value as ScopeLevel)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOPE_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>
                              {LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* View Level */}
                    <td className="p-2">
                      <Select
                        value={user.viewLevel || "CAMPUS"}
                        onValueChange={value =>
                          handleViewChange(user.id, value as ViewLevel)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIEW_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>
                              {LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Edit Level */}
                    <td className="p-2">
                      <Select
                        value={user.editLevel || "CAMPUS"}
                        onValueChange={value =>
                          handleEditChange(user.id, value as EditLevel)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EDIT_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>
                              {LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Badge
                        variant={
                          user.approvalStatus === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          user.approvalStatus === "ACTIVE"
                            ? "bg-green-500"
                            : user.approvalStatus === "DISABLED"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }
                      >
                        {user.approvalStatus}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            user.approvalStatus === "ACTIVE"
                              ? "outline"
                              : "default"
                          }
                          onClick={() =>
                            handleStatusToggle(user.id, user.approvalStatus)
                          }
                        >
                          {user.approvalStatus === "ACTIVE"
                            ? "Disable"
                            : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBanUser(user.id, user.fullName)}
                          disabled={user.approvalStatus === "DISABLED"}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDeleteUser(user.id, user.fullName)
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
