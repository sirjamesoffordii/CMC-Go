import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, DollarSign, Wallet, MessageCircle } from "lucide-react";
import { MessageDialog } from "./MessageDialog";

interface GiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  needId: number;
  needAmount?: number | null;
  fundsReceived?: number | null;
  cashapp?: string | null;
  zelle?: string | null;
  venmo?: string | null;
}

export function GiveDialog({
  open,
  onOpenChange,
  personId,
  personName,
  needId,
  needAmount,
  fundsReceived,
  cashapp,
  zelle,
  venmo,
}: GiveDialogProps) {
  const [amountGiven, setAmountGiven] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const addFunds = trpc.needs.addFundsReceived.useMutation({
    onSuccess: () => {
      toast.success("Thank you! Your gift has been recorded.");
      setAmountGiven("");
      onOpenChange(false);
      utils.needs.listActive.invalidate();
      utils.needs.listAll.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Failed to record gift");
    },
  });

  const hasPaymentMethods = !!(cashapp || zelle || venmo);

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSubmit = () => {
    const parsed = amountGiven.trim() ? parseFloat(amountGiven) : 0;
    if (parsed <= 0) {
      toast.error("Please enter the amount you gave");
      return;
    }
    const cents = Math.round(parsed * 100);
    addFunds.mutate({ needId, amountCents: cents });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give to {personName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment methods */}
          {hasPaymentMethods ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" />
                Ways to give
              </div>
              <div className="flex flex-wrap gap-2">
                {cashapp && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("CashApp", cashapp)}
                    className="font-mono"
                  >
                    CashApp {cashapp}
                    <Copy className="ml-2 h-3 w-3" />
                  </Button>
                )}
                {zelle && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("Zelle", zelle)}
                    className="font-mono"
                  >
                    Zelle {zelle}
                    <Copy className="ml-2 h-3 w-3" />
                  </Button>
                )}
                {venmo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("Venmo", venmo)}
                    className="font-mono"
                  >
                    Venmo {venmo}
                    <Copy className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No CashApp, Zelle, or Venmo on file. You can still give via cash,
              check, or other methods—contact {personName} directly. Record your
              gift below to update their need.
            </p>
          )}

          {/* Amount given */}
          <div className="space-y-2">
            <Label htmlFor="give-amount">Amount you gave</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="give-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountGiven}
                onChange={e => setAmountGiven(e.target.value)}
                className="pl-9"
              />
            </div>
            {needAmount != null && needAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Need: ${(needAmount / 100).toFixed(2)}
                {(fundsReceived ?? 0) > 0 &&
                  ` · Received: $${((fundsReceived ?? 0) / 100).toFixed(2)}`}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addFunds.isPending || !amountGiven.trim()}
          >
            {addFunds.isPending ? "Recording..." : "I've given"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <MessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        personId={personId}
        personName={personName}
      />
    </Dialog>
  );
}
