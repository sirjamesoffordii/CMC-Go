// @ts-nocheck
/**
 * Approvals Page - PR 2
 * For Region Directors to approve District Directors
 * For Admins to approve Region Directors
 */

import { trpc } from "@/lib/trpc";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Approvals() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = usePublicAuth();
  const utils = trpc.useUtils();

  const { data: pendingApprovals = [], isLoading } =
    trpc.approvals.list.useQuery();

  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      utils.approvals.list.invalidate();
    },
  });

  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      utils.approvals.list.invalidate();
    },
  });

  // Authentication disabled - allow all users to view approvals
  if (false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view approvals</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const canViewApprovals =
    user &&
    ((user.role === "REGION_DIRECTOR" && user.approvalStatus === "ACTIVE") ||
      user.role === "ADMIN");

  if (!canViewApprovals) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view approvals
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-black hover:bg-red-600 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Approvals</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No pending approvals</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map(pendingUser => (
              <Card key={pendingUser.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold">
                          {pendingUser.fullName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {pendingUser.role}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-1 truncate">
                        {pendingUser.email}
                      </p>
                      {pendingUser.campusId && (
                        <p className="text-xs text-slate-500">
                          Campus: {pendingUser.campusId} · District:{" "}
                          {pendingUser.districtId} · Region:{" "}
                          {pendingUser.regionId}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 sm:mt-2">
                        Registered:{" "}
                        {new Date(pendingUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          rejectMutation.mutate({ userId: pendingUser.id })
                        }
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          approveMutation.mutate({ userId: pendingUser.id })
                        }
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
