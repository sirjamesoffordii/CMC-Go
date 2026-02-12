import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuPanel } from "@/components/ui/menu-panel";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  KeyRound,
  LogOut,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AccountPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void | Promise<void>;
  user?: {
    fullName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
}

type View = "main" | "username" | "password" | "email";

export function AccountPanel({
  open,
  onOpenChange,
  onLogout,
  user,
}: AccountPanelProps) {
  const [view, setView] = useState<View>("main");

  const displayName = user?.fullName || user?.name || "Account";
  const email = user?.email || "No email on file";

  const handleLogout = async () => {
    await onLogout();
    onOpenChange(false);
  };

  // Reset to main view when panel closes
  const handleOpenChange = (open: boolean) => {
    if (!open) setView("main");
    onOpenChange(open);
  };

  return (
    <MenuPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={view === "main" ? "Account" : viewTitle(view)}
      icon={<UserRound className="w-4 h-4" />}
    >
      {view === "main" ? (
        <MainView
          displayName={displayName}
          email={email}
          onNavigate={setView}
          onLogout={handleLogout}
        />
      ) : view === "username" ? (
        <ChangeUsernameView
          currentName={displayName}
          onBack={() => setView("main")}
        />
      ) : view === "password" ? (
        <ChangePasswordView onBack={() => setView("main")} />
      ) : (
        <ChangeEmailView
          currentEmail={user?.email ?? ""}
          onBack={() => setView("main")}
        />
      )}
    </MenuPanel>
  );
}

function viewTitle(view: View): string {
  switch (view) {
    case "username":
      return "Change Name";
    case "password":
      return "Change Password";
    case "email":
      return "Change Email";
    default:
      return "Account";
  }
}

/* ─── Main View ──────────────────────────────────────── */

function MainView({
  displayName,
  email,
  onNavigate,
  onLogout,
}: {
  displayName: string;
  email: string;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Manage your profile and security settings.
      </p>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-black truncate">
          {displayName}
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">{email}</p>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Button
          variant="outline"
          className="w-full justify-start min-h-[44px]"
          onClick={() => onNavigate("username")}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Change username
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start min-h-[44px]"
          onClick={() => onNavigate("password")}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Change password
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start min-h-[44px]"
          onClick={() => onNavigate("email")}
        >
          <Mail className="mr-2 h-4 w-4" />
          Change email
        </Button>
      </div>

      <Separator />

      <Button
        variant="destructive"
        className="w-full justify-start min-h-[44px]"
        onClick={onLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}

/* ─── Change Username View ───────────────────────────── */

function ChangeUsernameView({
  currentName,
  onBack,
}: {
  currentName: string;
  onBack: () => void;
}) {
  const [fullName, setFullName] = useState(currentName);
  const utils = trpc.useUtils();

  const mutation = trpc.auth.changeUsername.useMutation({
    onSuccess: () => {
      toast.success("Name updated successfully");
      utils.auth.me.invalidate();
      onBack();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    mutation.mutate({ fullName: trimmed });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="space-y-2">
        <Label htmlFor="fullName">Display Name</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          autoFocus
          maxLength={100}
        />
      </div>

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        disabled={mutation.isPending || fullName.trim() === currentName}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Save
      </Button>
    </form>
  );
}

/* ─── Change Password View ───────────────────────────── */

function ChangePasswordView({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      onBack();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60 rounded"
            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60 rounded"
            aria-label={showNewPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60 rounded"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        disabled={
          mutation.isPending || !currentPassword || !newPassword || !confirmPassword
        }
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Change Password
      </Button>
    </form>
  );
}

/* ─── Change Email View ──────────────────────────────── */

function ChangeEmailView({
  currentEmail,
  onBack,
}: {
  currentEmail: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(currentEmail);
  const utils = trpc.useUtils();

  const mutation = trpc.auth.changeEmail.useMutation({
    onSuccess: () => {
      toast.success("Email updated successfully");
      utils.auth.me.invalidate();
      onBack();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Email cannot be empty");
      return;
    }
    mutation.mutate({ email: trimmed });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoFocus
        />
      </div>

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        disabled={mutation.isPending || email.trim() === currentEmail}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Save
      </Button>
    </form>
  );
}
