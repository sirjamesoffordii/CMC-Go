import { useState, useEffect } from "react";
import { Person } from "../../../drizzle/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "./ui/bottom-sheet";
import { Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PersonDetailsDialogProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDetailsDialog({
  person,
  open,
  onOpenChange,
}: PersonDetailsDialogProps) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isLeader =
    user &&
    [
      "CO_DIRECTOR",
      "CAMPUS_DIRECTOR",
      "DISTRICT_DIRECTOR",
      "REGION_DIRECTOR",
      "ADMIN",
    ].includes(user.role);

  // Form state matching DistrictPanel's Edit Person dialog
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formStatus, setFormStatus] = useState<
    "Yes" | "Maybe" | "No" | "Not Invited"
  >("Not Invited");
  const [formSpouseAttending, setFormSpouseAttending] = useState(false);
  const [formChildrenCount, setFormChildrenCount] = useState(0);
  const [formGuestsCount, setFormGuestsCount] = useState(0);
  const [formNeedType, setFormNeedType] = useState<
    "None" | "Registration" | "Transportation" | "Housing" | "Other"
  >("None");
  const [formNeedAmount, setFormNeedAmount] = useState("");
  const [formFundsReceived, setFormFundsReceived] = useState("");
  const [formNeedDetails, setFormNeedDetails] = useState("");
  const [formNeedsMet, setFormNeedsMet] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formDepositPaid, setFormDepositPaid] = useState(false);
  const [familyGuestsExpanded, setFamilyGuestsExpanded] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Fetch person's needs
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId ?? "" },
    { enabled: !!person }
  );

  // Initialize form when person changes or dialog opens
  useEffect(() => {
    if (person && open) {
      setFormName(person.name || "");
      setFormRole(person.primaryRole || "");
      setFormStatus(person.status || "Not Invited");
      setFormSpouseAttending(person.spouseAttending || false);
      setFormChildrenCount(person.childrenCount || 0);
      setFormGuestsCount(person.guestsCount || 0);
      setFormDepositPaid(person.depositPaid || false);
      setFormNotes((person as Person & { notes?: string }).notes || "");

      // Pre-fill need from existing active need
      const activeNeed = personNeeds.find(n => n.isActive);
      if (activeNeed) {
        setFormNeedType(
          activeNeed.type as
            | "Registration"
            | "Transportation"
            | "Housing"
            | "Other"
        );
        setFormNeedAmount(
          activeNeed.amount ? (activeNeed.amount / 100).toFixed(2) : ""
        );
        setFormFundsReceived(
          activeNeed.fundsReceived
            ? (activeNeed.fundsReceived / 100).toFixed(2)
            : ""
        );
        setFormNeedDetails(activeNeed.description || "");
        setFormNeedsMet(false);
      } else {
        setFormNeedType("None");
        setFormNeedAmount("");
        setFormFundsReceived("");
        setFormNeedDetails("");
        setFormNeedsMet(personNeeds.some(n => !n.isActive));
      }
      setFamilyGuestsExpanded(
        person.spouseAttending ||
          false ||
          (person.childrenCount || 0) > 0 ||
          (person.guestsCount || 0) > 0
      );
    }
  }, [person, open, personNeeds]);

  // Mutations
  const updatePerson = trpc.people.update.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.needs.listAll.invalidate();
      utils.needs.listActive.invalidate();
      toast.success("Person updated");
      onOpenChange(false);
    },
    onError: error => {
      console.error("Error updating person:", error);
      toast.error(`Failed to update: ${error.message || "Unknown error"}`);
    },
  });

  const deletePerson = trpc.people.delete.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      toast.success("Person deleted");
      onOpenChange(false);
    },
    onError: error => {
      console.error("Error deleting person:", error);
      toast.error(`Failed to delete: ${error.message || "Unknown error"}`);
    },
  });

  const updateOrCreateNeed = trpc.needs.updateOrCreate.useMutation({
    onSuccess: () => {
      utils.needs.listAll.invalidate();
      utils.needs.listActive.invalidate();
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? "" });
    },
    onError: error => {
      console.error("Error updating need:", error);
      toast.error(`Failed to update need: ${error.message || "Unknown error"}`);
    },
  });

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.byPerson.invalidate();
    },
    onError: error => {
      console.error("Error creating note:", error);
    },
  });

  const isMobile = useIsMobile();

  // Early return guard - AFTER all hooks
  if (!person) return null;

  const handleUpdate = () => {
    if (!formName.trim() || !formRole.trim()) {
      toast.error("Name and role are required");
      return;
    }

    updatePerson.mutate(
      {
        personId: person.personId,
        name: formName.trim(),
        primaryRole: formRole.trim(),
        status: formStatus,
        depositPaid: formDepositPaid,
        notes: formNotes || undefined,
        spouseAttending: formSpouseAttending,
        childrenCount: formChildrenCount,
        guestsCount: formGuestsCount,
      },
      {
        onSuccess: () => {
          // Handle need update
          if (formNeedType !== "None") {
            const amount = formNeedAmount
              ? Math.round(parseFloat(formNeedAmount) * 100)
              : undefined;
            const fundsReceived = formFundsReceived
              ? Math.round(parseFloat(formFundsReceived) * 100)
              : undefined;
            updateOrCreateNeed.mutate(
              {
                personId: person.personId,
                type: formNeedType,
                description: formNeedDetails || formNeedType,
                amount,
                fundsReceived,
                isActive: !formNeedsMet,
              },
              {
                onSuccess: () => {
                  if (formNeedDetails.trim()) {
                    createNote.mutate({
                      personId: person.personId,
                      category: "INTERNAL",
                      content: `[${formNeedType}] ${formNeedDetails}`,
                      noteType: "REQUEST",
                    });
                  }
                },
              }
            );
          } else {
            // Deactivate any active need if need type set to None
            const activeNeed = personNeeds.find(n => n.isActive);
            if (activeNeed) {
              updateOrCreateNeed.mutate({
                personId: person.personId,
                type: activeNeed.type,
                description: activeNeed.description || "",
                isActive: false,
              });
            }
          }
        },
      }
    );
  };

  const handleDelete = () => {
    const skipConfirmation =
      localStorage.getItem("skipDeletePersonConfirmation") === "true";
    if (skipConfirmation) {
      deletePerson.mutate({ personId: person.personId });
    } else {
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    deletePerson.mutate({ personId: person.personId });
    setIsDeleteConfirmOpen(false);
  };

  const formContent = (
    <div className="space-y-6 py-4 overflow-x-hidden">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-sm font-semibold text-slate-700">
            Basic Information
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pd-name">Full Name *</Label>
            <Input
              id="pd-name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-role">Role *</Label>
            <Input
              id="pd-role"
              value={formRole}
              onChange={e => setFormRole(e.target.value)}
              placeholder="Enter role"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-status">Status</Label>
            <Select
              value={formStatus}
              onValueChange={v => setFormStatus(v as typeof formStatus)}
            >
              <SelectTrigger id="pd-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Going (Yes)</SelectItem>
                <SelectItem value="Maybe">Maybe</SelectItem>
                <SelectItem value="No">Not Going (No)</SelectItem>
                <SelectItem value="Not Invited">Not Invited Yet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Family & Guests - collapsible */}
      <div className="border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFamilyGuestsExpanded(!familyGuestsExpanded)}
          className="flex items-center gap-2 py-2 text-left hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
        >
          <h3 className="text-sm font-semibold text-slate-700">
            Family & Guests (optional)
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${familyGuestsExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {familyGuestsExpanded && (
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="pd-spouse" className="text-sm font-medium">
                  Spouse attending
                </Label>
                <div className="flex items-center min-h-9">
                  <Checkbox
                    id="pd-spouse"
                    checked={formSpouseAttending}
                    onCheckedChange={checked =>
                      setFormSpouseAttending(checked === true)
                    }
                    className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 h-4 w-4 shrink-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pd-children">Children attending</Label>
                <Input
                  id="pd-children"
                  type="number"
                  min="0"
                  max="10"
                  value={formChildrenCount === 0 ? "" : formChildrenCount}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setFormChildrenCount(0);
                      return;
                    }
                    setFormChildrenCount(
                      Math.max(0, Math.min(10, parseInt(raw, 10) || 0))
                    );
                  }}
                  placeholder="0"
                  className="w-full sm:w-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pd-guests">Guests attending</Label>
                <Input
                  id="pd-guests"
                  type="number"
                  min="0"
                  max="10"
                  value={formGuestsCount === 0 ? "" : formGuestsCount}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setFormGuestsCount(0);
                      return;
                    }
                    setFormGuestsCount(
                      Math.max(0, Math.min(10, parseInt(raw, 10) || 0))
                    );
                  }}
                  placeholder="0"
                  className="w-full sm:w-24"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Need, Funds Needed, Funds Received */}
      <div className="space-y-4 mt-4">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div className="space-y-2 w-full sm:w-40">
            <Label htmlFor="pd-need">Need</Label>
            <Select
              value={formNeedType}
              onValueChange={v => {
                setFormNeedType(v as typeof formNeedType);
                if (v === "None") {
                  setFormNeedAmount("");
                  setFormFundsReceived("");
                  setFormNeedDetails("");
                }
              }}
            >
              <SelectTrigger id="pd-need">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Registration">Registration</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Housing">Housing</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AnimatePresence mode="popLayout">
            {formNeedType !== "None" && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 w-[calc(50%-6px)] sm:w-40"
              >
                <Label htmlFor="pd-funds-needed">Funds Needed</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <Input
                    id="pd-funds-needed"
                    type="number"
                    step="0.01"
                    value={formNeedAmount}
                    onChange={e => setFormNeedAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 w-full sm:w-28"
                  />
                </div>
              </motion.div>
            )}
            {formNeedType !== "None" && (
              <motion.div
                key="funds-received"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 w-[calc(50%-6px)] sm:w-40"
              >
                <Label htmlFor="pd-funds-received">Funds Received</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <Input
                    id="pd-funds-received"
                    type="number"
                    step="0.01"
                    value={formFundsReceived}
                    onChange={e => setFormFundsReceived(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 w-full sm:w-28"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Need Note + Journey Notes - side by side when need selected */}
      <motion.div
        layout
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={`space-y-4 mt-4 grid gap-4 overflow-hidden ${formNeedType !== "None" ? "grid-cols-1 sm:grid-cols-[1fr_1fr]" : "grid-cols-1"}`}
      >
        <AnimatePresence mode="popLayout">
          {formNeedType !== "None" && (
            <motion.div
              key="need-note"
              initial={{ opacity: 0, x: -120 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -120 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="space-y-4 min-w-0 w-full"
            >
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  Need Note
                </h3>
              </div>
              <div className="space-y-2 min-w-0">
                <Textarea
                  id="pd-need-notes"
                  value={formNeedDetails}
                  onChange={e => setFormNeedDetails(e.target.value)}
                  placeholder="Enter notes about the need"
                  rows={4}
                  className="resize-none w-full min-w-0"
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="pd-needs-met"
                  checked={formNeedsMet}
                  onCheckedChange={checked => setFormNeedsMet(checked === true)}
                  className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                />
                <Label
                  htmlFor="pd-needs-met"
                  className="cursor-pointer text-sm font-medium"
                >
                  Needs Met
                </Label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journey Notes */}
        <motion.div
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="space-y-4 min-w-0 w-full"
        >
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-semibold text-slate-700">
              Journey Notes
            </h3>
          </div>
          <div className="space-y-2 min-w-0">
            <Textarea
              id="pd-notes"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Enter journey notes"
              rows={4}
              className="resize-none w-full min-w-0"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );

  const footer = (
    <DialogFooter className="flex w-full items-center justify-between pt-0 px-0">
      {/* Trash - far left */}
      {isLeader && (
        <button
          onClick={handleDelete}
          disabled={deletePerson.isPending}
          className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title="Delete person"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Right side: Deposit paid, Cancel, Update */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="pd-deposit-paid"
            className="cursor-pointer text-sm font-medium"
          >
            Deposit paid
          </Label>
          <Checkbox
            id="pd-deposit-paid"
            checked={formDepositPaid}
            onCheckedChange={checked => setFormDepositPaid(checked === true)}
            className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handleUpdate}
          disabled={
            updatePerson.isPending || !formName.trim() || !formRole.trim()
          }
          className="bg-black text-white hover:bg-red-600"
        >
          {updatePerson.isPending ? "Updating..." : "Update Person"}
        </Button>
      </div>
    </DialogFooter>
  );

  if (isMobile) {
    return (
      <>
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          title="Edit Person"
          defaultSnap={0}
          snapPoints={[100]}
          closeOnBackdrop={true}
          showCloseButton={false}
          showSnapPoints={false}
          compactHeader={true}
          fullScreen={true}
        >
          <div className="px-4 pb-4 overflow-x-hidden">
            {formContent}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                {isLeader && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={deletePerson.isPending}
                      className="p-2.5 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Delete person"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pd-deposit-m"
                        checked={formDepositPaid}
                        onCheckedChange={checked =>
                          setFormDepositPaid(checked === true)
                        }
                        className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 h-5 w-5"
                      />
                      <Label htmlFor="pd-deposit-m" className="text-sm">
                        Deposit paid
                      </Label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 min-h-[48px] text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={
                    updatePerson.isPending ||
                    !formName.trim() ||
                    !formRole.trim()
                  }
                  className="bg-black text-white hover:bg-red-600 flex-1 min-h-[48px] text-base"
                >
                  {updatePerson.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </BottomSheet>

        {/* Delete confirmation */}
        {isDeleteConfirmOpen && (
          <Dialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Person</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete {person.name || "this person"}?
                This action cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          {formContent}
          {footer}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {isDeleteConfirmOpen && (
        <Dialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Person</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete {person.name || "this person"}?
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
