import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PersonRow } from "./PersonRow";

interface NationalPanelProps {
  onClose: () => void;
  onPersonClick: (person: any) => void;
  onPersonStatusChange: (personId: string, status: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
}

export function NationalPanel({ onClose, onPersonClick, onPersonStatusChange }: NationalPanelProps) {
  const { data: nationalStaff = [], isLoading } = trpc.people.getNational.useQuery();

  // Group by role for better organization
  const groupedStaff = nationalStaff.reduce((acc, person) => {
    const role = person.roleTitle || "No Role Assigned";
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(person);
    return acc;
  }, {} as Record<string, typeof nationalStaff>);

  // Calculate stats
  const stats = {
    total: nationalStaff.length,
    going: nationalStaff.filter(p => p.status === "Going").length,
    maybe: nationalStaff.filter(p => p.status === "Maybe").length,
    notGoing: nationalStaff.filter(p => p.status === "Not Going").length,
    notInvited: nationalStaff.filter(p => p.status === "Not invited yet").length,
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
          <div className="space-y-6">
            {Object.entries(groupedStaff).map(([role, people]) => (
              <div key={role} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 px-2 py-1 bg-gray-50 rounded">
                  {role} ({people.length})
                </h3>
                <div className="space-y-1">
                  {people.map((person) => (
                    <PersonRow
                      key={person.personId}
                      person={person}
                      onStatusChange={(status) => onPersonStatusChange(person.personId, status as "Not invited yet" | "Maybe" | "Going" | "Not Going")}
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
