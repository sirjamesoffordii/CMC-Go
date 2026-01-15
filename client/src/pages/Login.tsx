import { useLocation } from "wouter";
import { AuthFlow } from "../components/auth/AuthFlow";

export function Login() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <AuthFlow onSuccess={() => setLocation("/")} />
    </div>
  );
}
