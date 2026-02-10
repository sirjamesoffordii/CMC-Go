import { X, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PersonRow } from "./PersonRow";
import { useState, useMemo, useRef } from "react";
import { CHI_ALPHA_STAFF_NAMES } from "@/data/chiAlphaStaffNames";
import { Person } from "../../../drizzle/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface NationalPanelProps {
  onClose: () => void;
  onPersonClick: (person: Person) => void;
  onPersonStatusChange: (
    personId: string,
    status: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
}

export function NationalPanel({
  onClose,
  onPersonClick,
  onPersonStatusChange,
}: NationalPanelProps) {
  const { data: nationalStaffRaw = [], isLoading } =
    trpc.people.getNational.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const utils = trpc.useUtils();
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: "",
    role: "",
    nationalCategory: "",
    status: "Not Invited" as "Yes" | "Maybe" | "No" | "Not Invited",
  });

  // Generate name suggestions from existing people and common names
  const nameSuggestions = useMemo(() => {
    const existingNames = new Set<string>();
    allPeople.forEach(p => {
      if (p.name) {
        // Add full name
        if (p.name) {
          existingNames.add(p.name.trim());
          // Add first name
          const firstName = p.name.split(" ")[0]?.trim();
          if (firstName) existingNames.add(firstName);
          // Add last name if exists
          const parts = p.name.trim().split(" ");
          if (parts.length > 1) {
            const lastName = parts[parts.length - 1]?.trim();
            if (lastName) existingNames.add(lastName);
          }
        }
      }
    });

    // Chi Alpha staff names for autocomplete
    CHI_ALPHA_STAFF_NAMES.forEach(name => existingNames.add(name));
    return Array.from(existingNames).sort();
  }, [allPeople]);

  // Filtered name suggestions (top 3)
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [nameSuggestionsHighlightIndex, setNameSuggestionsHighlightIndex] =
    useState(-1);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const filteredNameSuggestions = useMemo(() => {
    const q = personForm.name.trim().toLowerCase();
    if (!q) return [];
    return nameSuggestions
      .filter(n => n.toLowerCase().includes(q))
      .filter(n => n.toLowerCase() !== q)
      .slice(0, 3);
  }, [personForm.name, nameSuggestions]);

  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.getNational.invalidate();
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.followUp.list.invalidate();
      setIsAddPersonDialogOpen(false);
      setPersonForm({
        name: "",
        role: "",
        nationalCategory: "",
        status: "Not Invited",
      });
    },
    onError: error => {
      console.error("Error creating national staff:", error);
      alert(`Failed to create person: ${error.message || "Unknown error"}`);
    },
  });

  const handleAddPerson = () => {
    if (!personForm.name.trim()) {
      alert("Please enter a name");
      return;
    }

    const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    createPerson.mutate({
      personId,
      name: personForm.name.trim(),
      primaryRole: personForm.role || undefined,
      nationalCategory: personForm.nationalCategory || undefined,
      status: personForm.status,
      // No district or region - this makes them national staff
      primaryDistrictId: undefined,
      primaryRegion: undefined,
      primaryCampusId: undefined,
    });
  };

  // Filter out CMC Go Coordinator and Sir James Offord
  const nationalStaff = nationalStaffRaw.filter(p => {
    const nameLower = p.name.toLowerCase();
    const roleLower = (p.primaryRole || "").toLowerCase();
    return (
      !nameLower.includes("sir james offord") &&
      !roleLower.includes("cmc go coordinator")
    );
  });

  // Define role priority (lower number = higher priority)
  const getRolePriority = (role: string | null): number => {
    if (!role) return 999;
    const roleLower = role.toLowerCase();
    if (roleLower.includes("national director")) return 1;
    if (roleLower.includes("co-director") || roleLower.includes("co director"))
      return 2;
    if (roleLower.includes("regional director")) return 3;
    if (roleLower.includes("cmc go coordinator")) return 999; // Bottom
    return 50; // Other roles in middle
  };

  // Define person priority within same role
  const getPersonPriority = (name: string): number => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("alex rodriguez")) return 1;
    if (nameLower.includes("abby rodriguez")) return 2;
    return 999;
  };

  // Sort people by role priority, then person priority, then name
  const sortedStaff = [...nationalStaff].sort((a, b) => {
    const rolePriorityA = getRolePriority(a.primaryRole);
    const rolePriorityB = getRolePriority(b.primaryRole);

    if (rolePriorityA !== rolePriorityB) {
      return rolePriorityA - rolePriorityB;
    }

    const personPriorityA = getPersonPriority(a.name);
    const personPriorityB = getPersonPriority(b.name);

    if (personPriorityA !== personPriorityB) {
      return personPriorityA - personPriorityB;
    }

    return a.name.localeCompare(b.name);
  });

  // Group all people into categories
  const groupedStaff = sortedStaff.reduce(
    (acc, person) => {
      const role = person.primaryRole || "No Role Assigned";
      const roleLower = role.toLowerCase();

      let category = role;

      // National Office category for National Director, Co-Director, and other office staff
      if (
        roleLower.includes("national director") ||
        roleLower.includes("co-director") ||
        roleLower.includes("co director")
      ) {
        category = "National Office";
      }
      // Regional Directors category
      else if (roleLower.includes("regional director")) {
        category = "Regional Directors";
      }
      // Keep other roles as-is (e.g., CMC Go Coordinator)

      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(person);
      return acc;
    },
    {} as Record<string, typeof nationalStaff>
  );

  // Sort role groups by priority
  const getCategoryPriority = (category: string): number => {
    if (category === "National Office") return 1;
    if (category === "Regional Directors") return 2;
    return 50;
  };

  const sortedRoleGroups = Object.entries(groupedStaff).sort(
    ([catA], [catB]) => {
      return getCategoryPriority(catA) - getCategoryPriority(catB);
    }
  );

  // Calculate stats
  const stats = {
    total: nationalStaff.length,
    going: nationalStaff.filter(p => p.status === "Yes").length,
    maybe: nationalStaff.filter(p => p.status === "Maybe").length,
    notGoing: nationalStaff.filter(p => p.status === "No").length,
    notInvited: nationalStaff.filter(p => p.status === "Not Invited").length,
  };

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md backdrop-blur-sm">
              XAN
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
                National Team
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5 font-medium">
                {stats.total} team members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsAddPersonDialogOpen(true)}
              className="px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Person</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors hidden sm:block"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-700"></div>
            <span>Yes: {stats.going}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
            <span>Maybe: {stats.maybe}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-700"></div>
            <span>No: {stats.notGoing}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
            <span>Not Invited: {stats.notInvited}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : nationalStaff.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No national staff assigned yet.</p>
            <p className="text-sm mt-2">
              Use the Import feature to add national team members.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRoleGroups.map(([category, people]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 px-2 py-1 bg-slate-50 rounded">
                  {category} ({people.length})
                </h3>
                <div className="space-y-1.5">
                  {people.map(person => (
                    <PersonRow
                      key={person.personId}
                      person={person}
                      onStatusChange={status =>
                        onPersonStatusChange(
                          person.personId,
                          status as "Yes" | "Maybe" | "No" | "Not Invited"
                        )
                      }
                      onClick={() => onPersonClick(person)}
                      onPersonUpdate={() => {
                        utils.people.getNational.invalidate();
                        utils.people.list.invalidate();
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Person Dialog */}
      <Dialog
        open={isAddPersonDialogOpen}
        onOpenChange={setIsAddPersonDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add National Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 relative">
              <Label htmlFor="add-person-name">Name *</Label>
              <Input
                ref={nameInputRef}
                id="add-person-name"
                value={personForm.name}
                onChange={e => {
                  setPersonForm({ ...personForm, name: e.target.value });
                  setNameSuggestionsHighlightIndex(
                    filteredNameSuggestions.length > 0 ? 0 : -1
                  );
                }}
                onFocus={() => setNameInputFocused(true)}
                onBlur={() => setTimeout(() => setNameInputFocused(false), 150)}
                onKeyDown={e => {
                  if (
                    e.key === "ArrowDown" &&
                    filteredNameSuggestions.length > 0
                  ) {
                    e.preventDefault();
                    setNameSuggestionsHighlightIndex(i =>
                      i < filteredNameSuggestions.length - 1 ? i + 1 : i
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setNameSuggestionsHighlightIndex(i => (i > 0 ? i - 1 : 0));
                  } else if (
                    e.key === "Enter" &&
                    nameSuggestionsHighlightIndex >= 0 &&
                    filteredNameSuggestions[nameSuggestionsHighlightIndex]
                  ) {
                    e.preventDefault();
                    setPersonForm({
                      ...personForm,
                      name: filteredNameSuggestions[
                        nameSuggestionsHighlightIndex
                      ],
                    });
                    setNameInputFocused(false);
                    setNameSuggestionsHighlightIndex(-1);
                  } else if (
                    e.key === "Enter" &&
                    nameSuggestionsHighlightIndex < 0
                  ) {
                    handleAddPerson();
                  } else if (e.key === "Escape") {
                    setNameInputFocused(false);
                    setNameSuggestionsHighlightIndex(-1);
                  }
                }}
                placeholder="Enter name"
                spellCheck={true}
                autoComplete="off"
              />
              {nameInputFocused && filteredNameSuggestions.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {filteredNameSuggestions.map((name, idx) => (
                    <li
                      key={`${name}-${idx}`}
                      role="option"
                      aria-selected={idx === nameSuggestionsHighlightIndex}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        idx === nameSuggestionsHighlightIndex
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                      onMouseDown={e => {
                        e.preventDefault();
                        setPersonForm({
                          ...personForm,
                          name,
                        });
                        setNameInputFocused(false);
                        setNameSuggestionsHighlightIndex(-1);
                      }}
                      onMouseEnter={() => setNameSuggestionsHighlightIndex(idx)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-role">Role</Label>
              <Input
                id="add-person-role"
                value={personForm.role}
                onChange={e =>
                  setPersonForm({ ...personForm, role: e.target.value })
                }
                placeholder="e.g., National Director, Regional Director"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-category">Category</Label>
              <Input
                id="add-person-category"
                value={personForm.nationalCategory}
                onChange={e =>
                  setPersonForm({
                    ...personForm,
                    nationalCategory: e.target.value,
                  })
                }
                placeholder="e.g., National Office, Regional Directors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-status">Status</Label>
              <Select
                value={personForm.status}
                onValueChange={value =>
                  setPersonForm({
                    ...personForm,
                    status: value as "Yes" | "Maybe" | "No" | "Not Invited",
                  })
                }
              >
                <SelectTrigger id="add-person-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Invited">Not Invited</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="Maybe">Maybe</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPersonDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPerson}
              disabled={!personForm.name.trim() || createPerson.isPending}
            >
              {createPerson.isPending ? "Adding..." : "Add Person"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
