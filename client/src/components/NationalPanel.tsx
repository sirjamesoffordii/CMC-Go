// @ts-nocheck
import { X, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PersonRow } from "./PersonRow";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface NationalPanelProps {
  onClose: () => void;
  onPersonClick: (person: any) => void;
  onPersonStatusChange: (personId: string, status: "Yes" | "Maybe" | "No" | "Not Invited") => void;
}

export function NationalPanel({ onClose, onPersonClick, onPersonStatusChange }: NationalPanelProps) {
  const { data: nationalStaffRaw = [], isLoading } = trpc.people.getNational.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const utils = trpc.useUtils();
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: '',
    role: '',
    nationalCategory: '',
    status: 'Not Invited' as "Yes" | "Maybe" | "No" | "Not Invited",
  });

  // Generate name suggestions from existing people and common names
  const nameSuggestions = useMemo(() => {
    const existingNames = new Set<string>();
    allPeople.forEach(p => {
      if (p.name) {
        // Add full name
        existingNames.add(p.name.trim());
        // Add first name
        const firstName = p.name.split(' ')[0]?.trim();
        if (firstName) existingNames.add(firstName);
        // Add last name if exists
        const parts = p.name.trim().split(' ');
        if (parts.length > 1) {
          const lastName = parts[parts.length - 1]?.trim();
          if (lastName) existingNames.add(lastName);
        }
      }
    });
    
    // Common first names
    const commonNames = [
      'Jacob', 'Jake', 'Jacky', 'Jack', 'James', 'John', 'Michael', 'David', 'Daniel', 'Matthew',
      'Sarah', 'Emily', 'Jessica', 'Ashley', 'Amanda', 'Jennifer', 'Michelle', 'Nicole', 'Stephanie',
      'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Charles', 'Mark', 'Donald',
      'Elizabeth', 'Mary', 'Patricia', 'Linda', 'Barbara', 'Susan', 'Karen', 'Nancy', 'Lisa',
      'Joshua', 'Andrew', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason',
      'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura'
    ];
    
    commonNames.forEach(name => existingNames.add(name));
    return Array.from(existingNames).sort();
  }, [allPeople]);

  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.getNational.invalidate();
      utils.people.list.invalidate();
      setIsAddPersonDialogOpen(false);
      setPersonForm({ name: '', role: '', nationalCategory: '', status: 'Not Invited' });
    },
    onError: (error) => {
      console.error('Error creating national staff:', error);
      alert(`Failed to create person: ${error.message || 'Unknown error'}`);
    },
  });

  const handleAddPerson = () => {
    if (!personForm.name.trim()) {
      alert('Please enter a name');
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
    const roleLower = (p.roleTitle || '').toLowerCase();
    return !nameLower.includes('sir james offord') && !roleLower.includes('cmc go coordinator');
  });

  // Define role priority (lower number = higher priority)
  const getRolePriority = (role: string | null): number => {
    if (!role) return 999;
    const roleLower = role.toLowerCase();
    if (roleLower.includes('national director')) return 1;
    if (roleLower.includes('co-director') || roleLower.includes('co director')) return 2;
    if (roleLower.includes('regional director')) return 3;
    if (roleLower.includes('cmc go coordinator')) return 999; // Bottom
    return 50; // Other roles in middle
  };

  // Define person priority within same role
  const getPersonPriority = (name: string): number => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('alex rodriguez')) return 1;
    if (nameLower.includes('abby rodriguez')) return 2;
    return 999;
  };

  // Sort people by role priority, then person priority, then name
  const sortedStaff = [...nationalStaff].sort((a, b) => {
    const rolePriorityA = getRolePriority(a.roleTitle);
    const rolePriorityB = getRolePriority(b.roleTitle);
    
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
  const groupedStaff = sortedStaff.reduce((acc, person) => {
    const role = person.roleTitle || "No Role Assigned";
    const roleLower = role.toLowerCase();
    
    let category = role;
    
    // National Office category for National Director, Co-Director, and other office staff
    if (roleLower.includes('national director') || roleLower.includes('co-director') || roleLower.includes('co director')) {
      category = "National Office";
    }
    // Regional Directors category
    else if (roleLower.includes('regional director')) {
      category = "Regional Directors";
    }
    // Keep other roles as-is (e.g., CMC Go Coordinator)
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(person);
    return acc;
  }, {} as Record<string, typeof nationalStaff>);

  // Sort role groups by priority
  const getCategoryPriority = (category: string): number => {
    if (category === "National Office") return 1;
    if (category === "Regional Directors") return 2;
    return 50;
  };
  
  const sortedRoleGroups = Object.entries(groupedStaff).sort(([catA], [catB]) => {
    return getCategoryPriority(catA) - getCategoryPriority(catB);
  });

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
      <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm shadow-md backdrop-blur-sm">
              XAN
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Chi Alpha National Team</h2>
              <p className="text-sm text-white/90 mt-0.5 font-medium">{stats.total} team members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddPersonDialogOpen(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Person
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-700"></div>
            <span>Going: {stats.going}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
            <span>Maybe: {stats.maybe}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-700"></div>
            <span>Not Going: {stats.notGoing}</span>
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
            <p className="text-sm mt-2">Use the Import feature to add national team members.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRoleGroups.map(([category, people]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 px-2 py-1 bg-slate-50 rounded">
                  {category} ({people.length})
                </h3>
                <div className="space-y-1.5">
                  {people.map((person) => (
                    <PersonRow
                      key={person.personId}
                      person={person}
                      onStatusChange={(status) => onPersonStatusChange(person.personId, status as "Yes" | "Maybe" | "No" | "Not Invited")}
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
      <Dialog open={isAddPersonDialogOpen} onOpenChange={setIsAddPersonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add National Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-person-name">Name *</Label>
              <Input
                id="add-person-name"
                value={personForm.name}
                onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                placeholder="Enter name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPerson();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-role">Role</Label>
              <Input
                id="add-person-role"
                value={personForm.role}
                onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
                placeholder="e.g., National Director, Regional Director"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-category">Category</Label>
              <Input
                id="add-person-category"
                value={personForm.nationalCategory}
                onChange={(e) => setPersonForm({ ...personForm, nationalCategory: e.target.value })}
                placeholder="e.g., National Office, Regional Directors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-person-status">Status</Label>
              <Select
                value={personForm.status}
                onValueChange={(value) => setPersonForm({ ...personForm, status: value as "Yes" | "Maybe" | "No" | "Not Invited" })}
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
            <Button variant="outline" onClick={() => setIsAddPersonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPerson} disabled={!personForm.name.trim() || createPerson.isPending}>
              {createPerson.isPending ? 'Adding...' : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
