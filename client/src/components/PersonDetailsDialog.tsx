import { useState } from "react";
import { Person, Note, Need } from "../../../drizzle/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "@/lib/trpc";

interface PersonDetailsDialogProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDetailsDialog({ person, open, onOpenChange }: PersonDetailsDialogProps) {
  const utils = trpc.useUtils();
  
  // Notes state
  const [noteText, setNoteText] = useState("");
  const [noteIsLeaderOnly, setNoteIsLeaderOnly] = useState(false);

  // Needs state
  const [needType, setNeedType] = useState<"Financial" | "Other">("Financial");
  const [needAmount, setNeedAmount] = useState("");
  const [needNotes, setNeedNotes] = useState("");

  // Fetch notes and needs
  const { data: notes = [] } = trpc.notes.byPerson.useQuery(
    { personId: person?.personId ?? '' },
    { enabled: !!person }
  );

  const { data: needs = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId ?? '' },
    { enabled: !!person }
  );

  // Mutations
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.byPerson.invalidate({ personId: person?.personId ?? '' });
      utils.people.list.invalidate();
      setNoteText("");
      setNoteIsLeaderOnly(false);
    },
  });

  const createNeed = trpc.needs.create.useMutation({
    onSuccess: () => {
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? '' });
      utils.people.list.invalidate();
      setNeedAmount("");
      setNeedNotes("");
    },
  });

  const toggleNeedActive = trpc.needs.toggleActive.useMutation({
    onSuccess: () => {
      utils.needs.byPerson.invalidate({ personId: person?.personId ?? '' });
      utils.followUp.list.invalidate();
    },
  });

  const handleAddNote = () => {
    if (!person || !noteText.trim()) return;
    createNote.mutate({
      personId: person.personId,
      text: noteText.trim(),
      isLeaderOnly: noteIsLeaderOnly,
    });
  };

  const handleAddNeed = () => {
    if (!person) return;
    const amount = needType === "Financial" ? parseFloat(needAmount) * 100 : undefined;
    createNeed.mutate({
      personId: person.personId,
      type: needType,
      amount,
      notes: needNotes.trim() || undefined,
    });
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{person.name}</DialogTitle>
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold">{person.status}</span>
            {person.primaryRole && <> • {person.primaryRole}</>}
          </p>
        </DialogHeader>

        <Tabs defaultValue="notes" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="needs">Needs</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            {/* Add Note Form */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <Label>Add Note</Label>
              <Textarea
                placeholder="Enter note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={noteIsLeaderOnly}
                    onCheckedChange={setNoteIsLeaderOnly}
                    id="leader-only"
                  />
                  <Label htmlFor="leader-only" className="text-sm">
                    Leader Only
                  </Label>
                </div>
                <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                  Add Note
                </Button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-white border border-gray-200 rounded">
                    <p className="text-sm text-gray-900">{note.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.isLeaderOnly && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Leader Only
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="needs" className="space-y-4">
            {/* Add Need Form */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <Label>Add Need</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Type</Label>
                  <Select value={needType} onValueChange={(v) => setNeedType(v as "Financial" | "Other")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Financial">Financial</SelectItem>
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
                      onChange={(e) => setNeedAmount(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Textarea
                    placeholder="Additional details..."
                    value={needNotes}
                    onChange={(e) => setNeedNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddNeed} className="w-full">
                  Add Need
                </Button>
              </div>
            </div>

            {/* Needs List */}
            <div className="space-y-2">
              {needs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No needs yet</p>
              ) : (
                needs.map((need) => (
                  <div
                    key={need.id}
                    className={`p-3 border rounded ${
                      need.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-300 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{need.type}</span>
                          {need.amount && (
                            <span className="text-sm text-gray-700">
                              ${(need.amount / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {need.notes && (
                          <p className="text-sm text-gray-600 mt-1">{need.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(need.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleNeedActive.mutate({ needId: need.id, isActive: !need.isActive })}
                      >
                        {need.isActive ? "Resolve" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
