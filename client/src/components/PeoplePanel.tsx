import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Person, District, Campus } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "./PersonDetailsDialog";
import { X, Download, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";

interface PeoplePanelProps {
  onClose: () => void;
}

export function PeoplePanel({ onClose }: PeoplePanelProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAuthenticated } = usePublicAuth();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<Set<"Yes" | "Maybe" | "No" | "Not Invited">>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [myCampusOnly, setMyCampusOnly] = useState(false);
  
  // Expansion state - districts and campuses
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedCampuses, setExpandedCampuses] = useState<Set<number>>(new Set());

  // Data queries
  const { data: allPeople = [], isLoading: peopleLoading } = trpc.people.list.useQuery();
  const { data: allCampuses = [], isLoading: campusesLoading } = trpc.campuses.list.useQuery();
  const { data: allDistricts = [], isLoading: districtsLoading } = trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  // Filter people - handle sanitized data that may not have name field
  const filteredPeople = useMemo(() => {
    let filtered = allPeople as any[];
    
    // Status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter((p: any) => statusFilter.has(p.status));
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) => 
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.primaryRole?.toLowerCase() || '').includes(query) ||
        (p.personId?.toLowerCase() || '').includes(query)
      );
    }
    
    // My campus filter
    if (myCampusOnly && user?.campusId) {
      filtered = filtered.filter((p: any) => p.primaryCampusId === user.campusId);
    }
    
    return filtered;
  }, [allPeople, statusFilter, searchQuery, myCampusOnly, user?.campusId]);
  
  // Group people by district and campus
  const districtsWithData = useMemo(() => {
    const districtMap = new Map<string, {
      district: District;
      campuses: Map<number, {
        campus: Campus;
        people: any[];
      }>;
      unassigned: any[];
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
    filteredPeople.forEach((person: any) => {
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
      const newMap = new Map<number, { campus: Campus; people: any[] }>();
      sortedCampuses.forEach(item => {
        newMap.set(item.campus.id, item);
      });
      data.campuses = newMap;
    });
    
    return Array.from(districtMap.values()).sort((a, b) => 
      a.district.name.localeCompare(b.district.name)
    );
  }, [filteredPeople, allDistricts, allCampuses]);

  const handlePersonClick = (person: any) => {
    setSelectedPerson(person as Person);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (filteredPeople.length === 0) return;

    // Create CSV headers
    const headers = ['Name', 'Role', 'Campus', 'District', 'Status', 'Last Updated', 'Active Needs'];
    
    // Create CSV rows
    const rows = filteredPeople.map((person) => {
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
    link.setAttribute('download', `people-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (peopleLoading || campusesLoading || districtsLoading) {
    return (
      <div className="w-full bg-white border-l border-gray-300 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">People</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 p-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-l border-gray-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">People</h2>
          <p className="text-sm text-gray-600 mt-1">
            Hierarchical list view of all districts, campuses, and people
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filteredPeople.length === 0}
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

      {/* Filters Section */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
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

      {/* Content - Hierarchical List */}
      <div className="flex-1">
        {districtsWithData.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No districts found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {districtsWithData.map(({ district, campuses, unassigned }) => {
              const isDistrictExpanded = expandedDistricts.has(district.id);
              const totalPeople = Array.from(campuses.values()).reduce((sum, c) => sum + c.people.length, 0) + unassigned.length;
              
              return (
                <div key={district.id} className="divide-y divide-gray-100">
                  {/* District Row */}
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleDistrictExpansion(district.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isDistrictExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{district.name}</h3>
                        <p className="text-xs text-gray-500">{district.region}</p>
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
                            <div className="px-8 py-2 hover:bg-gray-100 cursor-pointer transition-colors">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCampusExpansion(campus.id);
                                }}
                                className="flex items-center gap-2 flex-1 w-full text-left"
                              >
                                {isCampusExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 text-sm">{campus.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {people.length} {people.length === 1 ? 'person' : 'people'}
                                    {campusNeeds.length > 0 && ` • ${campusNeeds.length} need${campusNeeds.length === 1 ? '' : 's'}`}
                                  </p>
                                </div>
                              </button>
                            </div>
                            
                            {/* People (when campus expanded) */}
                            {isCampusExpanded && people.length > 0 && (
                              <div className="bg-white">
                                {people.map((person: any) => {
                                  const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);
                                  
                                  return (
                                    <div
                                      key={person.personId}
                                      className="px-12 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                      onClick={() => handlePersonClick(person)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1">
                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            person.status === "Yes" ? "bg-emerald-700" :
                                            person.status === "Maybe" ? "bg-yellow-600" :
                                            person.status === "No" ? "bg-red-700" :
                                            "bg-gray-500"
                                          }`} />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">
                                              {person.name || person.personId || 'Person'}
                                            </div>
                                            {person.primaryRole && (
                                              <div className="text-xs text-gray-500 truncate">{person.primaryRole}</div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
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
                        <div className="px-8 py-2">
                          <h4 className="font-medium text-gray-500 italic text-sm mb-2">Unassigned ({unassigned.length})</h4>
                          <div className="bg-white rounded border border-gray-200">
                            {unassigned.map((person: any) => {
                              const personNeeds = allNeeds.filter(n => n.personId === person.personId && n.isActive);
                              
                              return (
                                <div
                                  key={person.personId}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                  onClick={() => handlePersonClick(person)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        person.status === "Yes" ? "bg-emerald-700" :
                                        person.status === "Maybe" ? "bg-yellow-600" :
                                        person.status === "No" ? "bg-red-700" :
                                        "bg-gray-500"
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm truncate">
                                          {person.name || person.personId || 'Person'}
                                        </div>
                                        {person.primaryRole && (
                                          <div className="text-xs text-gray-500 truncate">{person.primaryRole}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
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
            })}
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
