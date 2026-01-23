import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Person, District, Campus } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "./PersonDetailsDialog";
import {
  X,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DISTRICT_REGION_MAP } from "@/lib/regions";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatStatusLabel } from "@/utils/statusLabel";

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
  const [statusFilter, setStatusFilter] = useState<
    Set<"Yes" | "Maybe" | "No" | "Not Invited">
  >(new Set());
  const [needFilter, setNeedFilter] = useState<
    Set<"Financial" | "Transportation" | "Housing" | "Other" | "Need Met">
  >(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [familyGuestFilter, setFamilyGuestFilter] = useState<
    Set<"spouse" | "children" | "guest">
  >(new Set());
  const [depositPaidFilter, setDepositPaidFilter] = useState<boolean | null>(
    null
  ); // null = no filter, true = paid, false = not paid
  const [searchQuery, setSearchQuery] = useState("");
  const [myCampusOnly, setMyCampusOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    "Region" | "District" | "Campus" | "Individual" | "Update"
  >("District");
  const [order, setOrder] = useState<"Greatest first" | "Least first">(
    "Greatest first"
  );

  // Expansion state - regions, districts, and campuses
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set()
  );
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(
    new Set()
  );
  const [expandedCampuses, setExpandedCampuses] = useState<Set<number>>(
    new Set()
  );

  // Data queries
  const { data: allPeople = [], isLoading: peopleLoading } =
    trpc.people.list.useQuery();
  const { data: allCampuses = [], isLoading: campusesLoading } =
    trpc.campuses.list.useQuery();
  const { data: allDistricts = [], isLoading: districtsLoading } =
    trpc.districts.list.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  // Get unique roles from all people
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    allPeople.forEach((p: Person) => {
      if (p.primaryRole) {
        roles.add(p.primaryRole);
      }
    });
    return Array.from(roles).sort();
  }, [allPeople]);

  // Filter people - handle sanitized data that may not have name field
  const filteredPeople = useMemo(() => {
    let filtered = allPeople as Person[];

    // Status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter((p: Person) => statusFilter.has(p.status));
    }

    // Need filter
    if (needFilter.size > 0) {
      filtered = filtered.filter((p: Person) => {
        const personNeeds = allNeeds.filter(
          n => n.personId === p.personId && n.isActive
        );
        const personNeedTypes = new Set(personNeeds.map(n => n.type));

        // Check if "Need Met" is selected (person has no active needs)
        if (needFilter.has("Need Met") && personNeeds.length === 0) {
          return true;
        }

        // Check if person has any of the selected need types (excluding "Need Met")
        const selectedNeedTypes = Array.from(needFilter).filter(
          need => need !== "Need Met"
        );
        if (selectedNeedTypes.length > 0) {
          const hasSelectedNeedType = selectedNeedTypes.some(needType =>
            personNeedTypes.has(needType)
          );
          if (hasSelectedNeedType) return true;
        }

        return false;
      });
    }

    // Role filter
    if (roleFilter.size > 0) {
      filtered = filtered.filter(
        (p: Person) => p.primaryRole && roleFilter.has(p.primaryRole)
      );
    }

    // Family & Guest filter
    if (familyGuestFilter.size > 0) {
      filtered = filtered.filter((p: Person) => {
        if (familyGuestFilter.has("spouse") && p.spouseAttending) return true;
        if (
          familyGuestFilter.has("children") &&
          p.childrenCount &&
          p.childrenCount > 0
        )
          return true;
        if (
          familyGuestFilter.has("guest") &&
          p.guestsCount &&
          p.guestsCount > 0
        )
          return true;
        return false;
      });
    }

    // Deposit Paid filter
    if (depositPaidFilter !== null) {
      filtered = filtered.filter((p: Person) => {
        const hasDepositPaid = p.depositPaid === true;
        return depositPaidFilter === hasDepositPaid;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: Person) =>
          (p.name?.toLowerCase() || "").includes(query) ||
          (p.primaryRole?.toLowerCase() || "").includes(query) ||
          (p.personId?.toLowerCase() || "").includes(query)
      );
    }

    // My campus filter
    if (myCampusOnly && user?.campusId) {
      filtered = filtered.filter(
        (p: Person) => p.primaryCampusId === user.campusId
      );
    }

    return filtered;
  }, [
    allPeople,
    allNeeds,
    statusFilter,
    needFilter,
    roleFilter,
    familyGuestFilter,
    depositPaidFilter,
    searchQuery,
    myCampusOnly,
    user?.campusId,
  ]);

  // Helper function to get region for a district
  const getRegionForDistrict = (districtId: string): string => {
    const district = allDistricts.find(d => d.id === districtId);
    return district?.region || DISTRICT_REGION_MAP[districtId] || "Unknown";
  };

  // Group and sort people based on sortBy and order
  const groupedData = useMemo(() => {
    if (sortBy === "Individual") {
      // Flat list of people
      const sorted = [...filteredPeople].sort((a, b) => {
        const nameA = (a.name || a.personId || "").toLowerCase();
        const nameB = (b.name || b.personId || "").toLowerCase();
        return order === "Greatest first"
          ? nameB.localeCompare(nameA)
          : nameA.localeCompare(nameB);
      });
      return { type: "individual" as const, people: sorted };
    }

    if (sortBy === "Update") {
      // Flat list of people sorted by statusLastUpdated
      const sorted = [...filteredPeople].sort((a, b) => {
        const dateA = a.statusLastUpdated
          ? new Date(a.statusLastUpdated).getTime()
          : 0;
        const dateB = b.statusLastUpdated
          ? new Date(b.statusLastUpdated).getTime()
          : 0;
        // Greatest first = most recent first, Least first = oldest first
        return order === "Greatest first" ? dateB - dateA : dateA - dateB;
      });
      return { type: "individual" as const, people: sorted };
    }

    if (sortBy === "Campus") {
      // Group by Campus -> People
      const campusMap = new Map<number, { campus: Campus; people: Person[] }>();

      filteredPeople.forEach((person: Person) => {
        const campusId = person.primaryCampusId;
        if (campusId) {
          const campus = allCampuses.find(c => c.id === campusId);
          if (campus) {
            if (!campusMap.has(campusId)) {
              campusMap.set(campusId, { campus, people: [] });
            }
            campusMap.get(campusId)!.people.push(person);
          }
        }
      });

      const campuses = Array.from(campusMap.values()).sort((a, b) => {
        const countA = a.people.length;
        const countB = b.people.length;
        if (countA !== countB) {
          return order === "Greatest first" ? countB - countA : countA - countB;
        }
        return a.campus.name.localeCompare(b.campus.name);
      });

      return { type: "campus" as const, campuses };
    }

    if (sortBy === "District") {
      // Group by District -> Campus -> People
      const districtMap = new Map<
        string,
        {
          district: District;
          campuses: Map<number, { campus: Campus; people: any[] }>;
          unassigned: any[];
        }
      >();

      allDistricts.forEach(district => {
        districtMap.set(district.id, {
          district,
          campuses: new Map(),
          unassigned: [],
        });
      });

      filteredPeople.forEach((person: Person) => {
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
            // unassigned feature removed
          }
        } else {
          // unassigned feature removed
        }
      });

      const districts = Array.from(districtMap.values())
        .map(data => {
          const sortedCampuses = Array.from(data.campuses.values()).sort(
            (a, b) => {
              const countA = a.people.length;
              const countB = b.people.length;
              if (countA !== countB) {
                return order === "Greatest first"
                  ? countB - countA
                  : countA - countB;
              }
              return a.campus.name.localeCompare(b.campus.name);
            }
          );
          const newMap = new Map<number, { campus: Campus; people: any[] }>();
          sortedCampuses.forEach(item => {
            newMap.set(item.campus.id, item);
          });
          return { ...data, campuses: newMap };
        })
        .sort((a, b) => {
          const countA =
            Array.from(a.campuses.values()).reduce(
              (sum, c) => sum + c.people.length,
              0
            ) + a.unassigned.length;
          const countB =
            Array.from(b.campuses.values()).reduce(
              (sum, c) => sum + c.people.length,
              0
            ) + b.unassigned.length;
          if (countA !== countB) {
            return order === "Greatest first"
              ? countB - countA
              : countA - countB;
          }
          return a.district.name.localeCompare(b.district.name);
        });

      return { type: "district" as const, districts };
    }

    // sortBy === "Region"
    // Group by Region -> District -> Campus -> People
    const regionMap = new Map<
      string,
      {
        region: string;
        districts: Map<
          string,
          {
            district: District;
            campuses: Map<number, { campus: Campus; people: any[] }>;
            unassigned: any[];
          }
        >;
      }
    >();

    allDistricts.forEach(district => {
      const region =
        district.region || DISTRICT_REGION_MAP[district.id] || "Unknown";
      if (!regionMap.has(region)) {
        regionMap.set(region, { region, districts: new Map() });
      }
      regionMap.get(region)!.districts.set(district.id, {
        district,
        campuses: new Map(),
        unassigned: [],
      });
    });

    filteredPeople.forEach((person: Person) => {
      const districtId = person.primaryDistrictId;
      if (!districtId) return;

      const region = getRegionForDistrict(districtId);
      const regionData = regionMap.get(region);
      if (!regionData) return;

      const districtData = regionData.districts.get(districtId);
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
          // unassigned feature removed
        }
      } else {
        // unassigned feature removed
      }
    });

    const regions = Array.from(regionMap.values())
      .map(regionData => {
        const districts = Array.from(regionData.districts.values())
          .map(districtData => {
            const sortedCampuses = Array.from(
              districtData.campuses.values()
            ).sort((a, b) => {
              const countA = a.people.length;
              const countB = b.people.length;
              if (countA !== countB) {
                return order === "Greatest first"
                  ? countB - countA
                  : countA - countB;
              }
              return a.campus.name.localeCompare(b.campus.name);
            });
            const newMap = new Map<number, { campus: Campus; people: any[] }>();
            sortedCampuses.forEach(item => {
              newMap.set(item.campus.id, item);
            });
            return { ...districtData, campuses: newMap };
          })
          .sort((a, b) => {
            const countA =
              Array.from(a.campuses.values()).reduce(
                (sum, c) => sum + c.people.length,
                0
              ) + a.unassigned.length;
            const countB =
              Array.from(b.campuses.values()).reduce(
                (sum, c) => sum + c.people.length,
                0
              ) + b.unassigned.length;
            if (countA !== countB) {
              return order === "Greatest first"
                ? countB - countA
                : countA - countB;
            }
            return a.district.name.localeCompare(b.district.name);
          });
        return { ...regionData, districts };
      })
      .sort((a, b) => {
        const countA = a.districts.reduce(
          (sum, d) =>
            sum +
            Array.from(d.campuses.values()).reduce(
              (s, c) => s + c.people.length,
              0
            ) +
            d.unassigned.length,
          0
        );
        const countB = b.districts.reduce(
          (sum, d) =>
            sum +
            Array.from(d.campuses.values()).reduce(
              (s, c) => s + c.people.length,
              0
            ) +
            d.unassigned.length,
          0
        );
        if (countA !== countB) {
          return order === "Greatest first" ? countB - countA : countA - countB;
        }
        return a.region.localeCompare(b.region);
      });

    return { type: "region" as const, regions };
  }, [filteredPeople, allDistricts, allCampuses, sortBy, order]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person as Person);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (filteredPeople.length === 0) return;

    // Create CSV headers
    const headers = [
      "Name",
      "Role",
      "Campus",
      "District",
      "Status",
      "Last Updated",
      "Active Needs",
    ];

    // Create CSV rows
    const rows = filteredPeople.map(person => {
      const campus = allCampuses.find(c => c.id === person.primaryCampusId);
      const district = allDistricts.find(
        d => d.id === person.primaryDistrictId
      );
      const personNeeds = allNeeds.filter(
        n => n.personId === person.personId && n.isActive
      );
      const needsText = personNeeds
        .map(need => {
          if (need.amount) {
            return `${need.type} ($${(need.amount / 100).toFixed(2)})`;
          }
          return need.type;
        })
        .join("; ");

      return [
        person.name || "",
        person.primaryRole || "",
        campus?.name || "",
        district?.name || "",
        person.status || "",
        person.statusLastUpdated
          ? new Date(person.statusLastUpdated).toLocaleDateString()
          : "N/A",
        needsText || "—",
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `people-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRegionExpansion = (region: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(region)) {
      newExpanded.delete(region);
    } else {
      newExpanded.add(region);
    }
    setExpandedRegions(newExpanded);
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
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filteredPeople.length === 0}
            className="min-h-11 min-w-11 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Export to CSV"
          >
            <Download className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
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
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Status:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-between min-w-[140px]"
                >
                  <span>
                    {statusFilter.size === 0
                      ? "All Statuses"
                      : statusFilter.size === 1
                        ? formatStatusLabel(Array.from(statusFilter)[0])
                        : `${statusFilter.size} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {(["Yes", "Maybe", "No", "Not Invited"] as const).map(
                    status => {
                      const count = allPeople.filter(
                        (p: Person) => p.status === status
                      ).length;
                      const isChecked = statusFilter.has(status);
                      return (
                        <label
                          key={status}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-100 cursor-pointer"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={checked => {
                              const newFilter = new Set(statusFilter);
                              if (checked) {
                                newFilter.add(status);
                              } else {
                                newFilter.delete(status);
                              }
                              setStatusFilter(newFilter);
                            }}
                          />
                          <span className="text-sm flex-1">
                            {formatStatusLabel(status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({count})
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Need Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Need:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-between min-w-[140px]"
                >
                  <span>
                    {needFilter.size === 0
                      ? "All Needs"
                      : needFilter.size === 1
                        ? Array.from(needFilter)[0]
                        : `${needFilter.size} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {(
                    [
                      "Financial",
                      "Transportation",
                      "Housing",
                      "Other",
                      "Need Met",
                    ] as const
                  ).map(need => {
                    // Calculate count for each need type
                    let count = 0;
                    if (need === "Need Met") {
                      // Count people with no active needs
                      count = allPeople.filter((p: Person) => {
                        const personNeeds = allNeeds.filter(
                          n => n.personId === p.personId && n.isActive
                        );
                        return personNeeds.length === 0;
                      }).length;
                    } else {
                      // Count people with this specific need type
                      count = allPeople.filter((p: Person) => {
                        const personNeeds = allNeeds.filter(
                          n => n.personId === p.personId && n.isActive
                        );
                        return personNeeds.some(n => n.type === need);
                      }).length;
                    }

                    const isChecked = needFilter.has(need);
                    return (
                      <label
                        key={need}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            const newFilter = new Set(needFilter);
                            if (checked) {
                              newFilter.add(need);
                            } else {
                              newFilter.delete(need);
                            }
                            setNeedFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{need}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Role:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-between min-w-[140px]"
                >
                  <span>
                    {roleFilter.size === 0
                      ? "All Roles"
                      : roleFilter.size === 1
                        ? Array.from(roleFilter)[0]
                        : `${roleFilter.size} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-56 p-2 max-h-64 overflow-y-auto"
                align="start"
              >
                <div className="space-y-1">
                  {uniqueRoles.map(role => {
                    const count = allPeople.filter(
                      (p: any) => p.primaryRole === role
                    ).length;
                    const isChecked = roleFilter.has(role);
                    return (
                      <label
                        key={role}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            const newFilter = new Set(roleFilter);
                            if (checked) {
                              newFilter.add(role);
                            } else {
                              newFilter.delete(role);
                            }
                            setRoleFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{role}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Family & Guest Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">
              Family & Guest:
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-between min-w-[140px]"
                >
                  <span>
                    {familyGuestFilter.size === 0
                      ? "All"
                      : familyGuestFilter.size === 1
                        ? Array.from(familyGuestFilter)[0] === "spouse"
                          ? "Spouse"
                          : Array.from(familyGuestFilter)[0] === "children"
                            ? "Children"
                            : "Guest"
                        : `${familyGuestFilter.size} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {[
                    { key: "spouse" as const, label: "Spouse" },
                    { key: "children" as const, label: "Children" },
                    { key: "guest" as const, label: "Guest" },
                  ].map(({ key, label }) => {
                    const count = allPeople.filter((p: any) => {
                      if (key === "spouse") return p.spouseAttending;
                      if (key === "children")
                        return p.childrenCount && p.childrenCount > 0;
                      if (key === "guest")
                        return p.guestsCount && p.guestsCount > 0;
                      return false;
                    }).length;
                    const isChecked = familyGuestFilter.has(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            const newFilter = new Set(familyGuestFilter);
                            if (checked) {
                              newFilter.add(key);
                            } else {
                              newFilter.delete(key);
                            }
                            setFamilyGuestFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{label}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Deposit Paid Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">
              Deposit Paid:
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-between min-w-[140px]"
                >
                  <span>
                    {depositPaidFilter === null
                      ? "All"
                      : depositPaidFilter
                        ? "Paid"
                        : "Not Paid"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {[
                    { value: true, label: "Paid" },
                    { value: false, label: "Not Paid" },
                  ].map(({ value, label }) => {
                    const count = allPeople.filter((p: any) => {
                      const hasDepositPaid = p.depositPaid === true;
                      return hasDepositPaid === value;
                    }).length;
                    const isChecked = depositPaidFilter === value;
                    return (
                      <label
                        key={value.toString()}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            setDepositPaidFilter(checked ? value : null);
                          }}
                        />
                        <span className="text-sm flex-1">{label}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort By Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={value => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Region">Region</SelectItem>
                <SelectItem value="District">District</SelectItem>
                <SelectItem value="Campus">Campus</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Update">Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Order:</span>
            <Select
              value={order}
              onValueChange={value => setOrder(value as typeof order)}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Greatest first">Greatest first</SelectItem>
                <SelectItem value="Least first">Least first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* My Campus Filter */}
          {user?.campusId &&
            (user.role === "STAFF" || user.role === "CO_DIRECTOR") && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMyCampusOnly(!myCampusOnly)}
                  className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target
                  ${
                    myCampusOnly
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
      <div className="flex-1 overflow-y-auto">
        {/* Helper function to render a person */}
        {(() => {
          const renderPerson = (person: any, indentClass: string = "px-12") => {
            const personNeeds = allNeeds.filter(
              n => n.personId === person.personId && n.isActive
            );
            return (
              <div
                key={person.personId}
                className={`${indentClass} py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0`}
                onClick={() => handlePersonClick(person)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        person.status === "Yes"
                          ? "bg-emerald-700"
                          : person.status === "Maybe"
                            ? "bg-yellow-600"
                            : person.status === "No"
                              ? "bg-red-700"
                              : "bg-gray-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {person.name || person.personId || "Person"}
                      </div>
                      {person.primaryRole && (
                        <div className="text-xs text-gray-500 truncate">
                          {person.primaryRole}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
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
                        {personNeeds.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          if (groupedData.type === "individual") {
            if (groupedData.people.length === 0) {
              return (
                <div className="p-6 text-center text-gray-500">
                  No people found
                </div>
              );
            }
            return (
              <div className="divide-y divide-gray-200">
                {groupedData.people.map((person: any) =>
                  renderPerson(person, "px-4")
                )}
              </div>
            );
          }

          if (groupedData.type === "campus") {
            if (groupedData.campuses.length === 0) {
              return (
                <div className="p-6 text-center text-gray-500">
                  No campuses found
                </div>
              );
            }
            return (
              <div className="divide-y divide-gray-200">
                {groupedData.campuses.map(({ campus, people }) => {
                  const isCampusExpanded = expandedCampuses.has(campus.id);
                  const campusNeeds = allNeeds.filter(n =>
                    people.some(p => p.personId === n.personId && n.isActive)
                  );
                  return (
                    <div key={campus.id} className="divide-y divide-gray-100">
                      <div
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleCampusExpansion(campus.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isCampusExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {campus.name}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-600">
                            {people.length}{" "}
                            {people.length === 1 ? "person" : "people"}
                            {campusNeeds.length > 0 &&
                              ` • ${campusNeeds.length} need${campusNeeds.length === 1 ? "" : "s"}`}
                          </div>
                        </div>
                      </div>
                      {isCampusExpanded && people.length > 0 && (
                        <div className="bg-gray-50">
                          {people.map((person: any) =>
                            renderPerson(person, "px-8")
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (groupedData.type === "district") {
            if (groupedData.districts.length === 0) {
              return (
                <div className="p-6 text-center text-gray-500">
                  No districts found
                </div>
              );
            }
            return (
              <div className="divide-y divide-gray-200">
                {groupedData.districts.map(
                  ({ district, campuses, unassigned }) => {
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
                              <h3 className="font-semibold text-gray-900">
                                {district.name}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {district.region}
                              </p>
                            </div>
                            <div className="text-sm text-gray-600">
                              {totalPeople}{" "}
                              {totalPeople === 1 ? "person" : "people"}
                            </div>
                          </div>
                        </div>
                        {isDistrictExpanded && (
                          <div className="bg-gray-50">
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
                                    <div className="px-8 py-2 hover:bg-gray-100 cursor-pointer transition-colors">
                                      <button
                                        onClick={e => {
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
                                          <h4 className="font-medium text-gray-900 text-sm">
                                            {campus.name}
                                          </h4>
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
                                    </div>
                                    {isCampusExpanded && people.length > 0 && (
                                      <div className="bg-white">
                                        {people.map((person: any) =>
                                          renderPerson(person, "px-12")
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                            {unassigned.length > 0 && (
                              <div className="px-8 py-2">
                                <h4 className="font-medium text-gray-500 italic text-sm mb-2">
                                  Unassigned ({unassigned.length})
                                </h4>
                                <div className="bg-white rounded border border-gray-200">
                                  {unassigned.map((person: any) =>
                                    renderPerson(person, "px-4")
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            );
          }

          // groupedData.type === "region"
          if (groupedData.regions.length === 0) {
            return (
              <div className="p-6 text-center text-gray-500">
                No regions found
              </div>
            );
          }
          return (
            <div className="divide-y divide-gray-200">
              {groupedData.regions.map(({ region, districts }) => {
                const isRegionExpanded = expandedRegions.has(region);
                const totalPeople = districts.reduce(
                  (sum, d) =>
                    sum +
                    Array.from(d.campuses.values()).reduce(
                      (s, c) => s + c.people.length,
                      0
                    ) +
                    d.unassigned.length,
                  0
                );
                return (
                  <div key={region} className="divide-y divide-gray-100">
                    <div
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleRegionExpansion(region)}
                    >
                      <div className="flex items-center gap-3">
                        {isRegionExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {region}
                          </h3>
                        </div>
                        <div className="text-sm text-gray-600">
                          {totalPeople}{" "}
                          {totalPeople === 1 ? "person" : "people"}
                        </div>
                      </div>
                    </div>
                    {isRegionExpanded && (
                      <div className="bg-gray-50">
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
                              <div
                                className="px-8 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleDistrictExpansion(district.id);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {isDistrictExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 text-sm">
                                      {district.name}
                                    </h4>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {totalPeople}{" "}
                                    {totalPeople === 1 ? "person" : "people"}
                                  </div>
                                </div>
                              </div>
                              {isDistrictExpanded && (
                                <div className="bg-white">
                                  {Array.from(campuses.values()).map(
                                    ({ campus, people }) => {
                                      const isCampusExpanded =
                                        expandedCampuses.has(campus.id);
                                      const campusNeeds = allNeeds.filter(n =>
                                        people.some(
                                          p =>
                                            p.personId === n.personId &&
                                            n.isActive
                                        )
                                      );
                                      return (
                                        <div
                                          key={campus.id}
                                          className="divide-y divide-gray-100"
                                        >
                                          <div className="px-12 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                toggleCampusExpansion(
                                                  campus.id
                                                );
                                              }}
                                              className="flex items-center gap-2 flex-1 w-full text-left"
                                            >
                                              {isCampusExpanded ? (
                                                <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                              )}
                                              <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 text-sm">
                                                  {campus.name}
                                                </h4>
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
                                          </div>
                                          {isCampusExpanded &&
                                            people.length > 0 && (
                                              <div className="bg-gray-50">
                                                {people.map((person: any) =>
                                                  renderPerson(person, "px-16")
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      );
                                    }
                                  )}
                                  {unassigned.length > 0 && (
                                    <div className="px-12 py-2">
                                      <h4 className="font-medium text-gray-500 italic text-sm mb-2">
                                        Unassigned ({unassigned.length})
                                      </h4>
                                      <div className="bg-gray-50 rounded border border-gray-200">
                                        {unassigned.map((person: any) =>
                                          renderPerson(person, "px-4")
                                        )}
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
                );
              })}
            </div>
          );
        })()}
      </div>

      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
