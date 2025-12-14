import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Person } from "../../../drizzle/schema";
import { MapPin, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [followUpPanelOpen, setFollowUpPanelOpen] = useState(false);

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

  // Calculate days until CMC
  const cmcDate = new Date('2025-07-06');
  const today = new Date();
  const daysUntilCMC = Math.abs(Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="flex h-screen">
        {/* Left District Panel */}
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

        {/* Center Map Area */}
        <div className="flex-1 relative overflow-auto">
          {/* CMC 2026 Hero Header - Clean banner */}
          <div className="relative h-[180px] overflow-hidden border-b-4 border-gray-800">
            <img 
              src="/cmc-2026-hero.png" 
              alt="CMC 2026" 
              className="w-full h-full object-cover object-[center_45%]"
            />
            
            {/* Header overlay with buttons */}
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-white/90 hover:bg-white text-sm" onClick={() => setLocation("/more-info")}>
                  More Info
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-sm">
                  Login
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="bg-white px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  Going: {metrics?.going ?? 0}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-blue-600">
                    {metrics?.percentInvited ?? 0}% Invited
                  </div>
                  <div className="text-lg text-gray-600">
                    {metrics?.invited ?? 0} / {metrics?.total ?? 0}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-semibold text-gray-700">
                CMC begins in {daysUntilCMC} days
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="px-4 py-8">
            <InteractiveMap
              districts={districts}
              selectedDistrictId={selectedDistrictId}
              onDistrictSelect={handleDistrictSelect}
            />
          </div>
        </div>

        {/* Right Follow Up Panel */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            followUpPanelOpen ? "w-[600px]" : "w-0"
          } overflow-hidden flex-shrink-0`}
        >
          {followUpPanelOpen && <FollowUpPanel onClose={() => setFollowUpPanelOpen(false)} />}
        </div>
      </div>

      {/* Follow Up Tab Button - Fixed to right side */}
      {!followUpPanelOpen && (
        <button
          onClick={() => setFollowUpPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-8 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors z-30 font-semibold"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Follow Up
        </button>
      )}

      <PersonDetailsDialog
        person={selectedPerson}
        open={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
      />
    </div>
  );
}
