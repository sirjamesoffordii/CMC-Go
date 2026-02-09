import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Manage your profile and security settings.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-1">{email}</p>
        </div>

        <Separator />

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleComingSoon("Username")}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Change username
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleComingSoon("Password")}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Change password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleComingSoon("Email")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Change email
          </Button>
        </div>

        <Separator />

        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </DialogContent>
    </Dialog>
  );
}
