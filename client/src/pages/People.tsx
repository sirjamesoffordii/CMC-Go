import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { Person, District, Campus } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EditableText } from "@/components/EditableText";
import { formatStatusLabel } from "@/utils/statusLabel";

export default function People() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePublicAuth();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state - initialize from URL query parameters
  const getStatusFilterInitial = (): Set<
    "Yes" | "Maybe" | "No" | "Not Invited"
  > => {
    if (typeof window === "undefined") return new Set();
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    if (statusParam) {
      return new Set(
        statusParam.split(",") as Array<"Yes" | "Maybe" | "No" | "Not Invited">
      );
    }
    return new Set();
  };
  const [statusFilter, setStatusFilter] = useState<
    Set<"Yes" | "Maybe" | "No" | "Not Invited">
  >(getStatusFilterInitial());

  const getSearchQueryInitial = (): string => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  };
  const [searchQuery, setSearchQuery] = useState(getSearchQueryInitial());

  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize myCampus from URL params
  const getMyCampusInitial = (): boolean => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("myCampus") === "true";
  };
  const [myCampus, setMyCampus] = useState<boolean>(getMyCampusInitial());

  const getNeedTypeFilterInitial = ():
    | "All"
    | "Financial"
    | "Housing"
    | "Transportation"
    | "Other" => {
    if (typeof window === "undefined") return "All";
    const params = new URLSearchParams(window.location.search);
    const needTypeParam = params.get("needType");
    return (
      (needTypeParam as
        | "All"
        | "Financial"
        | "Housing"
        | "Transportation"
        | "Other") || "All"
    );
  };
  const [needTypeFilter, setNeedTypeFilter] = useState<
    "All" | "Financial" | "Housing" | "Transportation" | "Other"
  >(getNeedTypeFilterInitial());

  const getHasActiveNeedsInitial = (): boolean => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("hasNeeds") === "true";
  };
  const [hasActiveNeeds, setHasActiveNeeds] = useState<boolean>(
    getHasActiveNeedsInitial()
  );

  // Expansion state - districts and campuses
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(
    new Set()
  );
  const [expandedCampuses, setExpandedCampuses] = useState<Set<number>>(
    new Set()
  );

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);
  const [isEditCampusDialogOpen, setIsEditCampusDialogOpen] = useState(false);
  const [campusForm, setCampusForm] = useState({ name: "" });

  // Data queries - ONLY run when authenticated
  const { data: allPeople = [], isLoading: peopleLoading } =
    trpc.people.list.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  const { data: allCampuses = [], isLoading: campusesLoading } =
    trpc.campuses.list.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  const { data: allDistricts = [], isLoading: districtsLoading } =
    trpc.districts.list.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const needsByPersonId = useMemo(() => {
    const map = new Map<string, typeof allNeeds>();
    for (const n of allNeeds) {
      if (!n.isActive) continue;
      const arr = map.get(n.personId) ?? [];
      arr.push(n);
      map.set(n.personId, arr);
    }
    return map;
  }, [allNeeds]);

  const campusById = useMemo(() => {
    const map = new Map<number, Campus>();
    for (const c of allCampuses) map.set(c.id, c);
    return map;
  }, [allCampuses]);

  const districtById = useMemo(() => {
    const map = new Map<string, District>();
    for (const d of allDistricts) map.set(d.id, d);
    return map;
  }, [allDistricts]);

  // Mutations
  const updatePersonStatus = trpc.people.updateStatus.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.followUp.list.invalidate();
    },
  });

  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      setIsEditCampusDialogOpen(false);
      setCampusForm({ name: "" });
    },
  });

  // Sentry test trigger (staging only)
  useEffect(() => {
    const sentryTestParam = new URLSearchParams(window.location.search).get(
      "sentryTest"
    );
    if (
      sentryTestParam === "1" &&
      import.meta.env.VITE_SENTRY_ENVIRONMENT === "staging"
    ) {
      // Clean up URL first
      window.history.replaceState({}, document.title, window.location.pathname);
      throw new Error("Sentry test: staging");
    }
  }, []);

  const filteredPeople = useMemo(() => {
    let filtered = allPeople;

    // Status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter(p => statusFilter.has(p.status));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const needs = needsByPersonId.get(p.personId) ?? [];
        const needsText = needs
          .map(
            n =>
              `${n.type} ${n.description ?? ""} ${n.amount ? (n.amount / 100).toFixed(2) : ""}`
          )
          .join(" ")
          .toLowerCase();
        const campus = p.primaryCampusId
          ? campusById.get(p.primaryCampusId)
          : undefined;
        const districtId = p.primaryDistrictId ?? campus?.districtId;
        const district = districtId ? districtById.get(districtId) : undefined;
        return (
          p.name?.toLowerCase().includes(query) ||
          p.primaryRole?.toLowerCase().includes(query) ||
          p.personId?.toLowerCase().includes(query) ||
          campus?.name.toLowerCase().includes(query) ||
          district?.name.toLowerCase().includes(query) ||
          districtId?.toLowerCase().includes(query) ||
          needsText.includes(query)
        );
      });
    }

    // Need type filter
    if (needTypeFilter !== "All") {
      filtered = filtered.filter(p => {
        const needs = needsByPersonId.get(p.personId) ?? [];
        return needs.some(n => n.type === needTypeFilter);
      });
    }

    // Has active needs filter
    if (hasActiveNeeds) {
      filtered = filtered.filter(p => {
        const needs = needsByPersonId.get(p.personId) ?? [];
        return needs.length > 0;
      });
    }

    // My campus filter
    if (myCampus && user?.campusId) {
      filtered = filtered.filter(p => p.primaryCampusId === user.campusId);
    }

    return filtered;
  }, [
    allPeople,
    statusFilter,
    searchQuery,
    myCampus,
    user?.campusId,
    needTypeFilter,
    hasActiveNeeds,
    needsByPersonId,
    campusById,
    districtById,
  ]);

  // Group people by district and campus, then group districts by region
  const regionsWithDistricts = useMemo(() => {
    type DistrictData = {
      district: District;
      campuses: Map<
        number,
        {
          campus: Campus;
          people: Person[];
        }
      >;
      unassigned: Person[];
    };

    const districtMap = new Map<string, DistrictData>();

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
      const campusId = person.primaryCampusId;
      const campus = campusId ? campusById.get(campusId) : undefined;
      const districtId = person.primaryDistrictId ?? campus?.districtId;
      if (!districtId) return;

      const districtData = districtMap.get(districtId);
      if (!districtData) return;

      if (campusId && campus) {
        if (!districtData.campuses.has(campusId)) {
          districtData.campuses.set(campusId, { campus, people: [] });
        }
        districtData.campuses.get(campusId)!.people.push(person);
      } else {
        // unassigned feature removed
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

    // Group districts by region
    const regionMap = new Map<string, DistrictData[]>();
    Array.from(districtMap.values()).forEach(districtData => {
      const region = districtData.district.region;
      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(districtData);
    });

    // Sort districts within each region and sort regions
    const sortedRegions = Array.from(regionMap.entries())
      .map(([region, districts]) => ({
        region,
        districts: districts.sort((a, b) =>
          a.district.name.localeCompare(b.district.name)
        ),
      }))
      .sort((a, b) => a.region.localeCompare(b.region));

    return sortedRegions;
  }, [filteredPeople, allDistricts, allCampuses, campusById]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handlePersonStatusChange = (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => {
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
      updateCampusName.mutate({
        id: selectedCampusId,
        name: campusForm.name.trim(),
      });
    }
  };

  const handleCampusSortChange = (
    campusId: number,
    sortBy: "status" | "name" | "role"
  ) => {
    // TODO: Implement campus sorting
    console.log(`Sort campus ${campusId} by ${sortBy}`);
  };

  // Sync filter state to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();

    // Add status filter if not empty
    if (statusFilter.size > 0) {
      params.set("status", Array.from(statusFilter).join(","));
    }

    // Add search query if not empty
    if (searchQuery.trim()) {
      params.set("search", searchQuery);
    }

    // Add myCampus if true
    if (myCampus) {
      params.set("myCampus", "true");
    }

    // Add needTypeFilter if not 'All'
    if (needTypeFilter !== "All") {
      params.set("needType", needTypeFilter);
    }

    // Add hasActiveNeeds if true
    if (hasActiveNeeds) {
      params.set("hasNeeds", "true");
    }

    // Update URL without triggering navigation
    const newSearch = params.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [statusFilter, searchQuery, myCampus, needTypeFilter, hasActiveNeeds]);

  useEffect(() => {
    if (!searchOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [searchOpen]);

  // Authentication gate - prevent data leak when logged out
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Map
          </Button>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-4">
                Please log in to view people.
              </p>
              <Button onClick={() => setLocation("/")}>Go to Home</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">People</h1>
              <p className="text-gray-600 mt-2">
                Hierarchical list view of all districts, campuses, and people
              </p>
            </div>

            {/* Search (moved from Home header) */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(!searchOpen)}
                className="bg-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>

              {searchOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSearchOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search people by name, role, ID, or needs..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Type to filter the list below
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="space-y-3">
            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Status:</span>
              {(["Yes", "Maybe", "No", "Not Invited"] as const).map(status => {
                const count = filteredPeople.filter(
                  p => p.status === status
                ).length;
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
                      ${
                        isActive
                          ? status === "Yes"
                            ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                            : status === "Maybe"
                              ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                              : status === "No"
                                ? "bg-red-100 text-red-700 border-2 border-red-300"
                                : "bg-slate-100 text-slate-700 border-2 border-slate-300"
                          : "bg-white text-black border border-gray-300 hover:bg-red-600 hover:text-white"
                      }
                    `}
                  >
                    {formatStatusLabel(status)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Needs Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Needs:</span>
              <button
                onClick={() => setHasActiveNeeds(!hasActiveNeeds)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target
                  ${
                    hasActiveNeeds
                      ? "bg-orange-100 text-orange-700 border-2 border-orange-300"
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                Has active needs
              </button>
            </div>

            {/* Need Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">
                Need Type:
              </span>
              <select
                value={needTypeFilter}
                onChange={e => setNeedTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-white text-black border border-gray-300 hover:bg-red-600 hover:text-white"
              >
                <option value="All">All</option>
                <option value="Financial">Financial</option>
                <option value="Housing">Housing</option>
                <option value="Transportation">Transportation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* My Campus Filter */}
            {user?.campusId &&
              (user.role === "STAFF" || user.role === "CO_DIRECTOR") && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMyCampus(!myCampus)}
                    className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target
                    ${
                      myCampus
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
            {regionsWithDistricts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No districts found
              </div>
            ) : (
              regionsWithDistricts.map(({ region, districts }) => (
                <div key={region}>
                  {/* Region Header */}
                  <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                    <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                      {region}
                    </h2>
                  </div>

                  {/* Districts in Region */}
                  {districts.map(({ district, campuses, unassigned }) => {
                    const isDistrictExpanded = expandedDistricts.has(
                      district.id
                    );
                    const totalPeople =
                      Array.from(campuses.values()).reduce(
                        (sum, c) => sum + c.people.length,
                        0
                      ) + unassigned.length;

                    return (
                      <div
                        key={district.id}
                        className="divide-y divide-gray-100"
                      >
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
                              <h2 className="text-lg font-semibold text-gray-900">
                                {district.name}
                              </h2>
                              <p className="text-sm text-gray-500">
                                {district.region}
                              </p>
                            </div>
                            <div className="text-sm text-gray-600">
                              {totalPeople}{" "}
                              {totalPeople === 1 ? "person" : "people"}
                            </div>
                          </div>
                        </div>

                        {/* Campuses and People (when expanded) */}
                        {isDistrictExpanded && (
                          <div className="bg-gray-50">
                            {/* Campuses */}
                            {Array.from(campuses.values()).map(
                              ({ campus, people }) => {
                                const isCampusExpanded = expandedCampuses.has(
                                  campus.id
                                );
                                const campusNeeds = allNeeds.filter(n =>
                                  people.some(
                                    p => p.personId === n.personId && n.isActive
                                  )
                                );

                                return (
                                  <div
                                    key={campus.id}
                                    className="divide-y divide-gray-100"
                                  >
                                    {/* Campus Row */}
                                    <div className="px-12 py-3 hover:bg-gray-100 cursor-pointer transition-colors">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={e => {
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
                                            <h3 className="font-medium text-gray-900">
                                              {campus.name}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                              {people.length}{" "}
                                              {people.length === 1
                                                ? "person"
                                                : "people"}
                                              {campusNeeds.length > 0 &&
                                                ` • ${campusNeeds.length} need${campusNeeds.length === 1 ? "" : "s"}`}
                                            </p>
                                          </div>
                                        </button>

                                        {/* Three Dots Menu */}
                                        {isAuthenticated && (
                                          <div className="relative">
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setOpenMenuId(
                                                  openMenuId === campus.id
                                                    ? null
                                                    : campus.id
                                                );
                                              }}
                                              className="p-1.5 hover:bg-gray-200 rounded transition-all"
                                            >
                                              <MoreVertical className="w-4 h-4 text-gray-500" />
                                            </button>

                                            {openMenuId === campus.id && (
                                              <>
                                                <div
                                                  className="fixed inset-0 z-[5]"
                                                  onClick={() =>
                                                    setOpenMenuId(null)
                                                  }
                                                ></div>

                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                                  <button
                                                    onClick={() => {
                                                      handleEditCampus(
                                                        campus.id
                                                      );
                                                      setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                                                  >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit Campus Name
                                                  </button>
                                                  <div className="border-t border-gray-200 my-1"></div>
                                                  <div className="px-4 py-1 text-xs text-gray-500 font-medium">
                                                    Sort by
                                                  </div>
                                                  <button
                                                    onClick={() => {
                                                      handleCampusSortChange(
                                                        campus.id,
                                                        "status"
                                                      );
                                                      setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center justify-between transition-colors"
                                                  >
                                                    <span>Status</span>
                                                    <Check className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      handleCampusSortChange(
                                                        campus.id,
                                                        "name"
                                                      );
                                                      setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center justify-between transition-colors"
                                                  >
                                                    <span>Name</span>
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      handleCampusSortChange(
                                                        campus.id,
                                                        "role"
                                                      );
                                                      setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center justify-between transition-colors"
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
                                        {people.map(person => {
                                          const personNeeds = allNeeds.filter(
                                            n =>
                                              n.personId === person.personId &&
                                              n.isActive
                                          );

                                          return (
                                            <div
                                              key={person.personId}
                                              className="px-20 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                              onClick={() =>
                                                handlePersonClick(person)
                                              }
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">
                                                    {person.name ||
                                                      person.personId}
                                                  </div>
                                                  {person.primaryRole && (
                                                    <div className="text-sm text-gray-500">
                                                      {person.primaryRole}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                  <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                      person.status === "Yes"
                                                        ? "bg-green-100 text-green-800"
                                                        : person.status ===
                                                            "Maybe"
                                                          ? "bg-yellow-100 text-yellow-800"
                                                          : person.status ===
                                                              "No"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                                  >
                                                    {person.status}
                                                  </span>
                                                  {personNeeds.length > 0 && (
                                                    <span className="text-xs text-yellow-600 font-medium">
                                                      {personNeeds.length} need
                                                      {personNeeds.length === 1
                                                        ? ""
                                                        : "s"}
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
                              }
                            )}

                            {/* Unassigned People */}
                            {unassigned.length > 0 && (
                              <div className="px-12 py-3">
                                <h3 className="font-medium text-gray-500 italic mb-2">
                                  Unassigned ({unassigned.length})
                                </h3>
                                <div className="bg-white rounded border border-gray-200">
                                  {unassigned.map(person => {
                                    const personNeeds = allNeeds.filter(
                                      n =>
                                        n.personId === person.personId &&
                                        n.isActive
                                    );

                                    return (
                                      <div
                                        key={person.personId}
                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                        onClick={() =>
                                          handlePersonClick(person)
                                        }
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                              {person.name || person.personId}
                                            </div>
                                            {person.primaryRole && (
                                              <div className="text-sm text-gray-500">
                                                {person.primaryRole}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span
                                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                person.status === "Yes"
                                                  ? "bg-green-100 text-green-800"
                                                  : person.status === "Maybe"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : person.status === "No"
                                                      ? "bg-red-100 text-red-800"
                                                      : "bg-gray-100 text-gray-800"
                                              }`}
                                            >
                                              {person.status}
                                            </span>
                                            {personNeeds.length > 0 && (
                                              <span className="text-xs text-yellow-600 font-medium">
                                                {personNeeds.length} need
                                                {personNeeds.length === 1
                                                  ? ""
                                                  : "s"}
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Campus Dialog */}
      <Dialog
        open={isEditCampusDialogOpen}
        onOpenChange={setIsEditCampusDialogOpen}
      >
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
                onChange={e => setCampusForm({ name: e.target.value })}
                placeholder="Enter campus name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditCampusDialogOpen(false)}
              className="text-black hover:bg-red-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateCampus}
              disabled={!campusForm.name.trim() || updateCampusName.isPending}
              className="bg-red-500 hover:bg-red-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateCampusName.isPending ? "Updating..." : "Update Campus"}
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
