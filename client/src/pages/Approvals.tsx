/**
 * Approvals Page - PR 2
 * For Region Directors to approve District Directors
 * For Admins to approve Region Directors
 */

import { trpc } from "@/lib/trpc";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Approvals() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = usePublicAuth();
  
  const { data: pendingApprovals = [], isLoading } = trpc.approvals.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      trpc.approvals.list.invalidate();
    },
  });
  
  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      trpc.approvals.list.invalidate();
    },
  });
  
  if (!isAuthenticated) {
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
  
  const canViewApprovals = user && (
    (user.role === "REGION_DIRECTOR" && user.approvalStatus === "ACTIVE") ||
    user.role === "ADMIN"
  );
  
  if (!canViewApprovals) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to view approvals</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Approvals</h1>
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
            {pendingApprovals.map((pendingUser) => (
              <Card key={pendingUser.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{pendingUser.fullName}</h3>
                        <Badge variant="outline">{pendingUser.role}</Badge>
                        <Badge variant="secondary">Pending Approval</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{pendingUser.email}</p>
                      {pendingUser.campusId && (
                        <p className="text-xs text-slate-500">
                          Campus ID: {pendingUser.campusId} • District: {pendingUser.districtId} • Region: {pendingUser.regionId}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Registered: {new Date(pendingUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectMutation.mutate({ userId: pendingUser.id })}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ userId: pendingUser.id })}
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

