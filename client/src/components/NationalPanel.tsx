import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PersonRow } from "./PersonRow";

interface NationalPanelProps {
  onClose: () => void;
  onPersonClick: (person: any) => void;
  onPersonStatusChange: (personId: string, status: "Yes" | "Maybe" | "No" | "Not Invited") => void;
}

export function NationalPanel({ onClose, onPersonClick, onPersonStatusChange }: NationalPanelProps) {
  const { data: nationalStaff = [], isLoading } = trpc.people.getNational.useQuery();

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

  // Separate top-level people (National Director, Co-Director) from categorized roles
  const topLevelPeople = sortedStaff.filter(p => {
    const role = (p.roleTitle || '').toLowerCase();
    return role.includes('national director') || role.includes('co-director') || role.includes('co director');
  });

  const categorizedPeople = sortedStaff.filter(p => {
    const role = (p.roleTitle || '').toLowerCase();
    return !role.includes('national director') && !role.includes('co-director') && !role.includes('co director');
  });

  // Group categorized people
  const groupedStaff = categorizedPeople.reduce((acc, person) => {
    const role = person.roleTitle || "No Role Assigned";
    const roleLower = role.toLowerCase();
    
    // Group all regional directors together
    let category = role;
    if (roleLower.includes('regional director')) {
      category = "Regional Directors";
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(person);
    return acc;
  }, {} as Record<string, typeof nationalStaff>);

  // Sort role groups by priority
  const sortedRoleGroups = Object.entries(groupedStaff).sort(([roleA], [roleB]) => {
    return getRolePriority(roleA) - getRolePriority(roleB);
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shadow-md">
              NXA
            </div>
            <div>
              <h2 className="text-xl font-bold">Chi Alpha National Team</h2>
              <p className="text-sm text-white/80">{stats.total} team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>Going: {stats.going}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span>Maybe: {stats.maybe}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span>Not Going: {stats.notGoing}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <span>Not Invited: {stats.notInvited}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : nationalStaff.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No national staff assigned yet.</p>
            <p className="text-sm mt-2">Use the Import feature to add national team members.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top-level people (no category heading) */}
            {topLevelPeople.length > 0 && (
              <div className="space-y-1.5">
                {topLevelPeople.map((person) => (
                  <PersonRow
                    key={person.personId}
                    person={person}
                    onStatusChange={(status) => onPersonStatusChange(person.personId, status as "Yes" | "Maybe" | "No" | "Not Invited")}
                    onClick={() => onPersonClick(person)}
                    onPersonUpdate={() => {}}
                  />
                ))}
              </div>
            )}

            {/* Categorized roles */}
            {sortedRoleGroups.map(([category, people]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 px-2 py-1 bg-gray-50 rounded">
                  {category} ({people.length})
                </h3>
                <div className="space-y-1.5">
                  {people.map((person) => (
                    <PersonRow
                      key={person.personId}
                      person={person}
                      onStatusChange={(status) => onPersonStatusChange(person.personId, status as "Yes" | "Maybe" | "No" | "Not Invited")}
                      onClick={() => onPersonClick(person)}
                      onPersonUpdate={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
