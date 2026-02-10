import { ReactNode } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.approvalStatus === "DISABLED" || user.isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Account Status</h1>
          <p className="text-gray-600 mb-4">Your account has been disabled.</p>
          <p className="text-sm text-gray-500">
            Please contact an administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
