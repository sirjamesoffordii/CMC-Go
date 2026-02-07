import { useState } from "react";
import { useLocation } from "wouter";
import { LoginModal } from "@/components/LoginModal";

export function Login() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setLocation("/");
    }
  };

  const handleAuthSuccess = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-black">
      <LoginModal
        open={open}
        onOpenChange={handleOpenChange}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
