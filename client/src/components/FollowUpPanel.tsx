import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Person } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "./PersonDetailsDialog";
import { X, Download } from "lucide-react";

interface FollowUpPanelProps {
  onClose: () => void;
}

export function FollowUpPanel({ onClose }: FollowUpPanelProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: followUpPeople = [], isLoading } = trpc.followUp.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allDistricts = [] } = trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (followUpPeople.length === 0) return;

    // Create CSV headers
    const headers = ['Name', 'Role', 'Campus', 'District', 'Status', 'Last Updated', 'Active Needs'];
    
    // Create CSV rows
    const rows = followUpPeople.map((person) => {
      const campus = allCampuses.find(c => c.id === person.primaryCampusId);
      const district = allDistricts.find(d => d.id === person.primaryDistrictId);
      const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);
      const needsText = personNeeds.map(need => {
        if (need.amount) {
          return `${need.type} ($${(need.amount / 100).toFixed(2)})`;
        }
        return need.type;
      }).join('; ');

      return [
        person.name || '',
        person.primaryRole || '',
        campus?.name || '',
        district?.name || '',
        person.status || '',
        person.statusLastUpdated ? new Date(person.statusLastUpdated).toLocaleDateString() : 'N/A',
        needsText || '—'
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `follow-up-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full bg-white border-l border-gray-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Follow-Up</h2>
          <p className="text-sm text-gray-600 mt-1">
            People with "Maybe" status or active needs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={followUpPeople.length === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <Download className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Needs
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {followUpPeople.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No follow-up items at this time
                    </td>
                  </tr>
                ) : (
                  followUpPeople.map((person) => {
                    const campus = allCampuses.find(c => c.id === person.primaryCampusId);
                    const district = allDistricts.find(d => d.id === person.primaryDistrictId);
                    const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);

                    return (
                      <tr
                        key={person.personId}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handlePersonClick(person)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{person.name}</div>
                          {person.primaryRole && (
                            <div className="text-xs text-gray-500">{person.primaryRole}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {campus?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {district?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            person.status === "Yes" ? "bg-green-100 text-green-800" :
                            person.status === "Maybe" ? "bg-yellow-100 text-yellow-800" :
                            person.status === "No" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {person.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {person.statusLastUpdated ? new Date(person.statusLastUpdated).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {personNeeds.length > 0 ? (
                            <div className="space-y-1">
                              {personNeeds.map(need => (
                                <div key={need.id} className="text-xs">
                                  {need.type}
                                  {need.amount && ` ($${(need.amount / 100).toFixed(2)})`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
