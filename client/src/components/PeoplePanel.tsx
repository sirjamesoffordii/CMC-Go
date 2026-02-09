import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback } from "react";
import { Person, District, Campus } from "../../../drizzle/schema";
import { PersonDetailsDialog } from "./PersonDetailsDialog";
import { ImportModal } from "./ImportModal";
import {
  X,
  Download,
  Upload,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ALL_REGIONS, DISTRICT_REGION_MAP } from "@/lib/regions";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatStatusLabel } from "@/utils/statusLabel";

interface PeoplePanelProps {
  onClose: () => void;
}

export function PeoplePanel({ onClose }: PeoplePanelProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { isAuthenticated: _isAuthenticated } = usePublicAuth();
  const { user } = useAuth();
  const _utils = trpc.useUtils();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<
    Set<"Yes" | "Maybe" | "No" | "Not Invited">
  >(new Set());
  const [needFilter, setNeedFilter] = useState<
    Set<
      "Registration" | "Transportation" | "Housing" | "Other" | "Funds Received"
    >
  >(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [familyGuestFilter, setFamilyGuestFilter] = useState<
    Set<"spouse" | "children" | "guest">
  >(new Set());
  const [depositPaidFilter, setDepositPaidFilter] = useState<boolean | null>(
    null
  ); // null = no filter, true = paid, false = not paid
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [myCampusOnly, setMyCampusOnly] = useState(false);
  // Scope: how to group the table when no scope filter is set
  const [scope, setScope] = useState<"Region" | "District" | "Campus">(
    "Region"
  );
  // Scope filter: show only this region / district / campus (null = all)
  const [scopeFilterRegionId, setScopeFilterRegionId] = useState<string | null>(
    null
  );
  const [scopeFilterDistrictId, setScopeFilterDistrictId] = useState<
    string | null
  >(null);
  const [scopeFilterCampusId, setScopeFilterCampusId] = useState<number | null>(
    null
  );
  const [scopeFilterPersonId, setScopeFilterPersonId] = useState<string | null>(
    null
  );
  const [scopeMenuExpandedCampus, setScopeMenuExpandedCampus] = useState<
    number | null
  >(null);
  // Scope dropdown expand state (like main toolbar)
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [scopeMenuHoverRegion, setScopeMenuHoverRegion] = useState<
    string | null
  >(null);
  const [scopeMenuExpandedRegion, setScopeMenuExpandedRegion] = useState<
    string | null
  >(null);
  const [scopeMenuExpandedDistrict, setScopeMenuExpandedDistrict] = useState<
    string | null
  >(null);
  const [order, setOrder] = useState<
    "Greatest first" | "Least first" | "Last Updated" | "Alphabetical"
  >("Greatest first");

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
  const { data: allNeeds = [] } = trpc.needs.listAll.useQuery();

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
        const personActiveNeeds = allNeeds.filter(
          n => n.personId === p.personId && n.isActive
        );
        const personMetNeeds = allNeeds.filter(
          n => n.personId === p.personId && !n.isActive
        );
        const personNeedTypes = new Set(personActiveNeeds.map(n => n.type));

        // Check if "Funds Received" is selected (person has met/resolved needs)
        if (needFilter.has("Funds Received") && personMetNeeds.length > 0) {
          return true;
        }

        // Check if person has any of the selected need types (excluding "Funds Received")
        const selectedNeedTypes = Array.from(needFilter).filter(
          need => need !== "Funds Received"
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
  const getRegionForDistrict = useCallback(
    (districtId: string): string => {
      const district = allDistricts.find(d => d.id === districtId);
      return district?.region || DISTRICT_REGION_MAP[districtId] || "Unknown";
    },
    [allDistricts]
  );

  // Region -> District -> Campus tree for Scope dropdown (like main toolbar)
  const scopeMenuTree = useMemo(() => {
    return ALL_REGIONS.map(region => ({
      region,
      districts: allDistricts
        .filter(d => (d.region || DISTRICT_REGION_MAP[d.id] || "") === region)
        .map(district => ({
          district,
          campuses: allCampuses.filter(c => c.districtId === district.id),
        })),
    })).filter(r => r.districts.length > 0);
  }, [allDistricts, allCampuses]);

  // User's region: either their direct regionId or overseeRegionId
  // IMPORTANT: This must be declared BEFORE userPeopleScope which references it.
  const userRegionId =
    (user as { regionId?: string | null; overseeRegionId?: string | null })
      ?.regionId ||
    (user as { overseeRegionId?: string | null })?.overseeRegionId ||
    null;

  // User's effective people-scope for filtering the scope dropdown (mirror server getPeopleScope)
  const userPeopleScope = useMemo(():
    | "ALL"
    | { level: "REGION"; regionId: string }
    | { level: "DISTRICT"; districtId: string }
    | { level: "CAMPUS"; campusId: number } => {
    const role = user?.role
      ? String(user.role)
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_")
      : "";
    const fullAccess = [
      "NATIONAL_DIRECTOR",
      "NATIONAL_STAFF",
      "REGION_DIRECTOR",
      "REGIONAL_DIRECTOR",
      "FIELD_DIRECTOR",
      "CMC_GO_ADMIN",
      "ADMIN",
    ].includes(role);
    if (fullAccess) return "ALL";
    const rId =
      userRegionId ?? (user as { regionId?: string | null })?.regionId ?? null;
    if (role === "DISTRICT_DIRECTOR" && rId)
      return { level: "REGION", regionId: rId };
    const dId = (user as { districtId?: string | null })?.districtId ?? null;
    if (role === "CAMPUS_DIRECTOR" && dId)
      return { level: "DISTRICT", districtId: dId };
    const cId = (user as { campusId?: number | null })?.campusId ?? null;
    if (["STAFF", "CO_DIRECTOR"].includes(role) && cId != null)
      return { level: "CAMPUS", campusId: cId };
    return "ALL";
  }, [user, userRegionId]);

  // Scope menu tree filtered to what the user is authorized to see
  const scopeMenuTreeFiltered = useMemo(() => {
    if (userPeopleScope === "ALL") return scopeMenuTree;
    if (userPeopleScope.level === "REGION") {
      return scopeMenuTree.filter(r => r.region === userPeopleScope.regionId);
    }
    if (userPeopleScope.level === "DISTRICT") {
      const districtId = userPeopleScope.districtId;
      return scopeMenuTree
        .map(r => ({
          region: r.region,
          districts: r.districts.filter(d => d.district.id === districtId),
        }))
        .filter(r => r.districts.length > 0);
    }
    if (userPeopleScope.level === "CAMPUS") {
      const campusId = userPeopleScope.campusId;
      const campus = allCampuses.find(c => c.id === campusId);
      if (!campus) return [];
      const districtId = campus.districtId;
      const district = allDistricts.find(d => d.id === districtId);
      const region = district
        ? district.region || DISTRICT_REGION_MAP[district.id] || ""
        : "";
      if (!region) return [];
      return scopeMenuTree
        .filter(r => r.region === region)
        .map(r => ({
          region: r.region,
          districts: r.districts
            .map(d => ({
              district: d.district,
              campuses: d.campuses.filter(c => c.id === campusId),
            }))
            .filter(d => d.campuses.length > 0),
        }))
        .filter(r => r.districts.length > 0);
    }
    return scopeMenuTree;
  }, [scopeMenuTree, userPeopleScope, allCampuses, allDistricts]);

  const isNationalScope = Boolean(
    user?.scopeLevel === "NATIONAL" ||
    (user?.role &&
      ["ADMIN", "NATIONAL_DIRECTOR", "NATIONAL_STAFF"].includes(
        String(user.role)
      ))
  );

  const scopeFilterLabel = scopeFilterPersonId
    ? (allPeople.find((p: Person) => p.personId === scopeFilterPersonId)
        ?.name ?? "Person")
    : scopeFilterCampusId != null
      ? (allCampuses.find(c => c.id === scopeFilterCampusId)?.name ?? "Campus")
      : scopeFilterDistrictId
        ? (allDistricts.find(d => d.id === scopeFilterDistrictId)?.name ??
          "District")
        : scopeFilterRegionId
          ? scopeFilterRegionId
          : isNationalScope
            ? "All Regions"
            : (userRegionId ?? "All Regions");

  const clearScopeFilter = () => {
    setScopeFilterRegionId(null);
    setScopeFilterDistrictId(null);
    setScopeFilterCampusId(null);
    setScopeFilterPersonId(null);
  };

  // Apply scope filter (region / district / campus / person) so table shows only selected scope
  const scopeFilteredPeople = useMemo(() => {
    if (scopeFilterPersonId) {
      return filteredPeople.filter(
        (p: Person) => p.personId === scopeFilterPersonId
      );
    }
    if (scopeFilterCampusId !== null && scopeFilterCampusId !== undefined) {
      const campusId = Number(scopeFilterCampusId);
      return filteredPeople.filter(
        (p: Person) =>
          p.primaryCampusId != null && Number(p.primaryCampusId) === campusId
      );
    }
    if (scopeFilterDistrictId) {
      return filteredPeople.filter(
        (p: Person) => p.primaryDistrictId === scopeFilterDistrictId
      );
    }
    const effectiveRegionId =
      scopeFilterRegionId ||
      (!isNationalScope && userRegionId ? userRegionId : null);
    if (effectiveRegionId) {
      return filteredPeople.filter((p: Person) => {
        const districtId = p.primaryDistrictId;
        if (!districtId) return false;
        return getRegionForDistrict(districtId) === effectiveRegionId;
      });
    }
    return filteredPeople;
  }, [
    filteredPeople,
    scopeFilterPersonId,
    scopeFilterCampusId,
    scopeFilterDistrictId,
    isNationalScope,
    userRegionId,
    scopeFilterRegionId,
    getRegionForDistrict,
  ]);

  type SortByOption = "Name" | "Last updated";

  // Helper: sort people by name or last updated, respecting order
  const sortPeopleBy = useCallback(
    (people: Person[], by: SortByOption) => {
      const sorted = [...people];
      const rev = order === "Least first" ? -1 : 1;
      if (by === "Name") {
        sorted.sort((a, b) => {
          const nameA = (a.name || a.personId || "").toLowerCase();
          const nameB = (b.name || b.personId || "").toLowerCase();
          return rev * nameA.localeCompare(nameB);
        });
      } else {
        // Last updated
        sorted.sort((a, b) => {
          const dateA = (a as Person & { lastEdited?: string | Date })
            .lastEdited
            ? new Date(
                (a as Person & { lastEdited?: string | Date }).lastEdited!
              ).getTime()
            : a.statusLastUpdated
              ? new Date(a.statusLastUpdated).getTime()
              : 0;
          const dateB = (b as Person & { lastEdited?: string | Date })
            .lastEdited
            ? new Date(
                (b as Person & { lastEdited?: string | Date }).lastEdited!
              ).getTime()
            : b.statusLastUpdated
              ? new Date(b.statusLastUpdated).getTime()
              : 0;
          return rev * (dateA - dateB);
        });
      }
      return sorted;
    },
    [order]
  );

  // Group by scope (3 categories only); sort people within each group by name or last updated
  const groupedData = useMemo(() => {
    if (scope === "Campus") {
      // Group by Campus -> People
      const campusMap = new Map<number, { campus: Campus; people: Person[] }>();

      scopeFilteredPeople.forEach((person: Person) => {
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
      campusMap.forEach(c => {
        c.people = sortPeopleBy(
          c.people,
          order === "Last Updated" ? "Last updated" : "Name"
        );
      });

      const campuses = Array.from(campusMap.values()).sort((a, b) => {
        const countA = a.people.length;
        const countB = b.people.length;
        if (countA !== countB) {
          return order === "Least first" ? countA - countB : countB - countA;
        }
        return a.campus.name.localeCompare(b.campus.name);
      });

      return { type: "campus" as const, campuses };
    }

    if (scope === "District") {
      // Group by District -> Campus -> People
      const districtMap = new Map<
        string,
        {
          district: District;
          campuses: Map<number, { campus: Campus; people: Person[] }>;
          unassigned: Person[];
        }
      >();

      const districtIdsWithPeople = new Set(
        scopeFilteredPeople
          .map((p: Person) => p.primaryDistrictId)
          .filter((id): id is string => Boolean(id))
      );

      districtIdsWithPeople.forEach(districtId => {
        const district = allDistricts.find(d => d.id === districtId);
        if (!district) return;
        districtMap.set(district.id, {
          district,
          campuses: new Map(),
          unassigned: [],
        });
      });

      scopeFilteredPeople.forEach((person: Person) => {
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
                return order === "Least first"
                  ? countA - countB
                  : countB - countA;
              }
              return a.campus.name.localeCompare(b.campus.name);
            }
          );
          const newMap = new Map<
            number,
            { campus: Campus; people: Person[] }
          >();
          sortedCampuses.forEach(item => {
            newMap.set(item.campus.id, {
              ...item,
              people: sortPeopleBy(
                item.people,
                order === "Last Updated" ? "Last updated" : "Name"
              ),
            });
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
            return order === "Least first" ? countA - countB : countB - countA;
          }
          return a.district.name.localeCompare(b.district.name);
        });

      return { type: "district" as const, districts };
    }

    // scope === "Region"
    // Group by Region -> District -> Campus -> People
    const regionMap = new Map<
      string,
      {
        region: string;
        districts: Map<
          string,
          {
            district: District;
            campuses: Map<number, { campus: Campus; people: Person[] }>;
            unassigned: Person[];
          }
        >;
      }
    >();

    const noScopeFilter =
      !scopeFilterRegionId &&
      !scopeFilterDistrictId &&
      scopeFilterCampusId == null &&
      !scopeFilterPersonId;

    if (noScopeFilter) {
      // All Regions selected: seed every region and its districts/campuses so all regions are output
      ALL_REGIONS.forEach(region => {
        regionMap.set(region, { region, districts: new Map() });
      });
      allDistricts.forEach(district => {
        const region =
          district.region || DISTRICT_REGION_MAP[district.id] || "Unknown";
        const regionData = regionMap.get(region);
        if (!regionData) return;
        regionData.districts.set(district.id, {
          district,
          campuses: new Map(
            allCampuses
              .filter(c => c.districtId === district.id)
              .map(c => [c.id, { campus: c, people: [] }])
          ),
          unassigned: [],
        });
      });
    } else {
      const districtIdsWithPeople = new Set(
        scopeFilteredPeople
          .map((p: Person) => p.primaryDistrictId)
          .filter((id): id is string => Boolean(id))
      );
      districtIdsWithPeople.forEach(districtId => {
        const district = allDistricts.find(d => d.id === districtId);
        if (!district) return;
        const region =
          district.region || DISTRICT_REGION_MAP[district.id] || "Unknown";
        if (!regionMap.has(region)) {
          regionMap.set(region, { region, districts: new Map() });
        }
        const regionData = regionMap.get(region)!;
        const campuses = allCampuses.filter(c => c.districtId === district.id);
        regionData.districts.set(district.id, {
          district,
          campuses: new Map(
            campuses.map(c => [c.id, { campus: c, people: [] }])
          ),
          unassigned: [],
        });
      });
    }

    scopeFilteredPeople.forEach((person: Person) => {
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
                return order === "Least first"
                  ? countA - countB
                  : countB - countA;
              }
              return a.campus.name.localeCompare(b.campus.name);
            });
            const newMap = new Map<
              number,
              { campus: Campus; people: Person[] }
            >();
            sortedCampuses.forEach(item => {
              newMap.set(item.campus.id, {
                ...item,
                people: sortPeopleBy(
                  item.people,
                  order === "Last Updated" ? "Last updated" : "Name"
                ),
              });
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
              return order === "Least first"
                ? countA - countB
                : countB - countA;
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
          return order === "Least first" ? countA - countB : countB - countA;
        }
        return a.region.localeCompare(b.region);
      });

    return { type: "region" as const, regions };
  }, [
    scopeFilteredPeople,
    allDistricts,
    allCampuses,
    scope,
    order,
    sortPeopleBy,
    getRegionForDistrict,
    scopeFilterRegionId,
    scopeFilterDistrictId,
    scopeFilterCampusId,
    scopeFilterPersonId,
  ]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person as Person);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (scopeFilteredPeople.length === 0) return;

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
      <div className="h-full w-full min-w-0 bg-white border-l border-gray-300 flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">People</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors hidden sm:block"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-w-0 flex-1 flex flex-col bg-white border-l border-gray-300 overflow-hidden">
      {/* Header: search, Scope, Filter, Sort By, kebab — minimal on mobile, premium on desktop */}
      <div className="flex items-center flex-nowrap gap-0.5 sm:gap-2.5 px-1.5 py-0.5 sm:px-4 sm:py-2.5 min-h-0 border-b border-gray-200/90 sm:border-gray-200 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.03)] sm:shadow-[0_1px_0_0_rgba(0,0,0,0.06)] flex-shrink-0">
        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 sm:h-9 sm:w-9 flex-shrink-0 rounded border-gray-200/80 bg-gray-50/50 hover:bg-gray-100/80 hover:border-gray-300/80 sm:rounded-lg"
              aria-label="Search people"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              type="text"
              placeholder="Search people by name or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9"
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <div
          className="h-2.5 w-px sm:h-5 bg-gray-200/80 flex-shrink-0 rounded-full"
          aria-hidden
        />

        {/* Scope */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
            Scope
          </span>
          <Popover
            open={scopeMenuOpen}
            onOpenChange={open => {
              setScopeMenuOpen(open);
              if (!open) {
                setScopeMenuHoverRegion(null);
                setScopeMenuExpandedRegion(null);
                setScopeMenuExpandedDistrict(null);
                setScopeMenuExpandedCampus(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-6 sm:h-9 justify-between min-w-0 w-[72px] sm:w-[100px] rounded sm:rounded-lg border-gray-200/80 bg-white text-gray-700 text-[11px] sm:text-[13px] font-medium hover:bg-gray-50 hover:border-gray-300/80"
              >
                <span className="truncate">{scopeFilterLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-0 max-h-[min(80vh,400px)] overflow-y-auto"
              align="start"
              onOpenAutoFocus={e => e.preventDefault()}
            >
              <div className="py-1">
                {isNationalScope ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearScopeFilter();
                      setScopeMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      !scopeFilterRegionId &&
                      !scopeFilterDistrictId &&
                      scopeFilterCampusId == null &&
                      !scopeFilterPersonId
                        ? "bg-red-50 text-red-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    All Regions
                  </button>
                ) : userRegionId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilterRegionId(userRegionId);
                      setScopeFilterDistrictId(null);
                      setScopeFilterCampusId(null);
                      setScopeFilterPersonId(null);
                      setScopeMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      scopeFilterRegionId === userRegionId ||
                      (!scopeFilterRegionId &&
                        !scopeFilterDistrictId &&
                        scopeFilterCampusId == null &&
                        !scopeFilterPersonId)
                        ? "bg-red-50 text-red-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {userRegionId}
                  </button>
                ) : null}
                {scopeMenuTreeFiltered.map(({ region, districts }) => {
                  const isRegionSelected =
                    scopeFilterRegionId === region &&
                    !scopeFilterDistrictId &&
                    scopeFilterCampusId == null &&
                    !scopeFilterPersonId;
                  const isRegionExpanded =
                    scopeMenuHoverRegion === region ||
                    scopeMenuExpandedRegion === region;
                  return (
                    <div
                      key={region}
                      className="border-b border-gray-100 last:border-b-0"
                      onMouseEnter={() => setScopeMenuHoverRegion(region)}
                      onMouseLeave={() => setScopeMenuHoverRegion(null)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (districts.length > 0) {
                            setScopeMenuExpandedRegion(r =>
                              r === region ? null : region
                            );
                            return;
                          }
                          setScopeFilterRegionId(region);
                          setScopeFilterDistrictId(null);
                          setScopeFilterCampusId(null);
                          setScopeMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                          isRegionSelected
                            ? "bg-red-50 text-red-700 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>{region}</span>
                        {districts.length > 0 && (
                          <ChevronRight
                            className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                              isRegionExpanded ? "rotate-90" : ""
                            }`}
                          />
                        )}
                      </button>
                      {isRegionExpanded && districts.length > 0 && (
                        <div className="bg-gray-50/80 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              setScopeFilterRegionId(region);
                              setScopeFilterDistrictId(null);
                              setScopeFilterCampusId(null);
                              setScopeFilterPersonId(null);
                              setScopeMenuOpen(false);
                            }}
                            className={`w-full pl-6 pr-3 py-2 text-left text-sm font-medium ${
                              isRegionSelected
                                ? "bg-red-50 text-red-700"
                                : "text-gray-800 hover:bg-gray-100"
                            }`}
                          >
                            All of {region}
                          </button>
                          {districts.map(({ district, campuses }) => {
                            const isDistrictSelected =
                              scopeFilterDistrictId === district.id &&
                              scopeFilterCampusId == null &&
                              !scopeFilterPersonId;
                            const isDistrictExpanded =
                              scopeMenuExpandedDistrict === district.id;
                            return (
                              <div key={district.id}>
                                <div
                                  className={`flex items-center w-full pl-6 pr-2 py-2 gap-1 ${
                                    isDistrictSelected
                                      ? "bg-red-50 text-red-700"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (campuses.length > 0) {
                                        setScopeMenuExpandedDistrict(d =>
                                          d === district.id ? null : district.id
                                        );
                                        return;
                                      }
                                      setScopeFilterRegionId(region);
                                      setScopeFilterDistrictId(district.id);
                                      setScopeFilterCampusId(null);
                                      setScopeFilterPersonId(null);
                                      setScopeMenuOpen(false);
                                    }}
                                    className="flex-1 text-left text-sm"
                                  >
                                    {district.name}
                                  </button>
                                  {campuses.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setScopeMenuExpandedDistrict(d =>
                                          d === district.id ? null : district.id
                                        );
                                      }}
                                      className="p-1 rounded hover:bg-gray-200"
                                    >
                                      <ChevronRight
                                        className={`h-4 w-4 text-gray-400 transition-transform ${
                                          scopeMenuExpandedDistrict ===
                                          district.id
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>
                                {isDistrictExpanded && campuses.length > 0 && (
                                  <div className="bg-gray-100/80 border-t border-gray-100">
                                    {campuses.map(campus => {
                                      const isCampusSelected =
                                        scopeFilterCampusId === campus.id &&
                                        !scopeFilterPersonId;
                                      const isCampusExpanded =
                                        scopeMenuExpandedCampus === campus.id;
                                      const campusPeople =
                                        filteredPeople.filter(
                                          (p: Person) =>
                                            p.primaryCampusId === campus.id
                                        );
                                      const selectCampus = (
                                        e: React.MouseEvent
                                      ) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setScopeFilterRegionId(region);
                                        setScopeFilterDistrictId(district.id);
                                        setScopeFilterCampusId(campus.id);
                                        setScopeFilterPersonId(null);
                                        setScopeMenuOpen(false);
                                      };
                                      return (
                                        <div key={campus.id}>
                                          <div
                                            className={`flex items-center w-full pl-9 pr-2 py-2 gap-1 ${
                                              isCampusSelected
                                                ? "bg-red-50 text-red-700"
                                                : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={selectCampus}
                                              className={`flex-1 text-left text-sm ${
                                                isCampusSelected
                                                  ? "font-medium text-red-700"
                                                  : ""
                                              }`}
                                            >
                                              {campus.name}
                                            </button>
                                            {campusPeople.length > 0 && (
                                              <button
                                                type="button"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  setScopeMenuExpandedCampus(
                                                    c =>
                                                      c === campus.id
                                                        ? null
                                                        : campus.id
                                                  );
                                                }}
                                                className="p-1 rounded hover:bg-gray-200"
                                              >
                                                <ChevronRight
                                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                                    isCampusExpanded
                                                      ? "rotate-90"
                                                      : ""
                                                  }`}
                                                />
                                              </button>
                                            )}
                                          </div>
                                          {isCampusExpanded &&
                                            campusPeople.length > 0 && (
                                              <div className="bg-white border-t border-gray-100">
                                                {[...campusPeople]
                                                  .sort((a, b) =>
                                                    (
                                                      a.name ||
                                                      a.personId ||
                                                      ""
                                                    ).localeCompare(
                                                      b.name || b.personId || ""
                                                    )
                                                  )
                                                  .map(person => {
                                                    const isPersonSelected =
                                                      scopeFilterPersonId ===
                                                      person.personId;
                                                    return (
                                                      <button
                                                        key={person.personId}
                                                        type="button"
                                                        onClick={e => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          setScopeFilterRegionId(
                                                            region
                                                          );
                                                          setScopeFilterDistrictId(
                                                            district.id
                                                          );
                                                          setScopeFilterCampusId(
                                                            campus.id
                                                          );
                                                          setScopeFilterPersonId(
                                                            person.personId
                                                          );
                                                          setScopeMenuOpen(
                                                            false
                                                          );
                                                        }}
                                                        className={`w-full pl-12 pr-3 py-2 text-left text-sm ${
                                                          isPersonSelected
                                                            ? "bg-red-50 text-red-700 font-medium"
                                                            : "text-gray-700 hover:bg-gray-100"
                                                        }`}
                                                      >
                                                        {person.name ||
                                                          person.personId ||
                                                          "Person"}
                                                      </button>
                                                    );
                                                  })}
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
                      )}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="h-6 w-px bg-gray-200 flex-shrink-0" aria-hidden />

        {/* Filter */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 sm:h-9 px-1.5 sm:px-2.5 min-w-0 rounded-md sm:rounded-lg border-gray-200/80 bg-white text-gray-700 text-[12px] sm:text-[13px] font-medium hover:bg-gray-50 hover:border-gray-300/80"
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 sm:mr-1" />
                <span className="hidden sm:inline">Filter</span>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 hidden sm:inline" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-0 max-h-[min(80vh,420px)] overflow-y-auto"
              align="start"
            >
              {/* Status */}
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Status
                </div>
                <div className="space-y-0.5">
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
                              if (checked) newFilter.add(status);
                              else newFilter.delete(status);
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
              </div>
              {/* Need */}
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Need
                </div>
                <div className="space-y-0.5">
                  {(
                    [
                      "Registration",
                      "Transportation",
                      "Housing",
                      "Other",
                      "Funds Received",
                    ] as const
                  ).map(need => {
                    let count = 0;
                    if (need === "Funds Received") {
                      count = allPeople.filter((p: Person) => {
                        const personMetNeeds = allNeeds.filter(
                          n => n.personId === p.personId && !n.isActive
                        );
                        return personMetNeeds.length > 0;
                      }).length;
                    } else {
                      count = allPeople.filter((p: Person) => {
                        const personActiveNeeds = allNeeds.filter(
                          n => n.personId === p.personId && n.isActive
                        );
                        return personActiveNeeds.some(n => n.type === need);
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
                            if (checked) newFilter.add(need);
                            else newFilter.delete(need);
                            setNeedFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{need}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Role */}
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Role
                </div>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {uniqueRoles.map(role => {
                    const count = allPeople.filter(
                      (p: Person) => p.primaryRole === role
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
                            if (checked) newFilter.add(role);
                            else newFilter.delete(role);
                            setRoleFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{role}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Family & Guest */}
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Family & Guest
                </div>
                <div className="space-y-0.5">
                  {[
                    { key: "spouse" as const, label: "Spouse" },
                    { key: "children" as const, label: "Children" },
                    { key: "guest" as const, label: "Guest" },
                  ].map(({ key, label }) => {
                    const count = allPeople.filter((p: Person) => {
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
                            if (checked) newFilter.add(key);
                            else newFilter.delete(key);
                            setFamilyGuestFilter(newFilter);
                          }}
                        />
                        <span className="text-sm flex-1">{label}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Deposit paid */}
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  Deposit paid
                </div>
                <div className="space-y-0.5">
                  {[
                    { value: true, label: "Paid" },
                    { value: false, label: "Not Paid" },
                  ].map(({ value, label }) => {
                    const count = allPeople.filter((p: Person) => {
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
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
            Sort By
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-6 sm:h-9 justify-between min-w-0 w-[74px] sm:w-[110px] rounded sm:rounded-lg border-gray-200/80 bg-white text-gray-700 text-[11px] sm:text-[13px] font-medium hover:bg-gray-50 hover:border-gray-300/80"
              >
                <span className="truncate">{order}</span>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-0.5">
                {(
                  [
                    "Greatest first",
                    "Least first",
                    "Last Updated",
                    "Alphabetical",
                  ] as const
                ).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrder(value)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left hover:bg-gray-100 ${
                      order === value ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Kebab: Export */}
        <div className="flex-shrink-0 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-9 sm:w-9 rounded-md sm:rounded-lg border-gray-200/80 bg-white hover:bg-gray-50 hover:border-gray-300/80"
                aria-label="More options"
              >
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                <Upload className="h-4 w-4" />
                Import
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExport}
                disabled={scopeFilteredPeople.length === 0}
              >
                <Download className="h-4 w-4" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* My Campus Filter */}
        {user?.campusId &&
          (user.role === "STAFF" || user.role === "CO_DIRECTOR") && (
            <>
              <div
                className="h-2.5 w-px sm:h-5 bg-gray-200/80 flex-shrink-0 rounded-full hidden sm:block"
                aria-hidden
              />
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setMyCampusOnly(!myCampusOnly)}
                  className={`
                  h-6 sm:h-9 px-1.5 sm:px-2.5 rounded sm:rounded-lg text-[11px] sm:text-[13px] font-medium transition-all border
                  ${
                    myCampusOnly
                      ? "bg-blue-50 text-blue-700 border-blue-200/80"
                      : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:border-gray-300/80"
                  }
                `}
                >
                  <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 sm:mr-1.5" />
                  My Campus Only
                </button>
              </div>
            </>
          )}
      </div>

      {/* Content - Hierarchical List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 flex flex-col">
        {/* Helper function to render a person */}
        {(() => {
          const renderPerson = (
            person: Person,
            indentClass: string = "px-12"
          ) => {
            const personNeeds = allNeeds.filter(
              n => n.personId === person.personId
            );
            return (
              <div
                key={person.personId}
                className={`w-full min-w-0 ${indentClass} py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0`}
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
                    {(person.lastEdited || person.statusLastUpdated) && (
                      <span className="text-xs text-gray-500">
                        Updated:{" "}
                        {person.lastEdited
                          ? new Date(person.lastEdited).toLocaleDateString()
                          : person.statusLastUpdated
                            ? new Date(
                                person.statusLastUpdated
                              ).toLocaleDateString()
                            : ""}
                      </span>
                    )}
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
                  </div>
                </div>
                {/* Need info row */}
                {personNeeds.length > 0 && (
                  <div className="mt-1 ml-4 flex flex-wrap gap-2">
                    {personNeeds.map(need => (
                      <span
                        key={need.id}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          need.isActive
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                            : "bg-green-50 text-green-700 border border-green-200 line-through"
                        }`}
                      >
                        <span className="font-medium">{need.type}</span>
                        {need.amount != null && need.amount > 0 && (
                          <span>
                            $
                            {(need.amount / 100).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        )}
                        {!need.isActive && (
                          <span
                            className="text-green-600 font-semibold no-underline"
                            style={{ textDecoration: "none" }}
                          >
                            ✓
                          </span>
                        )}
                      </span>
                    ))}
                    {person.depositPaid && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="font-medium">Deposit Paid</span>
                        <span className="text-blue-600 font-semibold">✓</span>
                      </span>
                    )}
                  </div>
                )}
                {/* Show deposit paid even when no needs */}
                {personNeeds.length === 0 && person.depositPaid && (
                  <div className="mt-1 ml-4">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="font-medium">Deposit Paid</span>
                      <span className="text-blue-600 font-semibold">✓</span>
                    </span>
                  </div>
                )}
              </div>
            );
          };

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
                              ` • ${campusNeeds.length} request${campusNeeds.length === 1 ? "" : "s"}`}
                          </div>
                        </div>
                      </div>
                      {isCampusExpanded && people.length > 0 && (
                        <div className="bg-gray-50">
                          {people.map((person: Person) =>
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
              <div className="divide-y divide-gray-200 w-full min-w-0">
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
                                        {people.map((person: Person) =>
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
                                  {unassigned.map((person: Person) =>
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
            <div className="divide-y divide-gray-200 w-full min-w-0">
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
                                                {people.map((person: Person) =>
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
                                        {unassigned.map((person: Person) =>
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
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  );
}
