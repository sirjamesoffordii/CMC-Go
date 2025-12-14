import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Person } from "../../../drizzle/schema";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Fetch data
  const { data: districts = [] } = trpc.districts.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const { data: metrics } = trpc.metrics.get.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  // Mutations
  const updateStatus = trpc.people.updateStatus.useMutation({
    onMutate: async ({ personId, status }) => {
      await utils.people.list.cancel();
      const previousPeople = utils.people.list.getData();
      
      utils.people.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map(p => 
          p.id === personId 
            ? { ...p, status, lastUpdated: new Date() }
            : p
        );
      });

      return { previousPeople };
    },
    onError: (err, variables, context) => {
      if (context?.previousPeople) {
        utils.people.list.setData(undefined, context.previousPeople);
      }
    },
    onSettled: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.followUp.list.invalidate();
    },
  });

  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
    },
  });

  // Filter data for selected district
  const selectedDistrict = useMemo(
    () => districts.find(d => d.id === selectedDistrictId) ?? null,
    [districts, selectedDistrictId]
  );

  const selectedDistrictCampuses = useMemo(
    () => allCampuses.filter(c => c.districtId === selectedDistrictId),
    [allCampuses, selectedDistrictId]
  );

  const selectedDistrictPeople = useMemo(
    () => allPeople.filter(p => p.districtId === selectedDistrictId),
    [allPeople, selectedDistrictId]
  );

  // Add notes/needs indicators to people
  const peopleWithIndicators = useMemo(() => {
    return allPeople.map(person => ({
      ...person,
      hasNeeds: allNeeds.some(n => n.personId === person.id && n.isActive),
    }));
  }, [allPeople, allNeeds]);

  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
  };

  const handlePersonStatusChange = (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => {
    updateStatus.mutate({ personId, status: newStatus });
  };

  const handlePersonAdd = (campusId: number, name: string) => {
    const campus = allCampuses.find(c => c.id === campusId);
    if (!campus) return;
    
    createPerson.mutate({
      name,
      campusId,
      districtId: campus.districtId,
      status: "Not invited yet",
    });
  };

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setPersonDialogOpen(true);
  };

  // Calculate days until CMC (example: June 1, 2026)
  const cmcDate = new Date("2026-06-01");
  const today = new Date();
  const daysUntilCMC = Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">CMC Go</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setLocation("/follow-up")}>
                Follow Up
              </Button>
              <Button variant="outline">More Info</Button>
              <Button>Login</Button>
            </div>
          </div>
          
          {/* Metrics */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600">
                {metrics?.percentInvited ?? 0}%
              </div>
              <div className="text-sm text-gray-600">Invited</div>
            </div>
            <div className="h-12 w-px bg-gray-300" />
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                Going: {metrics?.going ?? 0}
              </div>
              <div className="text-sm text-gray-600">
                Invited: {metrics?.invited ?? 0}
              </div>
            </div>
            <div className="h-12 w-px bg-gray-300" />
            <div>
              <div className="text-xl font-semibold text-gray-900">
                CMC begins in {daysUntilCMC} days
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Left Panel */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            selectedDistrictId ? "w-[420px]" : "w-0"
          } overflow-hidden flex-shrink-0`}
        >
          <DistrictPanel
            district={selectedDistrict}
            campuses={selectedDistrictCampuses}
            people={selectedDistrictPeople}
            onClose={() => setSelectedDistrictId(null)}
            onPersonStatusChange={handlePersonStatusChange}
            onPersonAdd={handlePersonAdd}
            onPersonClick={handlePersonClick}
          />
        </div>

        {/* Map Container */}
        <div className="flex-1 p-8 overflow-auto">
          <InteractiveMap
            districts={districts}
            selectedDistrictId={selectedDistrictId}
            onDistrictSelect={handleDistrictSelect}
          />
        </div>
      </div>

      {/* Person Details Dialog */}
      <PersonDetailsDialog
        person={selectedPerson}
        open={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
      />
    </div>
  );
}
