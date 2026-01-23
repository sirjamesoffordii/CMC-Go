import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getPeopleScope } from "@/lib/scopeCheck";

interface AccessDeniedProps {
  resource?: string;
}

/**
 * AccessDenied - Shows an access denied message with appropriate actions.
 *
 * Displays when a user tries to access a resource outside their scope.
 * Provides a button to return to their appropriate home view.
 */
export function AccessDenied({
  resource = "this resource",
}: AccessDeniedProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const scope = getPeopleScope(user);

  const handleGoHome = () => {
    if (!scope || !user) {
      setLocation("/");
      return;
    }

    // Redirect to user's appropriate view
    if (scope.level === "CAMPUS" && user.campusId) {
      setLocation(`/?viewMode=campus&campusId=${user.campusId}`);
    } else if (scope.level === "DISTRICT" && user.districtId) {
      setLocation(`/?viewMode=district&districtId=${user.districtId}`);
    } else if (scope.level === "REGION" && user.regionId) {
      setLocation(`/?viewMode=region&regionId=${user.regionId}`);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <ShieldAlert className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access {resource}.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your view is limited to your{" "}
          {scope?.level.toLowerCase() || "assigned"} scope.
        </p>
        <Button onClick={handleGoHome}>Go to My View</Button>
      </div>
    </div>
  );
}
