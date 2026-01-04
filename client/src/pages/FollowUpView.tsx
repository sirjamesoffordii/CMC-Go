import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Person } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function FollowUpView() {
  const [, setLocation] = useLocation();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showOnlyWithNeeds, setShowOnlyWithNeeds] = useState(false);

  // Data queries
  const { data: allPeople = [], isLoading: peopleLoading } = trpc.people.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allDistricts = [] } = trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  // Map needs by personId
  const needsByPersonId = useMemo(() => {
    const map = new Map<string, number>();
    for (const need of allNeeds) {
      if (!need.isActive) continue;
      const count = map.get(need.personId) ?? 0;
      map.set(need.personId, count + 1);
    }
    return map;
  }, [allNeeds]);

  const activeNeedPersonIds = useMemo(() => new Set(allNeeds.map(n => n.personId).filter(Boolean)), [allNeeds]);

  // Filter people with status === "Maybe" and optionally with needs
  const filteredPeople = useMemo(() => {
    let filtered = allPeople.filter(p => p.status === "Maybe" || activeNeedPersonIds.has(p.id));

    if (showOnlyWithNeeds) {
      filtered = filtered.filter(p => {
        const needCount = needsByPersonId.get(p.personId) ?? 0;
        return needCount > 0;
      });
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allPeople, showOnlyWithNeeds, needsByPersonId]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const getDistrictName = (districtId: string | null) => {
    if (!districtId) return "—";
    const district = allDistricts.find(d => d.id === districtId);
    return district?.name ?? "—";
  };

  const getCampusName = (campusId: number | null) => {
    if (!campusId) return "—";
    const campus = allCampuses.find(c => c.id === campusId);
    return campus?.name ?? "—";
  };

  if (peopleLoading) {
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
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Follow-Up View</h1>
          <p className="text-gray-600 mt-2">
            People with status "Maybe" ({filteredPeople.length})
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showOnlyWithNeeds"
              checked={showOnlyWithNeeds}
              onCheckedChange={(checked) => setShowOnlyWithNeeds(checked === true)}
            />
            <Label htmlFor="showOnlyWithNeeds" className="cursor-pointer">
              Show only people with active needs
            </Label>
          </div>
        </div>

        {/* People Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredPeople.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No people found with status "Maybe"
              {showOnlyWithNeeds && " with active needs"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      District
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Needs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPeople.map((person) => {
                    const needCount = needsByPersonId.get(person.personId) ?? 0;
                    return (
                      <tr
                        key={person.id}
                        onClick={() => handlePersonClick(person)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {person.name}
                          </div>
                          {person.primaryRole && (
                            <div className="text-sm text-gray-500">
                              {person.primaryRole}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getDistrictName(person.primaryDistrictId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getCampusName(person.primaryCampusId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {person.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {needCount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {needCount} {needCount === 1 ? "need" : "needs"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Person Details Dialog */}
      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
