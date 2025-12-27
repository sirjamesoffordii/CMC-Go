import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Person, District, Campus } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Filter, MoreVertical, ChevronDown, ChevronRight, Edit2, Check } from "lucide-react";
import { useLocation } from "wouter";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EditableText } from "@/components/EditableText";

export default function People() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = usePublicAuth();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<Set<"Yes" | "Maybe" | "No" | "Not Invited">>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [myCampusOnly, setMyCampusOnly] = useState(false);
  
  // Expansion state - districts and campuses
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedCampuses, setExpandedCampuses] = useState<Set<number>>(new Set());
  
  // Menu state
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);
  const [isEditCampusDialogOpen, setIsEditCampusDialogOpen] = useState(false);
  const [campusForm, setCampusForm] = useState({ name: '' });
  
  // Data queries
  const { data: allPeople = [], isLoading: peopleLoading } = trpc.people.list.useQuery();
  const { data: allCampuses = [], isLoading: campusesLoading } = trpc.campuses.list.useQuery();
  const { data: allDistricts = [], isLoading: districtsLoading } = trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();
  
  // Mutations
  const updatePersonStatus = trpc.people.updateStatus.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
    },
  });
  
  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      setIsEditCampusDialogOpen(false);
      setCampusForm({ name: '' });
    },
  });
  
  
  // Filter people
  const filteredPeople = useMemo(() => {
    let filtered = allPeople;
    
    // Status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter(p => statusFilter.has(p.status));
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.primaryRole?.toLowerCase().includes(query) ||
        p.personId?.toLowerCase().includes(query)
      );
    }
    
    // My campus filter
    if (myCampusOnly && user?.campusId) {
      filtered = filtered.filter(p => p.primaryCampusId === user.campusId);
    }
    
    return filtered;
  }, [allPeople, statusFilter, searchQuery, myCampusOnly, user?.campusId]);
  
  // Group people by district and campus
  const districtsWithData = useMemo(() => {
    const districtMap = new Map<string, {
      district: District;
      campuses: Map<number, {
        campus: Campus;
        people: Person[];
      }>;
      unassigned: Person[];
    }>();
    
    // Initialize districts
    allDistricts.forEach(district => {
      districtMap.set(district.id, {
        district,
        campuses: new Map(),
        unassigned: [],
      });
    });
    
    // Group people
    filteredPeople.forEach(person => {
      const districtId = person.primaryDistrictId;
      if (!districtId) return;
      
      const districtData = districtMap.get(districtId);
      if (!districtData) return;
      
      const campusId = person.primaryCampusId;
      if (campusId) {
        const campus = allCampuses.find(c => c.id === campusId);
        if (campus) {
          if (!districtData.campuses.has(campusId)) {
            districtData.campuses.set(campusId, { campus, people: [] });
          }
          districtData.campuses.get(campusId)!.people.push(person);
        } else {
          districtData.unassigned.push(person);
        }
      } else {
        districtData.unassigned.push(person);
      }
    });
    
    // Sort campuses within each district
    districtMap.forEach((data, districtId) => {
      const sortedCampuses = Array.from(data.campuses.values()).sort((a, b) => 
        a.campus.name.localeCompare(b.campus.name)
      );
      const newMap = new Map<number, { campus: Campus; people: Person[] }>();
      sortedCampuses.forEach(item => {
        newMap.set(item.campus.id, item);
      });
      data.campuses = newMap;
    });
    
    return Array.from(districtMap.values()).sort((a, b) => 
      a.district.name.localeCompare(b.district.name)
    );
  }, [filteredPeople, allDistricts, allCampuses]);
  
  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };
  
  const handlePersonStatusChange = (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => {
    updatePersonStatus.mutate({ personId, status: newStatus });
  };
  
  const toggleDistrictExpansion = (districtId: string) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(districtId)) {
      newExpanded.delete(districtId);
    } else {
      newExpanded.add(districtId);
    }
    setExpandedDistricts(newExpanded);
  };
  
  const toggleCampusExpansion = (campusId: number) => {
    const newExpanded = new Set(expandedCampuses);
    if (newExpanded.has(campusId)) {
      newExpanded.delete(campusId);
    } else {
      newExpanded.add(campusId);
    }
    setExpandedCampuses(newExpanded);
  };
  
  const handleEditCampus = (campusId: number) => {
    const campus = allCampuses.find(c => c.id === campusId);
    if (campus) {
      setSelectedCampusId(campusId);
      setCampusForm({ name: campus.name });
      setIsEditCampusDialogOpen(true);
    }
  };
  
  const handleUpdateCampus = () => {
    if (selectedCampusId && campusForm.name.trim()) {
      updateCampusName.mutate({ id: selectedCampusId, name: campusForm.name.trim() });
    }
  };
  
  const handleCampusSortChange = (campusId: number, sortBy: 'status' | 'name' | 'role') => {
    // TODO: Implement campus sorting
    console.log(`Sort campus ${campusId} by ${sortBy}`);
  };
  
  if (peopleLoading || campusesLoading || districtsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">People</h1>
          <p className="text-gray-600 mt-2">
            Hierarchical list view of all districts, campuses, and people
          </p>
        </div>
        
        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search people by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Status:</span>
              {(["Yes", "Maybe", "No", "Not Invited"] as const).map((status) => {
                const count = filteredPeople.filter(p => p.status === status).length;
                const isActive = statusFilter.has(status);
                return (
                  <button
                    key={status}
                    onClick={() => {
                      const newFilter = new Set(statusFilter);
                      if (isActive) {
                        newFilter.delete(status);
                      } else {
                        newFilter.add(status);
                      }
                      setStatusFilter(newFilter);
                    }}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target
                      ${isActive 
                        ? status === "Yes" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300" :
                          status === "Maybe" ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300" :
                          status === "No" ? "bg-red-100 text-red-700 border-2 border-red-300" :
                          "bg-slate-100 text-slate-700 border-2 border-slate-300"
                        : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>
            
            {/* My Campus Filter */}
            {user?.campusId && (user.role === "STAFF" || user.role === "CO_DIRECTOR") && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMyCampusOnly(!myCampusOnly)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target
                    ${myCampusOnly 
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300" 
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  <Filter className="w-4 h-4 inline mr-1" />
                  My Campus Only
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Hierarchical List */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {districtsWithData.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No districts found
              </div>
            ) : (
              districtsWithData.map(({ district, campuses, unassigned }) => {
                const isDistrictExpanded = expandedDistricts.has(district.id);
                const totalPeople = Array.from(campuses.values()).reduce((sum, c) => sum + c.people.length, 0) + unassigned.length;
                
                return (
                  <div key={district.id} className="divide-y divide-gray-100">
                    {/* District Row */}
                    <div 
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleDistrictExpansion(district.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isDistrictExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-gray-900">{district.name}</h2>
                          <p className="text-sm text-gray-500">{district.region}</p>
                        </div>
                        <div className="text-sm text-gray-600">
                          {totalPeople} {totalPeople === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Campuses and People (when expanded) */}
                    {isDistrictExpanded && (
                      <div className="bg-gray-50">
                        {/* Campuses */}
                        {Array.from(campuses.values()).map(({ campus, people }) => {
                          const isCampusExpanded = expandedCampuses.has(campus.id);
                          const campusNeeds = allNeeds.filter(n => 
                            people.some(p => p.personId === n.personId && n.isActive)
                          );
                          
                          return (
                            <div key={campus.id} className="divide-y divide-gray-100">
                              {/* Campus Row */}
                              <div className="px-12 py-3 hover:bg-gray-100 cursor-pointer transition-colors">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCampusExpansion(campus.id);
                                    }}
                                    className="flex items-center gap-2 flex-1"
                                  >
                                    {isCampusExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 text-left">
                                      <h3 className="font-medium text-gray-900">{campus.name}</h3>
                                      <p className="text-xs text-gray-500">
                                        {people.length} {people.length === 1 ? 'person' : 'people'}
                                        {campusNeeds.length > 0 && ` • ${campusNeeds.length} need${campusNeeds.length === 1 ? '' : 's'}`}
                                      </p>
                                    </div>
                                  </button>
                                  
                                  {/* Three Dots Menu */}
                                  {isAuthenticated && (
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(openMenuId === campus.id ? null : campus.id);
                                        }}
                                        className="p-1.5 hover:bg-gray-200 rounded transition-all"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-500" />
                                      </button>
                                      
                                      {openMenuId === campus.id && (
                                        <>
                                          <div 
                                            className="fixed inset-0 z-[5]" 
                                            onClick={() => setOpenMenuId(null)}
                                          ></div>
                                          
                                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                            <button
                                              onClick={() => {
                                                handleEditCampus(campus.id);
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                              Edit Campus Name
                                            </button>
                                            <div className="border-t border-gray-200 my-1"></div>
                                            <div className="px-4 py-1 text-xs text-gray-500 font-medium">Sort by</div>
                                            <button
                                              onClick={() => {
                                                handleCampusSortChange(campus.id, 'status');
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                            >
                                              <span>Status</span>
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                handleCampusSortChange(campus.id, 'name');
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                            >
                                              <span>Name</span>
                                            </button>
                                            <button
                                              onClick={() => {
                                                handleCampusSortChange(campus.id, 'role');
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                            >
                                              <span>Role</span>
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* People (when campus expanded) */}
                              {isCampusExpanded && people.length > 0 && (
                                <div className="bg-white">
                                  {people.map((person) => {
                                    const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);
                                    
                                    return (
                                      <div
                                        key={person.personId}
                                        className="px-20 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                        onClick={() => handlePersonClick(person)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900">{person.name || person.personId}</div>
                                            {person.primaryRole && (
                                              <div className="text-sm text-gray-500">{person.primaryRole}</div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                              person.status === "Yes" ? "bg-green-100 text-green-800" :
                                              person.status === "Maybe" ? "bg-yellow-100 text-yellow-800" :
                                              person.status === "No" ? "bg-red-100 text-red-800" :
                                              "bg-gray-100 text-gray-800"
                                            }`}>
                                              {person.status}
                                            </span>
                                            {personNeeds.length > 0 && (
                                              <span className="text-xs text-yellow-600 font-medium">
                                                {personNeeds.length} need{personNeeds.length === 1 ? '' : 's'}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Unassigned People */}
                        {unassigned.length > 0 && (
                          <div className="px-12 py-3">
                            <h3 className="font-medium text-gray-500 italic mb-2">Unassigned ({unassigned.length})</h3>
                            <div className="bg-white rounded border border-gray-200">
                              {unassigned.map((person) => {
                                const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);
                                
                                return (
                                  <div
                                    key={person.personId}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                    onClick={() => handlePersonClick(person)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{person.name || person.personId}</div>
                                        {person.primaryRole && (
                                          <div className="text-sm text-gray-500">{person.primaryRole}</div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                          person.status === "Yes" ? "bg-green-100 text-green-800" :
                                          person.status === "Maybe" ? "bg-yellow-100 text-yellow-800" :
                                          person.status === "No" ? "bg-red-100 text-red-800" :
                                          "bg-gray-100 text-gray-800"
                                        }`}>
                                          {person.status}
                                        </span>
                                        {personNeeds.length > 0 && (
                                          <span className="text-xs text-yellow-600 font-medium">
                                            {personNeeds.length} need{personNeeds.length === 1 ? '' : 's'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Campus Dialog */}
      <Dialog open={isEditCampusDialogOpen} onOpenChange={setIsEditCampusDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Campus</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-campus-name">Campus Name</Label>
              <Input
                id="edit-campus-name"
                value={campusForm.name}
                onChange={(e) => setCampusForm({ name: e.target.value })}
                placeholder="Enter campus name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditCampusDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateCampus} disabled={!campusForm.name.trim() || updateCampusName.isPending}>
              {updateCampusName.isPending ? 'Updating...' : 'Update Campus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
