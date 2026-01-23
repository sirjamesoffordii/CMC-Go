// @ts-nocheck
import { useState, useEffect } from "react";
import { Person, Note, Need } from "../../../drizzle/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "./ui/bottom-sheet";

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
  const { user, isAuthenticated, isCampusDirectorOrAbove } = useAuth();
  // Check if user is a leader (CO_DIRECTOR+)
  const isLeader = isCampusDirectorOrAbove || user?.role === "CO_DIRECTOR";

  // Invite Notes state
  const [inviteNoteText, setInviteNoteText] = useState("");

  // Needs state
  const [needType, setNeedType] = useState<
    "Financial" | "Transportation" | "Housing" | "Other"
  >("Financial");
  const [needDescription, setNeedDescription] = useState("");
  const [needAmount, setNeedAmount] = useState("");
  const [needVisibility, setNeedVisibility] = useState<
    "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE"
  >("LEADERSHIP_ONLY");

  // PR 2: Fetch invite notes (leaders-only endpoint)
  const { data: inviteNotes = [] } = trpc.inviteNotes.byPerson.useQuery(
    { personId: person?.personId ?? "" },
    { enabled: !!person }
  );

  const { data: needs = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId ?? "" },
    { enabled: !!person }
  );

  // PR 3: Fetch status history
  const { data: statusHistoryData = [] } = trpc.people.statusHistory.useQuery(
    { personId: person?.personId ?? "", limit: 10 },
    { enabled: !!person && isAuthenticated }
  );

  // Mutations
  // PR 2: Create invite note (leaders-only)
  const createInviteNote = trpc.inviteNotes.create.useMutation({
    onSuccess: () => {
      utils.inviteNotes.byPerson.invalidate({
        personId: person?.personId ?? "",
      });
      utils.people.list.invalidate();
      setInviteNoteText("");
    },
  });

  const createNeed = trpc.needs.create.useMutation({
    onSuccess: () => {
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? "" });
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
      utils.people.list.invalidate();
      setNeedDescription("");
      setNeedAmount("");
      setNeedVisibility("LEADERSHIP_ONLY");
    },
  });

  const toggleNeedActive = trpc.needs.toggleActive.useMutation({
    onSuccess: () => {
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? "" });
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
    },
  });

  const updateNeedVisibility = trpc.needs.updateVisibility.useMutation({
    onSuccess: () => {
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? "" });
      utils.needs.listActive.invalidate();
    },
  });

  const handleAddInviteNote = () => {
    if (!person || !inviteNoteText.trim()) return;
    createInviteNote.mutate({
      personId: person.personId,
      content: inviteNoteText.trim(),
    });
  };

  const handleAddNeed = () => {
    if (!person || !needDescription.trim()) return;
    const amount =
      needType === "Financial" && needAmount
        ? parseFloat(needAmount) * 100
        : undefined;
    createNeed.mutate({
      personId: person.personId,
      type: needType,
      description: needDescription.trim(),
      amount,
      visibility: needVisibility,
    });
  };

  // PR 2: Check if user can view needs (staff can see DISTRICT_VISIBLE needs)
  const canViewNeeds = isAuthenticated;

  // PR: Status update mutation for keyboard shortcuts
  const updateStatus = trpc.people.updateStatus.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
    },
  });

  // CRITICAL: All hooks must be called before any conditional returns.
  // React requires hooks to be called in the same order on every render.
  // If we return early before calling useIsMobile(), the hook order changes
  // between renders, causing "Rendered more hooks than during the previous render" error.
  const isMobile = useIsMobile();

  // PR: Keyboard shortcuts for quick status updates
  useEffect(() => {
    if (!open || !person || !isLeader) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle number keys 1-4 when not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      let newStatus: "Yes" | "Maybe" | "No" | "Not Invited" | null = null;

      switch (e.key) {
        case "1":
          newStatus = "Yes";
          break;
        case "2":
          newStatus = "Maybe";
          break;
        case "3":
          newStatus = "No";
          break;
        case "4":
          newStatus = "Not Invited";
          break;
      }

      if (newStatus) {
        e.preventDefault();
        updateStatus.mutate({ personId: person.personId, status: newStatus });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, person, isLeader, updateStatus]);

  // Early return guard - must be AFTER all hooks are declared
  if (!person) return null;

  // Format status history
  const statusHistoryDisplay = person.statusLastUpdated ? (
    <div className="text-xs text-gray-500 mt-1">
      Last updated: {new Date(person.statusLastUpdated).toLocaleDateString()}
      {person.statusLastUpdatedBy && ` by ${person.statusLastUpdatedBy}`}
    </div>
  ) : null;

  const content = (
    <div className="space-y-6 mt-4">
      {/* Invite Section */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-sm font-semibold text-slate-700">Invite</h3>
        </div>

        {/* Invite Status + History */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Status: </span>
              <span className="text-sm font-semibold">{person.status}</span>
              {isLeader && (
                <span className="text-xs text-gray-500 ml-2">
                  (Press 1-4: Yes/Maybe/No/Not Invited)
                </span>
              )}
            </div>
            {person.depositPaid && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                Deposit Paid
              </span>
            )}
          </div>
          {statusHistoryDisplay}
        </div>

        {/* PR 3: Status History */}
        {isAuthenticated && statusHistoryData.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status History</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {statusHistoryData.map(change => (
                <div
                  key={change.id}
                  className="p-2 bg-white border border-gray-200 rounded text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {change.fromStatus || "Initial"} → {change.toStatus}
                      </span>
                      {change.source && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {change.source}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {new Date(change.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {change.changedBy && (
                    <div className="text-gray-500 mt-1">
                      by {change.changedBy}
                    </div>
                  )}
                  {change.note && (
                    <div className="text-gray-600 mt-1 italic">
                      {change.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Notes (Leaders Only) */}
        {isLeader && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label>Quick Note (Leaders Only)</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Enter invite note... (Press Ctrl+Enter to save)"
                value={inviteNoteText}
                onChange={e => setInviteNoteText(e.target.value)}
                onKeyDown={e => {
                  // Ctrl+Enter to quickly add note
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleAddInviteNote();
                  }
                }}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleAddInviteNote}
                disabled={!inviteNoteText.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Invite Notes List */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Invite Notes</Label>
          {inviteNotes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No invite notes yet
            </p>
          ) : (
            inviteNotes.map(note => (
              <div
                key={note.id}
                className="p-3 bg-white border border-gray-200 rounded"
              >
                <p className="text-sm text-gray-900">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  {note.createdBy && <span>by {note.createdBy}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Needs Section */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-sm font-semibold text-slate-700">Needs</h3>
        </div>

        {/* Add Need Form (Leaders Only) */}
        {isLeader && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label>Add Need (Leaders Only)</Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Type</Label>
                <Select
                  value={needType}
                  onValueChange={v =>
                    setNeedType(
                      v as "Financial" | "Transportation" | "Housing" | "Other"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Transportation">
                      Transportation
                    </SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {needType === "Financial" && (
                <div>
                  <Label className="text-sm">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={needAmount}
                    onChange={e => setNeedAmount(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label className="text-sm">Description *</Label>
                <Textarea
                  placeholder="Describe the need..."
                  value={needDescription}
                  onChange={e => setNeedDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">Visibility</Label>
                <RadioGroup
                  value={needVisibility}
                  onValueChange={v =>
                    setNeedVisibility(
                      v as "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE"
                    )
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="LEADERSHIP_ONLY"
                      id="leadership-only"
                    />
                    <Label
                      htmlFor="leadership-only"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Leadership only (default)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="DISTRICT_VISIBLE"
                      id="district-visible"
                    />
                    <Label
                      htmlFor="district-visible"
                      className="text-sm font-normal cursor-pointer"
                    >
                      District visible
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 mt-1">
                  Use district visible for logistics or practical help the
                  district can act on.
                </p>
              </div>
              <Button
                onClick={handleAddNeed}
                className="w-full"
                disabled={!needDescription.trim()}
              >
                Add Need
              </Button>
            </div>
          </div>
        )}

        {/* Needs List */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Needs List</Label>
          {needs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No needs yet
            </p>
          ) : (
            needs.map(need => (
              <div
                key={need.id}
                className={`p-3 border rounded ${
                  need.isActive
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-300 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{need.type}</span>
                      {need.amount && (
                        <span className="text-sm text-gray-700">
                          ${(need.amount / 100).toFixed(2)}
                        </span>
                      )}
                      {need.visibility && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {need.visibility}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {need.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(need.createdAt).toLocaleDateString()}
                      {need.resolvedAt && !need.isActive && (
                        <span className="ml-2">
                          • Resolved{" "}
                          {new Date(need.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    {isLeader && need.visibility && (
                      <div className="mt-2">
                        <Label className="text-xs mb-1 block">Visibility</Label>
                        <RadioGroup
                          value={need.visibility}
                          onValueChange={v =>
                            updateNeedVisibility.mutate({
                              needId: need.id,
                              visibility: v as
                                | "LEADERSHIP_ONLY"
                                | "DISTRICT_VISIBLE",
                            })
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="LEADERSHIP_ONLY"
                              id={`leadership-only-${need.id}`}
                            />
                            <Label
                              htmlFor={`leadership-only-${need.id}`}
                              className="text-xs font-normal cursor-pointer"
                            >
                              Leadership only
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="DISTRICT_VISIBLE"
                              id={`district-visible-${need.id}`}
                            />
                            <Label
                              htmlFor={`district-visible-${need.id}`}
                              className="text-xs font-normal cursor-pointer"
                            >
                              District visible
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleNeedActive.mutate({
                          needId: need.id,
                          isActive: !need.isActive,
                        })
                      }
                    >
                      {need.isActive ? "Resolve" : "Activate"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={person.name || person.personId || "Person Details"}
        defaultSnap={1}
        snapPoints={[25, 60, 90]}
      >
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 mb-4">
            {person.primaryRole && <>{person.primaryRole} • </>}
            Status: <span className="font-semibold">{person.status}</span>
          </p>
          {content}
        </div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {person.name || person.personId || "Person Details"}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {person.primaryRole && <>{person.primaryRole} • </>}
            Status: <span className="font-semibold">{person.status}</span>
          </p>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
