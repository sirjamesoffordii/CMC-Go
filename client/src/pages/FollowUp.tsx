import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Person } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function FollowUp() {
  const [, setLocation] = useLocation();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: followUpPeople = [], isLoading } = trpc.followUp.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allDistricts = [] } = trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();
  const { data: allNotes = [] } = trpc.notes.byPerson.useQuery(
    { personId: selectedPerson?.personId ?? '' },
    { enabled: !!selectedPerson }
  );

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Map
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Follow-Up</h1>
          <p className="text-gray-600 mt-2">
            People with "Maybe" status or active needs
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
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
        </div>
      </div>

      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
