import { Button } from "@/components/ui/button";
import { MenuPanel } from "@/components/ui/menu-panel";
import { Separator } from "@/components/ui/separator";
import { Mail, KeyRound, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";

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

export function AccountPanel({
  open,
  onOpenChange,
  onLogout,
  user,
}: AccountPanelProps) {
  const displayName = user?.fullName || user?.name || "Account";
  const email = user?.email || "No email on file";

  const handleComingSoon = (label: string) => {
    toast.info(`${label} settings are coming soon.`);
  };

  const handleLogout = async () => {
    await onLogout();
    onOpenChange(false);
  };

  return (
    <MenuPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Account"
      icon={<UserRound className="w-4 h-4" />}
    >
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
            onClick={() => handleComingSoon("Username")}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Change username
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start min-h-[44px]"
            onClick={() => handleComingSoon("Password")}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Change password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start min-h-[44px]"
            onClick={() => handleComingSoon("Email")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Change email
          </Button>
        </div>

        <Separator />

        <Button
          variant="destructive"
          className="w-full justify-start min-h-[44px]"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </MenuPanel>
  );
}
