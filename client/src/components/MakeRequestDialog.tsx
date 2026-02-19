"use client";

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Person } from "../../../drizzle/schema";
import { ChevronDown, User } from "lucide-react";

type NeedType = "Registration" | "Transportation" | "Housing" | "Other";

interface MakeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MakeRequestDialog({
  open,
  onOpenChange,
}: MakeRequestDialogProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [forSelf, setForSelf] = useState<boolean | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearchOpen, setPersonSearchOpen] = useState(false);
  const [needType, setNeedType] = useState<NeedType>("Other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [visibility, setVisibility] = useState<
    "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE"
  >("DISTRICT_VISIBLE");

  const { data: allPeople = [] } = trpc.people.list.useQuery(undefined, {
    enabled: open && forSelf === false,
  });

  const updateOrCreateNeed = trpc.needs.updateOrCreate.useMutation({
    onSuccess: () => {
      utils.needs.listActive.invalidate();
      utils.needs.byPerson.invalidate();
      toast.success("Request submitted successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const resetForm = () => {
    setForSelf(null);
    setSelectedPerson(null);
    setNeedType("Other");
    setDescription("");
    setAmount("");
    setVisibility("DISTRICT_VISIBLE");
  };

  const handleSubmit = () => {
    const personId = forSelf ? user?.personId : selectedPerson?.personId;
    if (!personId) {
      if (forSelf) {
        toast.error(
          "Your account is not linked to a person record. Please contact support."
        );
      } else {
        toast.error("Please select a person for this request.");
      }
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your need.");
      return;
    }

    const amountCents = amount.trim()
      ? Math.round(parseFloat(amount) * 100)
      : undefined;

    updateOrCreateNeed.mutate({
      personId,
      type: needType,
      description: description.trim(),
      amount: amountCents,
      isActive: true,
      visibility,
    });
  };

  const personId = forSelf ? user?.personId : selectedPerson?.personId;
  const canSubmit =
    personId && description.trim() && !updateOrCreateNeed.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Who is this request for? */}
          <div className="space-y-2">
            <Label>Who is this request for?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={forSelf === true ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setForSelf(true);
                  setSelectedPerson(null);
                }}
                className="flex-1"
              >
                Myself
              </Button>
              <Button
                type="button"
                variant={forSelf === false ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setForSelf(false);
                }}
                className="flex-1"
              >
                Someone else
              </Button>
            </div>

            {forSelf === false && (
              <Popover
                open={personSearchOpen}
                onOpenChange={setPersonSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={personSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedPerson ? (
                      <span className="truncate">{selectedPerson.name}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Select person...
                      </span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search people..." />
                    <CommandList>
                      <CommandEmpty>No person found.</CommandEmpty>
                      <CommandGroup>
                        {allPeople.map(person => (
                          <CommandItem
                            key={person.personId}
                            value={person.name || person.personId}
                            onSelect={() => {
                              setSelectedPerson(person);
                              setPersonSearchOpen(false);
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              {person.name || person.personId}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Step 2: Need details */}
          {forSelf !== null && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="need-type">Type</Label>
                <Select
                  value={needType}
                  onValueChange={v => setNeedType(v as NeedType)}
                >
                  <SelectTrigger id="need-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Registration">Registration</SelectItem>
                    <SelectItem value="Transportation">
                      Transportation
                    </SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="need-description">Description *</Label>
                <Textarea
                  id="need-description"
                  placeholder="Describe your need..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {needType === "Registration" && (
                <div className="space-y-2">
                  <Label htmlFor="need-amount">Amount needed ($)</Label>
                  <Input
                    id="need-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="need-visibility">Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={v =>
                    setVisibility(v as "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE")
                  }
                >
                  <SelectTrigger id="need-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEADERSHIP_ONLY">
                      Leadership only
                    </SelectItem>
                    <SelectItem value="DISTRICT_VISIBLE">
                      District visible (community can see)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {updateOrCreateNeed.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
