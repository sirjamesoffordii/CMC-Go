import {
  Plus,
  User,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronDown,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { District, Campus, Person } from "../../../drizzle/schema";
import { Button } from "./ui/button";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { CHI_ALPHA_STAFF_NAMES } from "@/data/chiAlphaStaffNames";
import { createPortal } from "react-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { ResponsiveDialog } from "./ui/responsive-dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { DroppablePerson } from "./DroppablePerson";
import { CampusDropZone } from "./CampusDropZone";
import { CampusNameDropZone } from "./CampusNameDropZone";
import { CustomDragLayer } from "./CustomDragLayer";
import { DistrictDirectorDropZone } from "./DistrictDirectorDropZone";
import { DistrictStaffDropZone } from "./DistrictStaffDropZone";
import { PersonDropZone } from "./PersonDropZone";
import { DraggableCampusRow } from "./DraggableCampusRow";
import { CampusOrderDropZone } from "./CampusOrderDropZone";
import {
  calculateDistrictStats,
  toDistrictPanelStats,
} from "@/utils/districtStats";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  getPeopleScope,
  canEditDistrictInRegion,
  canViewPersonDetails,
  canEditPersonClient,
} from "@/lib/scopeCheck";

interface DistrictPanelProps {
  district: District | null;
  campuses: Campus[];
  people: Person[];
  isOutOfScope?: boolean;
  onClose: () => void;
  onPersonStatusChange: (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => void;
  onPersonAdd: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
  onDistrictUpdate: () => void;
  onOpenTable?: (filter?: {
    statusFilter?: Set<"Yes" | "Maybe" | "No" | "Not Invited">;
    needsView?: boolean;
  }) => void;
}

// Status mapping between Figma design and database
const statusMap = {
  director: "Yes" as const,
  staff: "Maybe" as const,
  "co-director": "No" as const,
  "not-invited": "Not Invited" as const,
};

const reverseStatusMap = {
  Yes: "director" as const,
  Maybe: "staff" as const,
  No: "co-director" as const,
  "Not Invited": "not-invited" as const,
};

export function DistrictPanel({
  district,
  campuses,
  people,
  isOutOfScope = false,
  onClose: _onClose,
  onPersonStatusChange,
  onPersonAdd: _onPersonAdd,
  onPersonClick: _onPersonClick,
  onDistrictUpdate,
  onOpenTable,
}: DistrictPanelProps) {
  const { isAuthenticated } = usePublicAuth();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Visibility & edit gating (3-tier: Scope / Detail View / Edit):
  //
  // Scope:       Determines which people are shown (names + grey icons).
  //              Controlled by scopeLevel. isOutOfScope means the district is not
  //              in the user's geographic scope → fall back to public aggregates.
  //
  // Detail View: Determines which people's details are visible (roles, needs,
  //              tooltip notes, status colors). Controlled by viewLevel.
  //              Per-person check via canViewPersonDetails().
  //
  // Edit:        Determines which people can be modified. Controlled by editLevel.
  //              Per-person check via canEditPersonClient().
  //
  // For unauthenticated users: public-safe mode (aggregates only, no names).
  const isPublicSafeMode = !isAuthenticated || isOutOfScope;

  // District-level edit check: can the user edit district-level entities (campuses, etc.)?
  const canEditDistrict =
    isAuthenticated &&
    !isOutOfScope &&
    canEditDistrictInRegion(user, district?.region ?? null);

  // Back-compat: canInteract controls district-level operations (add campus, rename district, etc.)
  const canInteract = canEditDistrict;
  // disableEdits: district-level editing disabled (public, out of scope, or no edit access)
  const disableEdits = isPublicSafeMode || !canEditDistrict;

  // Per-person detail and edit helpers (used per DroppablePerson)
  // When person.primaryRegion is null, fall back to district.region so that
  // Regional Directors can still edit people whose primaryRegion wasn't populated.
  const userCanViewDetails = (person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
  }) =>
    isAuthenticated &&
    !isOutOfScope &&
    canViewPersonDetails(user, {
      ...person,
      primaryRegion: person.primaryRegion ?? district?.region ?? null,
    });
  const userCanEditPerson = (person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
  }) =>
    isAuthenticated &&
    !isOutOfScope &&
    canEditPersonClient(user, {
      ...person,
      primaryRegion: person.primaryRegion ?? district?.region ?? null,
    });

  // Campus-level editing: whether the user can edit entities within a specific campus.
  const userCampusId = user?.campusId ?? null;
  const canEditCampus = (campusId: number | null | undefined) => {
    if (!campusId || !isAuthenticated || isOutOfScope) return false;
    if (canEditDistrict) return true;
    // Campus-level editors can edit their own campus
    if (userCampusId && userCampusId === campusId) return true;
    return false;
  };

  // Normalize campus names for fuzzy duplicate detection within a district
  const normalizeCampusName = (name: string | null | undefined) =>
    name
      ? name
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/\buniv(?:ersity)?\b/g, "university")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";

  const hasCampusNameConflict = (name: string, excludeCampusId?: number) => {
    const normalizedNew = normalizeCampusName(name);
    if (!normalizedNew) return false;
    return campusesForLayout.some(campus => {
      if (excludeCampusId != null && campus.id === excludeCampusId)
        return false;
      const normalizedExisting = normalizeCampusName(campus.name ?? "");
      return normalizedExisting && normalizedExisting === normalizedNew;
    });
  };

  // XAN is Chi Alpha National Team, not a district
  const isNationalTeam = district?.id === "XAN";
  const entityName = isNationalTeam ? "Category" : "Campus";
  const _entityNamePlural = isNationalTeam ? "Categories" : "Campuses";
  const _organizationName = isNationalTeam ? "National Team" : "District";

  // Public-safe data sources (always available)
  const districtId = district?.id ?? null;
  const { data: publicDistrictMetrics } = trpc.metrics.district.useQuery(
    { districtId: districtId ?? "" },
    { enabled: !!districtId }
  );
  const { data: publicDistrictLeadership } =
    trpc.metrics.districtLeadership.useQuery(
      { districtId: districtId ?? "" },
      { enabled: !!districtId && isPublicSafeMode }
    );
  const { data: publicCampusMetrics } =
    trpc.metrics.campusesByDistrict.useQuery(
      { districtId: districtId ?? "" },
      { enabled: !!districtId && isPublicSafeMode }
    );
  const { data: publicDistrictNeeds } = trpc.metrics.districtNeeds.useQuery(
    { districtId: districtId ?? "" },
    { enabled: !!districtId }
  );
  const { data: publicCampuses = [] } = trpc.campuses.byDistrict.useQuery(
    { districtId: districtId ?? "" },
    { enabled: !!districtId }
  );

  // In public-safe mode we must still show campuses (public endpoint).
  const campusesForLayout: Campus[] = isPublicSafeMode
    ? (publicCampuses as Campus[])
    : campuses;

  const publicCampusCountMap = useMemo(() => {
    const map = new Map<number, number>();
    (publicCampusMetrics?.campuses ?? []).forEach(entry => {
      map.set(entry.campusId, entry.total);
    });
    return map;
  }, [publicCampusMetrics?.campuses]);

  const publicUnassignedCount = publicCampusMetrics?.unassigned ?? 0;

  const buildPublicPlaceholderPeople = useCallback(
    (count: number, campusId: number | null) => {
      if (count <= 0) return [];
      return Array.from({ length: count }).map((_, index) => {
        const suffix = campusId ?? "unassigned";
        return {
          id: -1 * (Number(campusId ?? 0) * 100000 + index + 1),
          personId: `public-${districtId ?? "district"}-${suffix}-${index + 1}`,
          name: "Hidden",
          primaryRole: null,
          primaryCampusId: campusId,
          primaryDistrictId: districtId,
          primaryRegion: district?.region ?? null,
          nationalCategory: null,
          status: "Not Invited",
          depositPaid: false,
          deposit_paid_at: null,
          statusLastUpdated: null,
          statusLastUpdatedBy: null,
          householdId: null,
          householdRole: "primary",
          needs: null,
          notes: null,
          spouse: null,
          kids: null,
          guests: null,
          spouseAttending: false,
          childrenCount: 0,
          guestsCount: 0,
          childrenAges: null,
          lastEdited: null,
          lastEditedBy: null,
          createdAt: new Date(0),
        } as Person;
      });
    },
    [district?.region, districtId]
  );

  // PR 5: Filter state
  const [statusFilter, _setStatusFilter] = useState<
    Set<"Yes" | "Maybe" | "No" | "Not Invited">
  >(new Set());
  const [searchQuery, _setSearchQuery] = useState("");
  const [myCampusOnly, _setMyCampusOnly] = useState(false);

  // List view state - expanded campuses
  const [_expandedCampuses, _setExpandedCampuses] = useState<Set<number>>(
    new Set()
  );

  const updateDistrictName = trpc.districts.updateName.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  const updateDistrictRegion = trpc.districts.updateRegion.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  const createCampus = trpc.campuses.create.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district?.id ?? "" });
      setCampusForm({ name: "" });
      setIsCampusDialogOpen(false);
      onDistrictUpdate();
    },
    onError: error => {
      console.error("Error creating campus:", error);
      toast.error(
        `Failed to create ${entityName.toLowerCase()}: ${error.message || "Unknown error"}`
      );
    },
  });
  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      onDistrictUpdate();
    },
  });
  const updatePerson = trpc.people.update.useMutation({
    onSuccess: (_data, variables) => {
      utils.people.list.invalidate();
      utils.needs.listActive.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district?.id ?? "" });
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.districtNeeds.invalidate({ districtId: districtId ?? "" });
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      utils.followUp.list.invalidate();
      if (variables.householdId) {
        utils.households.getById.invalidate({ id: variables.householdId });
      }
      utils.households.list.invalidate();
      onDistrictUpdate();
    },
    onError: error => {
      console.error("Error updating person:", error);
      toast.error(`Error updating person: ${error.message || "Unknown error"}`);
    },
  });
  const _updatePersonStatus = trpc.people.updateStatus.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      // Invalidate all people, needs, and metrics so district panel and header update immediately
      utils.people.list.invalidate();
      utils.needs.listActive.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.districtNeeds.invalidate({ districtId: districtId ?? "" });
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      utils.campuses.byDistrict.invalidate({ districtId: district?.id ?? "" });
      onDistrictUpdate();
      // Reset form and close dialog only after successful creation
      setPersonForm({
        name: "",
        role: "Campus Staff",
        status: "not-invited",
        needType: "None",
        needAmount: "",
        fundsReceivedAmount: "",
        needDetails: "",
        notes: "",
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
        childrenAges: [],
        depositPaid: false,
        needsMet: false,
        householdId: null,
      });
      setIsPersonDialogOpen(false);
      setSelectedCampusId(null);
    },
    onError: error => {
      console.error("Error creating person:", error);
      toast.error(`Error creating person: ${error.message || "Unknown error"}`);
    },
  });
  const deletePerson = trpc.people.delete.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.needs.listActive.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.districtNeeds.invalidate({ districtId: districtId ?? "" });
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.campuses.byDistrict.invalidate({ districtId: districtId ?? "" });
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      utils.followUp.list.invalidate();
      setIsEditPersonDialogOpen(false);
      setEditingPerson(null);
      onDistrictUpdate();
    },
  });
  const _archiveCampus = trpc.campuses.archive.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district!.id });
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  const deleteCampus = trpc.campuses.delete.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district!.id });
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  // Dialog states
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [isCampusDialogOpen, setIsCampusDialogOpen] = useState(false);
  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [isEditCampusDialogOpen, setIsEditCampusDialogOpen] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<
    number | string | null
  >(null);
  const [editingPerson, setEditingPerson] = useState<{
    campusId: number | string;
    person: Person;
  } | null>(null);
  const [openCampusMenuId, setOpenCampusMenuId] = useState<number | null>(null);
  const [editingCampusId, setEditingCampusId] = useState<number | null>(null);
  const [campusMenuPosition, setCampusMenuPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [familyGuestsExpanded, setFamilyGuestsExpanded] = useState(false);

  // Refs for dynamic positioning
  const districtNameRef = useRef<HTMLDivElement>(null);
  const inlineCampusNameInputRef = useRef<HTMLInputElement>(null);
  const districtDirectorRef = useRef<HTMLDivElement>(null);
  const campusDirectorRef = useRef<HTMLDivElement>(null);
  const [pieChartOffset, setPieChartOffset] = useState(0);
  const [labelsOffset, setLabelsOffset] = useState(0);
  const _pieChartPadding = Math.max(0, pieChartOffset);
  // Stats grid offset: position first circle under district director
  // labelsOffset is already set to align the circle with director center
  const _statsGridOffset = labelsOffset > 0 ? labelsOffset : 0;

  // Note: Needs and notes are now fetched directly in handleEditPerson to avoid infinite loops
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Authoritative role list - this is the only source of truth
  // Campus rows: Campus Director first, then Co-Director, Staff, Intern, Volunteer (all prefixed with Campus)
  const campusRoles = [
    "Campus Director",
    "Campus Co-Director",
    "Campus Staff",
    "Campus Intern",
    "Campus Volunteer",
    "District Staff",
    "District Director",
    "Regional Staff",
    "Regional Director",
    "Field Director",
    "National Staff",
    "National Director",
  ] as const;
  type CampusRole = (typeof campusRoles)[number];

  // Map old/invalid roles to new authoritative roles
  const mapRoleToAuthoritative = (
    role: string | null | undefined
  ): CampusRole | null => {
    if (!role) return null;

    const roleLower = role.toLowerCase().trim();

    // Direct matches
    if (campusRoles.includes(role as CampusRole)) {
      return role as CampusRole;
    }

    // Map old roles to new roles
    const roleMapping: Record<string, CampusRole> = {
      staff: "Campus Staff",
      "campus staff": "Campus Staff",
      "co-director": "Campus Co-Director",
      "campus co-director": "Campus Co-Director",
      "campus codirector": "Campus Co-Director",
      "campus co director": "Campus Co-Director",
      director: "Campus Director",
      "campus director": "Campus Director",
      "district staff": "District Staff",
      "district director": "District Director",
      dd: "District Director",
      "regional staff": "Regional Staff",
      "regional director": "Regional Director",
      "field director": "Field Director",
      "national staff": "National Staff",
      "national director": "National Director",
      volunteer: "Campus Volunteer",
      "campus volunteer": "Campus Volunteer",
      intern: "Campus Intern",
      "campus intern": "Campus Intern",
    };

    // Check for partial matches
    for (const [key, mappedRole] of Object.entries(roleMapping)) {
      if (roleLower.includes(key)) {
        return mappedRole;
      }
    }

    // Default fallback for unrecognized roles
    return "Campus Staff";
  };

  // Filter roles based on organization - National Team (XAN) gets all roles, districts only get campus-specific roles
  // But always include the current person's role if editing (to prevent errors when editing directors)
  const baseAvailableRoles = isNationalTeam
    ? campusRoles
    : campusRoles.filter(
        role =>
          ![
            "National Director",
            "Regional Director",
            "District Director",
            "Field Director",
            "National Staff",
            "Regional Staff",
          ].includes(role)
      );

  // Determine if we're in district header context (district director or district staff)
  const isDistrictHeaderContext =
    selectedCampusId === "district" ||
    selectedCampusId === "district-staff" ||
    editingPerson?.campusId === "district" ||
    editingPerson?.campusId === "district-staff";

  // In header area: only 2 role choices. XAN = National Director / National Staff; regular district = District Director / District Staff
  const headerRolesOnly = isNationalTeam
    ? (["National Director", "National Staff"] as const)
    : (["District Director", "District Staff"] as const);

  // Filter out 'District Staff' for campus rows. Header = header roles only. XAN category = Regional Director / National Staff only.
  const filteredRoles = isDistrictHeaderContext
    ? [...headerRolesOnly]
    : isNationalTeam
      ? (["Regional Director", "National Staff"] as const)
      : baseAvailableRoles.filter(role => role !== "District Staff");

  // If editing a person, map their role to authoritative role and ensure it's in the available roles list
  const mappedEditingRole = editingPerson?.person?.primaryRole
    ? mapRoleToAuthoritative(editingPerson.person.primaryRole)
    : null;

  const availableRoles =
    mappedEditingRole &&
    !(filteredRoles as readonly CampusRole[]).includes(mappedEditingRole)
      ? [...filteredRoles, mappedEditingRole]
      : filteredRoles;

  // Quick add state
  const [quickAddMode, setQuickAddMode] = useState<string | null>(null); // 'campus-{id}', 'district', 'district'
  const [quickAddName, setQuickAddName] = useState("");
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [personForm, setPersonForm] = useState({
    name: "",
    role: "Campus Staff" as CampusRole,
    status: "not-invited" as keyof typeof statusMap,
    needType: "None" as
      | "None"
      | "Registration"
      | "Transportation"
      | "Housing"
      | "Other",
    needAmount: "",
    fundsReceivedAmount: "",
    needDetails: "",
    notes: "",
    spouseAttending: false,
    childrenCount: 0,
    guestsCount: 0,
    childrenAges: [] as string[],
    depositPaid: false,
    needsMet: false,
    householdId: null as number | null,
  });

  // Validation state
  const [_householdValidationError, setHouseholdValidationError] = useState<
    string | null
  >(null);
  const [_householdNameError, setHouseholdNameError] = useState<string | null>(
    null
  );

  // Household combobox state
  const [householdInputValue, setHouseholdInputValue] = useState("");
  const [householdDropdownOpen, setHouseholdDropdownOpen] = useState(false);
  const [_isEditingHousehold, _setIsEditingHousehold] = useState(false);
  const householdInputRef = useRef<HTMLDivElement>(null);
  const householdDropdownRef = useRef<HTMLDivElement>(null);

  // Name suggestions: live as you type, no auto-save
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [nameSuggestionsHighlightIndex, setNameSuggestionsHighlightIndex] =
    useState(-1);

  const [campusForm, setCampusForm] = useState({
    name: "",
  });

  // Campus sort preferences
  const [campusSorts, setCampusSorts] = useState<
    Record<number, "status" | "name" | "role">
  >({});
  // Preserve order only when user selects Custom; default is Sort by Status
  const [preserveOrder, setPreserveOrder] = useState(false);
  // Store original order of people per campus (by personId)
  const [campusPeopleOrder, setCampusPeopleOrder] = useState<
    Record<number, string[]>
  >({});
  // Track which campus is currently animating a sort (for slow animation)
  const [animatingSortCampus, setAnimatingSortCampus] = useState<number | null>(
    null
  );
  const sortTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Delay re-sort after status change (or "Sort by Status" click) so list doesn't jump; same 2s for all status changes
  const SORT_DELAY_MS = 2000;
  const lastStatusChangeAtRef = useRef<number>(0);
  const previousOrderSnapshotRef = useRef<Record<number, string[]>>({});

  // Cleanup sort timeout on unmount
  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    };
  }, []);

  // Fetch active needs only - used for counting and hasNeeds indicators
  // Only active needs are counted. Inactive needs are retained for history.
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery(undefined, {
    enabled: canEditDistrict,
    retry: false,
  });

  // Fetch households for dropdown
  const { data: allHouseholds = [], error: _householdsError } =
    trpc.households.list.useQuery(undefined, {
      retry: false,
    });
  const [_householdSearchQuery, _setHouseholdSearchQuery] = useState("");
  const { data: _searchedHouseholds = [] } = trpc.households.search.useQuery(
    { query: _householdSearchQuery },
    { enabled: _householdSearchQuery.length > 0 }
  );

  // Fetch all people directly to ensure stats match InteractiveMap exactly
  // This ensures we use the same data source as the map/tooltip for consistency
  const { data: allPeople = [] } = trpc.people.list.useQuery(undefined, {
    enabled: canEditDistrict,
    retry: false,
  });
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery(undefined, {
    enabled: canEditDistrict,
    retry: false,
  });

  // Create household mutation
  const createHousehold = trpc.households.create.useMutation({
    onSuccess: newHousehold => {
      utils.households.list.invalidate();
      setPersonForm({ ...personForm, householdId: newHousehold.id });
      // Display as last name followed by " Household"
      const label = newHousehold.label?.trim();
      const display =
        label && label !== "Household"
          ? label.endsWith(" Household")
            ? label
            : `${label} Household`
          : personForm.name.trim()
            ? `${getLastName(personForm.name)} Household`
            : "Last Name Household";
      setHouseholdInputValue(display);
      setHouseholdDropdownOpen(false);
    },
  });

  // Sync household input value when householdId changes (only when dialog is open and not actively typing)
  useEffect(() => {
    if (
      isPersonDialogOpen &&
      personForm.householdId &&
      !householdDropdownOpen &&
      allHouseholds &&
      allPeople
    ) {
      const household = allHouseholds.find(
        h => h.id === personForm.householdId
      );
      if (household) {
        const members = allPeople.filter(p => p.householdId === household.id);
        const baseName =
          household.label ||
          (members.length > 0
            ? `${members[0].name.split(" ").pop() || "Household"}`
            : "");
        const displayName = baseName.endsWith(" Household")
          ? baseName
          : `${baseName} Household`;
        if (householdInputValue !== displayName) {
          setHouseholdInputValue(displayName);
        }
      }
    } else if (!isPersonDialogOpen) {
      // Clear input when dialog closes
      setHouseholdInputValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    personForm.householdId,
    allHouseholds,
    allPeople,
    isPersonDialogOpen,
    householdDropdownOpen,
  ]);

  // Add Person: default household to last name and auto-match same context (same campus/header)
  useEffect(() => {
    if (
      !isPersonDialogOpen ||
      isEditPersonDialogOpen ||
      !personForm.name.trim() ||
      !allHouseholds?.length ||
      !allPeople?.length
    ) {
      return;
    }
    const lastName = getLastName(personForm.name);
    if (!lastName) return;
    const displayValue = `${lastName} Household`;
    setHouseholdInputValue(displayValue);
    const contextCampusId =
      selectedCampusId === "district" || selectedCampusId === "district-staff"
        ? null
        : typeof selectedCampusId === "number"
          ? selectedCampusId
          : null;
    runHouseholdMatchByLastName(contextCampusId, lastName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPersonDialogOpen,
    isEditPersonDialogOpen,
    personForm.name,
    selectedCampusId,
    allHouseholds,
    allPeople,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!householdDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        householdDropdownRef.current &&
        householdInputRef.current &&
        !householdDropdownRef.current.contains(e.target as Node) &&
        !householdInputRef.current.contains(e.target as Node)
      ) {
        setHouseholdDropdownOpen(false);
      }
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [householdDropdownOpen]);

  // Update household mutation
  const updateHousehold = trpc.households.update.useMutation({
    onSuccess: (_data, variables) => {
      utils.households.list.invalidate();
      utils.households.getById.invalidate({ id: variables.id });
    },
    onError: error => {
      console.error("Error updating household counts:", error);
      // Household count update failure is non-critical
    },
  });

  // Get last name from full name (last word, or full name if single word)
  const getLastName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const parts = trimmed.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1]! : parts[0]!;
  };

  // Get context campus id for current add/edit: null = district header, number = campus row. Used for same-context household matching.
  const getContextCampusId = (): number | null => {
    const context =
      isEditPersonDialogOpen && editingPerson
        ? editingPerson.campusId
        : selectedCampusId;
    if (context === "district" || context === "district-staff") return null;
    if (typeof context === "number") return context;
    return null;
  };

  // Find existing household by last name in same context (same campus or district header) and link person to it. Prevents double-counting.
  const runHouseholdMatchByLastName = (
    contextCampusId: number | null,
    lastName: string
  ) => {
    if (!lastName || !allHouseholds?.length || !allPeople?.length) return;
    const lastNameLower = lastName.toLowerCase().trim();
    const matchingHousehold = allHouseholds.find(h => {
      const members = allPeople.filter(p => p.householdId === h.id);
      const labelMatch =
        h.label &&
        (h.label.toLowerCase().includes(lastNameLower) ||
          h.label
            .toLowerCase()
            .replace(/\s*household\s*$/i, "")
            .trim() === lastNameLower);
      const memberLastNameMatch = members.some(m => {
        const ln = getLastName(m.name || "");
        return ln.toLowerCase() === lastNameLower;
      });
      if (!labelMatch && !memberLastNameMatch) return false;
      const hasMemberInSameContext = members.some(
        m => m.primaryCampusId === contextCampusId
      );
      return hasMemberInSameContext;
    });
    if (matchingHousehold) {
      const members = allPeople.filter(
        p => p.householdId === matchingHousehold.id
      );
      const displayName =
        matchingHousehold.label ||
        (members.length > 0
          ? `${getLastName(members[0]!.name || "")} Household`
          : "Household");
      setPersonForm(prev => ({
        ...prev,
        householdId: matchingHousehold.id,
      }));
      setHouseholdInputValue(
        displayName.endsWith(" Household")
          ? displayName
          : `${displayName} Household`
      );
      setHouseholdValidationError(null);
      setHouseholdNameError(null);
    }
  };

  // Helper to get household members for display
  const _getHouseholdDisplayName = (householdId: number) => {
    const household = allHouseholds.find(h => h.id === householdId);
    if (!household) return `Household ${householdId}`;
    // Always append "Household" to the label
    if (household.label) {
      return household.label.endsWith(" Household")
        ? household.label
        : `${household.label} Household`;
    }
    // Try to get members to show last name
    const members = people.filter(p => p.householdId === householdId);
    if (members.length > 0) {
      const lastName = members[0].name.split(" ").pop() || "Household";
      return `${lastName} Household`;
    }
    return "Household";
  };

  // Validation: Check if household is required
  const isHouseholdRequired =
    personForm.spouseAttending || personForm.childrenCount > 0;
  const _hasHouseholdValidationError =
    isHouseholdRequired && !personForm.householdId;

  const updateOrCreateNeed = trpc.needs.updateOrCreate.useMutation({
    onSuccess: () => {
      utils.needs.listActive.invalidate();
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.districtNeeds.invalidate({ districtId: districtId ?? "" });
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.campuses.byDistrict.invalidate({ districtId: districtId ?? "" });
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
    onError: error => {
      console.error("Error updating need:", error);
      toast.error(`Failed to update need: ${error.message || "Unknown error"}`);
    },
  });
  const _deleteNeed = trpc.needs.delete.useMutation({
    onSuccess: () => {
      utils.needs.listActive.invalidate();
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.districtNeeds.invalidate({ districtId: districtId ?? "" });
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.campuses.byDistrict.invalidate({ districtId: districtId ?? "" });
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.byPerson.invalidate();
      utils.people.list.invalidate();
    },
    onError: error => {
      console.error("Error creating note:", error);
      // Note creation failure is non-critical - don't block the user
    },
  });

  // Generate name suggestions from existing people and common names
  const nameSuggestions = useMemo(() => {
    const existingNames = new Set<string>();
    allPeople.forEach(p => {
      if (p.name) {
        // Add full name
        existingNames.add(p.name.trim());
        // Add first name
        const firstName = p.name.split(" ")[0]?.trim();
        if (firstName) existingNames.add(firstName);
        // Add last name if exists
        const parts = p.name.trim().split(" ");
        if (parts.length > 1) {
          const lastName = parts[parts.length - 1]?.trim();
          if (lastName) existingNames.add(lastName);
        }
      }
    });

    // Chi Alpha staff names for autocomplete
    CHI_ALPHA_STAFF_NAMES.forEach(name => existingNames.add(name));
    return Array.from(existingNames).sort();
  }, [allPeople]);

  const filteredNameSuggestions = useMemo(() => {
    const q = personForm.name.trim().toLowerCase();
    if (!q) return [];
    return nameSuggestions
      .filter(n => n.toLowerCase().includes(q))
      .filter(n => n.toLowerCase() !== q)
      .slice(0, 3);
  }, [personForm.name, nameSuggestions]);

  // Name suggestions for Quick Add use the same global list, filtered by quickAddName
  const quickAddFilteredNameSuggestions = useMemo(() => {
    const q = quickAddName.trim().toLowerCase();
    if (!q) return [];
    return nameSuggestions
      .filter(n => n.toLowerCase().includes(q))
      .filter(n => n.toLowerCase() !== q)
      .slice(0, 3);
  }, [quickAddName, nameSuggestions]);

  // Keep highlight in range when filter or focus changes
  useEffect(() => {
    if (!nameInputFocused || filteredNameSuggestions.length === 0) {
      setNameSuggestionsHighlightIndex(-1);
    } else {
      setNameSuggestionsHighlightIndex(i =>
        i >= filteredNameSuggestions.length ? 0 : i < 0 ? 0 : i
      );
    }
  }, [nameInputFocused, filteredNameSuggestions.length]);

  // Generate campus name suggestions from existing campuses and common patterns
  const campusSuggestions = useMemo(() => {
    const existingNames = new Set<string>();
    allCampuses.forEach(c => {
      if (c.name) {
        existingNames.add(c.name.trim());
        // Extract university/college name patterns
        const name = c.name.toLowerCase();
        if (name.includes("university")) existingNames.add("University");
        if (name.includes("college")) existingNames.add("College");
        if (name.includes("state")) existingNames.add("State University");
        if (name.includes("tech")) existingNames.add("Tech");
      }
    });

    // Common campus/university patterns
    const commonPatterns = [
      "University",
      "College",
      "State University",
      "Community College",
      "Tech",
      "Technical College",
      "State",
      "University of",
      "College of",
    ];

    commonPatterns.forEach(pattern => existingNames.add(pattern));
    return Array.from(existingNames).sort();
  }, [allCampuses]);

  // Calculate district people and stats using shared utility
  // Use 'people' prop for display (already filtered by Home.tsx for performance)
  // But use 'allPeople' for stats calculation to match InteractiveMap exactly
  const districtPeople = useMemo(() => {
    if (!district?.id) return [];
    return people.filter(p => p.primaryDistrictId === district.id);
  }, [people, district?.id]);

  // Map people with needs indicator - DERIVED from active needs only
  // hasNeeds is true if person has any active needs, false otherwise
  // Only active needs are counted. Inactive needs are retained for history.
  const peopleWithNeeds = useMemo(() => {
    return districtPeople.map(person => ({
      ...person,
      hasNeeds: allNeeds.some(
        n => n.personId === person.personId && n.isActive
      ), // Only count active needs
    })) as (Person & { hasNeeds: boolean })[];
  }, [districtPeople, allNeeds]);

  const districtDirector =
    peopleWithNeeds.find(p => {
      const role = p.primaryRole?.toLowerCase() ?? "";
      if (role.includes("district director") || role.includes("dd"))
        return true;
      if (district?.id === "XAN") {
        return (
          role.includes("national director") || role.includes("field director")
        );
      }
      return false;
    }) || null;

  const districtStaffList = useMemo(() => {
    const statusOrder: Record<Person["status"], number> = {
      Yes: 0,
      Maybe: 1,
      No: 2,
      "Not Invited": 3,
    };

    return peopleWithNeeds
      .filter(p => {
        const role = p.primaryRole?.toLowerCase() ?? "";
        if (role.includes("district staff")) return p.primaryCampusId == null;
        if (district?.id === "XAN" && role.includes("national staff")) {
          return p.primaryCampusId == null;
        }
        return false;
      })
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleWithNeeds]);

  const publicDistrictDirectorPerson = useMemo(() => {
    if (!isPublicSafeMode) return null;
    if (!publicDistrictLeadership?.districtDirectorCount) return null;
    return {
      ...buildPublicPlaceholderPeople(1, null)[0],
      primaryRole: "District Director",
    } as Person;
  }, [
    buildPublicPlaceholderPeople,
    isPublicSafeMode,
    publicDistrictLeadership?.districtDirectorCount,
  ]);

  const publicDistrictStaffPeople = useMemo(() => {
    if (!isPublicSafeMode) return [] as Person[];
    const directorCount = publicDistrictLeadership?.districtDirectorCount ?? 0;
    const count = Math.max(publicUnassignedCount - directorCount, 0);
    if (count <= 0) return [] as Person[];
    return buildPublicPlaceholderPeople(count, null).map(person => ({
      ...person,
      primaryRole: "District Staff",
    })) as Person[];
  }, [
    buildPublicPlaceholderPeople,
    isPublicSafeMode,
    publicDistrictLeadership?.districtDirectorCount,
    publicUnassignedCount,
  ]);

  const displayedDistrictDirector = isPublicSafeMode
    ? publicDistrictDirectorPerson
    : districtDirector;

  const displayedDistrictStaffList = isPublicSafeMode
    ? publicDistrictStaffPeople
    : districtStaffList;

  // PR 5: Filter people based on status, search, campus, and last updated (for follow-ups)
  const filteredPeople = useMemo(() => {
    let filtered = peopleWithNeeds;

    // Status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter(p => statusFilter.has(p.status));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(query) ||
          p.primaryRole?.toLowerCase().includes(query)
      );
    }

    // My campus filter
    if (myCampusOnly && user?.campusId) {
      filtered = filtered.filter(p => p.primaryCampusId === user.campusId);
    }

    return filtered;
  }, [
    peopleWithNeeds,
    statusFilter,
    searchQuery,
    myCampusOnly,
    user?.campusId,
  ]);

  const _districtLevelPeople = isPublicSafeMode
    ? buildPublicPlaceholderPeople(publicUnassignedCount, null)
    : filteredPeople.filter(p => p.primaryCampusId == null);

  const unassignedPeople = useMemo(() => {
    if (isPublicSafeMode) {
      return buildPublicPlaceholderPeople(publicUnassignedCount, null);
    }
    const excludedPersonIds = new Set<string>();
    if (districtDirector?.personId) {
      excludedPersonIds.add(districtDirector.personId);
    }
    districtStaffList.forEach(person => {
      excludedPersonIds.add(person.personId);
    });

    return filteredPeople.filter(
      p => p.primaryCampusId == null && !excludedPersonIds.has(p.personId)
    );
  }, [
    buildPublicPlaceholderPeople,
    filteredPeople,
    districtDirector?.personId,
    districtStaffList,
    isPublicSafeMode,
    publicUnassignedCount,
  ]);

  const _sortedUnassignedPeople = useMemo(() => {
    const statusOrder: Record<Person["status"], number> = {
      Yes: 0,
      Maybe: 1,
      No: 2,
      "Not Invited": 3,
    };

    return [...unassignedPeople].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  }, [unassignedPeople]);

  // Campus order state - stores ordered campus IDs
  const [campusOrder, setCampusOrder] = useState<number[]>([]);

  // Initialize campus order when campuses change
  useEffect(() => {
    if (campusesForLayout.length > 0 && district?.id) {
      // Try to load persisted order from localStorage
      const savedOrderJson = localStorage.getItem(
        `campus-order-${district.id}`
      );
      let savedOrder: number[] = [];
      if (savedOrderJson) {
        try {
          savedOrder = JSON.parse(savedOrderJson);
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Filter saved order to only include existing campuses
      const validSavedOrder = savedOrder.filter(id =>
        campusesForLayout.some(c => c.id === id)
      );
      const missingCampuses = campusesForLayout.filter(
        c => !validSavedOrder.includes(c.id)
      );

      // Use saved order if valid, otherwise use default order
      const currentOrder =
        validSavedOrder.length > 0
          ? [...validSavedOrder, ...missingCampuses.map(c => c.id)]
          : campusesForLayout.map(c => c.id);

      setCampusOrder(currentOrder);

      // Persist the final order
      localStorage.setItem(
        `campus-order-${district.id}`,
        JSON.stringify(currentOrder)
      );
    } else if (!district?.id) {
      // Clear order when district changes
      setCampusOrder([]);
    }
  }, [campusesForLayout, district?.id]); // Reset when district changes

  // Create ordered campuses with people (using filtered list).
  // Campus-only viewers (staff/interns/volunteers) see real people on their own campus (with identity); others get placeholders.
  const campusesWithPeople = useMemo(() => {
    const ordered =
      campusOrder.length > 0
        ? (campusOrder
            .map(id => campusesForLayout.find(c => c.id === id))
            .filter(Boolean) as Campus[])
        : campusesForLayout;

    return ordered.map(campus => {
      // Authenticated + in-scope users always see real people (server gates the data).
      // Public/out-of-scope users see placeholder icons from public endpoints.
      const useRealPeople = !isPublicSafeMode;
      return {
        ...campus,
        people: useRealPeople
          ? filteredPeople.filter(p => p.primaryCampusId === campus.id)
          : buildPublicPlaceholderPeople(
              publicCampusCountMap.get(campus.id) ?? 0,
              campus.id
            ),
      };
    });
  }, [
    buildPublicPlaceholderPeople,
    campusesForLayout,
    campusOrder,
    filteredPeople,
    isPublicSafeMode,
    publicCampusCountMap,
  ]);

  // XAN category: first person in "Regional Directors" is Field Director (locked)
  const isRegionalDirectorsCampus = (
    campus: { name?: string | null } | undefined
  ) => campus?.name?.trim().toLowerCase() === "regional directors";
  const roleContextCampus =
    typeof selectedCampusId === "number"
      ? campusesWithPeople.find(c => c.id === selectedCampusId)
      : editingPerson && typeof editingPerson.campusId === "number"
        ? campusesWithPeople.find(c => c.id === editingPerson.campusId)
        : undefined;
  const isFirstPersonInRegionalDirectorsAdd =
    isNationalTeam &&
    typeof selectedCampusId === "number" &&
    roleContextCampus &&
    isRegionalDirectorsCampus(roleContextCampus) &&
    roleContextCampus.people.length === 0;
  const isFirstPersonInRegionalDirectorsEdit =
    isNationalTeam &&
    editingPerson &&
    typeof editingPerson.campusId === "number" &&
    editingPerson.person.primaryRole === "Field Director" &&
    roleContextCampus &&
    isRegionalDirectorsCampus(roleContextCampus);

  // Calculate dynamic offsets for pie chart and labels (after campusesWithPeople is defined)
  useLayoutEffect(() => {
    const updateOffsets = () => {
      if (districtNameRef.current) {
        const nameRect = districtNameRef.current.getBoundingClientRect();
        const statsContainer = document.querySelector(
          '[class*="Stats Section"]'
        )?.parentElement;
        const containerRect =
          statsContainer?.getBoundingClientRect() ||
          districtNameRef.current.closest(".bg-white")?.getBoundingClientRect();

        if (containerRect) {
          // Pie chart should align with district name (with ml-6 = 1.5rem = 24px offset, plus 8px for additional right shift)
          const pieOffset = nameRect.left - containerRect.left + 24 + 8;
          setPieChartOffset(Math.max(0, pieOffset));

          // Labels should align with first campus director icon center (or district director as fallback)
          let directorIcon: Element | null = null;

          // Try to find the first campus director icon using data attribute
          const firstCampusDirectorWrapper = document.querySelector(
            '[data-first-campus-director="true"]'
          );
          if (firstCampusDirectorWrapper) {
            directorIcon =
              firstCampusDirectorWrapper.querySelector('[class*="w-11"]') ||
              firstCampusDirectorWrapper;
          }

          // Fallback to district director if no campus director found
          if (!directorIcon && districtDirectorRef.current) {
            directorIcon =
              districtDirectorRef.current.querySelector('[class*="w-11"]') ||
              districtDirectorRef.current;
          }

          if (directorIcon) {
            const iconRect = directorIcon.getBoundingClientRect();
            const directorCenter = iconRect.left + iconRect.width / 2;
            // Align the first circle (Yes) with the center of the district director icon
            // The circle is 14px (w-3.5) with a small offset from grid edge
            const labelsOffset = directorCenter - containerRect.left - 7;
            setLabelsOffset(Math.max(0, labelsOffset));
          }
        }
      }
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(updateOffsets, 0);
    window.addEventListener("resize", updateOffsets);
    // Also update when district name changes (editable text)
    const observer = new MutationObserver(updateOffsets);
    if (districtNameRef.current) {
      observer.observe(districtNameRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateOffsets);
      observer.disconnect();
    };
  }, [
    district?.name,
    district?.id,
    districtDirector?.personId,
    campusesWithPeople,
  ]);

  // Store initial order when panel opens or data changes significantly (do not override user's sort preference)
  useEffect(() => {
    const newOrder: Record<number, string[]> = {};
    campusesWithPeople.forEach(campus => {
      // Store current order, but if no custom order exists, use status-sorted order as baseline
      const currentSort = campusSorts[campus.id] || "status";
      if (currentSort === "status") {
        // Store status-sorted order as the initial order (Yes, Maybe, No, Not Invited)
        const statusOrder: Record<Person["status"], number> = {
          Yes: 0,
          Maybe: 1,
          No: 2,
          "Not Invited": 3,
        };
        const sorted = [...campus.people].sort(
          (a, b) => statusOrder[a.status] - statusOrder[b.status]
        );
        newOrder[campus.id] = sorted.map(p => p.personId);
      } else {
        newOrder[campus.id] = campus.people.map(p => p.personId);
      }
    });
    setCampusPeopleOrder(newOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district?.id]); // Reset order when district changes (panel opens/closes)

  // Detect status-only change during render so we can delay re-sort in this same render
  const prevStatusSignatureRef = useRef<string>("");
  (() => {
    const signature = campusesWithPeople
      .map(c =>
        c.people
          .map(p => `${p.personId}:${p.status || "Not Invited"}`)
          .join(",")
      )
      .join("|");
    const currIds = campusesWithPeople
      .map(c =>
        c.people
          .map(p => p.personId)
          .sort()
          .join(",")
      )
      .join("|");
    if (prevStatusSignatureRef.current !== "") {
      const [prevIds, prevSigs] = prevStatusSignatureRef.current.split("\n");
      if (currIds === prevIds && signature !== prevSigs) {
        lastStatusChangeAtRef.current = Date.now();
        previousOrderSnapshotRef.current = { ...campusPeopleOrder };
      }
    }
    prevStatusSignatureRef.current = `${currIds}\n${signature}`;
  })();

  // Calculate stats using shared utility with allPeople to ensure consistency with tooltip and map
  // This ensures the stats match exactly what's shown in the tooltip and map metrics
  // Use `people` prop (which has optimistic updates) when available, otherwise fall back to allPeople query
  const stats = useMemo(() => {
    if (!district?.id) {
      return { going: 0, maybe: 0, notGoing: 0, notInvited: 0 };
    }
    if (isPublicSafeMode && publicDistrictMetrics) {
      return {
        going: publicDistrictMetrics.going,
        maybe: publicDistrictMetrics.maybe,
        notGoing: publicDistrictMetrics.notGoing,
        notInvited: publicDistrictMetrics.notInvited,
      };
    }
    // Prefer `people` prop (has optimistic updates from Home.tsx) over allPeople query for immediate UI updates
    const peopleForStats = people.length > 0 ? people : allPeople;
    const districtStats = calculateDistrictStats(peopleForStats, district.id);
    return toDistrictPanelStats(districtStats);
  }, [
    people,
    allPeople,
    district?.id,
    isPublicSafeMode,
    publicDistrictMetrics,
  ]);

  const safeStats = {
    going: stats.going ?? 0,
    maybe: stats.maybe ?? 0,
    notGoing: stats.notGoing ?? 0,
    notInvited: stats.notInvited ?? 0,
  };

  // Calculate needs summary for district - use public endpoint in public mode
  // or calculate from local data when authenticated
  const needsSummary = useMemo(() => {
    // Use public endpoint data if available (works in both public and auth modes)
    if (publicDistrictNeeds) {
      return {
        totalNeeds: publicDistrictNeeds.totalNeeds,
        metNeeds: publicDistrictNeeds.metNeeds ?? 0,
        totalFinancial: publicDistrictNeeds.totalFinancial,
        metFinancial: publicDistrictNeeds.metFinancial ?? 0,
      };
    }
    // Fallback to calculating from local data (authenticated mode with allNeeds loaded)
    const districtPersonIds = new Set(peopleWithNeeds.map(p => p.personId));
    // allNeeds already contains only active needs (from listActive query)
    const districtNeeds = allNeeds.filter(
      n => districtPersonIds.has(n.personId) && n.isActive
    );
    const totalNeeds = districtNeeds.length;
    const totalFinancial = districtNeeds
      .filter(n => n.amount !== null && n.amount !== undefined)
      .reduce((sum, n) => sum + (n.amount || 0), 0);
    const metFinancial = districtNeeds.reduce(
      (sum, n) => sum + (n.fundsReceived ?? 0),
      0
    );

    return {
      totalNeeds,
      metNeeds: 0,
      totalFinancial, // in cents
      metFinancial,
    };
  }, [allNeeds, peopleWithNeeds, publicDistrictNeeds]);

  const totalPeople =
    safeStats.going +
    safeStats.maybe +
    safeStats.notGoing +
    safeStats.notInvited;
  const _invitedPercentage =
    totalPeople > 0
      ? Math.round(((totalPeople - safeStats.notInvited) / totalPeople) * 100)
      : 0;

  // Status order: Yes, Maybe, No, Not Invited (Not Invited far right, next to No)
  const STATUS_ORDER: Record<Person["status"], number> = {
    Yes: 0,
    Maybe: 1,
    No: 2,
    "Not Invited": 3,
  };

  // Sort people based on campus preference
  const getSortedPeople = (people: Person[], campusId: number) => {
    const sortBy = campusSorts[campusId] || "status";
    const withinStatusChangeDelay =
      sortBy === "status" &&
      Date.now() - lastStatusChangeAtRef.current < SORT_DELAY_MS &&
      previousOrderSnapshotRef.current[campusId]?.length;

    // Within a few seconds of a status change, keep previous order so list doesn't jump
    if (withinStatusChangeDelay && previousOrderSnapshotRef.current[campusId]) {
      const order = previousOrderSnapshotRef.current[campusId];
      const peopleMap = new Map(people.map(p => [p.personId, p]));
      const ordered: Person[] = [];
      order.forEach(personId => {
        const person = peopleMap.get(personId);
        if (person) {
          ordered.push(person);
          peopleMap.delete(personId);
        }
      });
      peopleMap.forEach(person => ordered.push(person));
      return ordered;
    }

    // If preserveOrder is true AND we have a stored order, maintain the stored order
    if (preserveOrder && campusPeopleOrder[campusId]) {
      const order = campusPeopleOrder[campusId];
      const peopleMap = new Map(people.map(p => [p.personId, p]));
      const ordered: Person[] = [];
      const unordered: Person[] = [];

      order.forEach(personId => {
        const person = peopleMap.get(personId);
        if (person) {
          ordered.push(person);
          peopleMap.delete(personId);
        }
      });
      peopleMap.forEach(person => unordered.push(person));
      if (unordered.length > 0) {
        unordered.sort(
          (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        );
      }
      return [...ordered, ...unordered];
    }

    // Otherwise, sort normally (applies on page refresh or when user selects "Status")
    if (sortBy === "name") {
      return [...people].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "role") {
      return [...people].sort((a, b) =>
        (a.primaryRole || "").localeCompare(b.primaryRole || "")
      );
    } else {
      return [...people].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      );
    }
  };

  // Handle quick add + sign click
  const handleQuickAddClick = (
    e: React.MouseEvent,
    targetId: string | number
  ) => {
    e.stopPropagation();
    const quickAddKey =
      typeof targetId === "number" ? `campus-${targetId}` : targetId;
    setQuickAddMode(quickAddKey);
    setQuickAddName("");
    // Focus input after state update
    setTimeout(() => {
      quickAddInputRef.current?.focus();
    }, 0);
  };

  // Handle quick add input blur/enter
  const handleQuickAddSubmit = (targetId: string | number) => {
    const actualTargetId =
      typeof targetId === "string" && targetId.startsWith("campus-")
        ? parseInt(targetId.replace("campus-", ""))
        : targetId;
    handleQuickAddPerson(actualTargetId, quickAddName);
  };

  // Handle household input blur - match to existing household in same context (same campus/header) or create
  const _handleHouseholdInputBlur = () => {
    const inputValue = householdInputValue.trim();
    if (!inputValue) {
      setPersonForm({ ...personForm, householdId: null });
      return;
    }

    if (!allHouseholds || !allPeople) return;

    const contextCampusId = getContextCampusId();
    const normalizedInput = inputValue
      .toLowerCase()
      .replace(/\s*household\s*$/i, "")
      .trim();

    // Match only households that have at least one member in same context (same campus row or district header)
    const matchingHousehold = allHouseholds.find(household => {
      const members = allPeople.filter(p => p.householdId === household.id);
      const displayName =
        household.label ||
        (members.length > 0
          ? `${getLastName(members[0]!.name || "")} Household`
          : "Household");
      const displayNormalized = displayName
        .toLowerCase()
        .replace(/\s*household\s*$/i, "")
        .trim();
      if (displayNormalized !== normalizedInput) return false;
      const hasMemberInSameContext = members.some(
        m => m.primaryCampusId === contextCampusId
      );
      return hasMemberInSameContext;
    });

    if (matchingHousehold) {
      setPersonForm({ ...personForm, householdId: matchingHousehold.id });
      setHouseholdValidationError(null);
    } else if (inputValue && inputValue.toLowerCase() !== "none") {
      // Create new household
      if (!personForm.name.trim()) {
        setHouseholdNameError("Enter a name first to create a household.");
        return;
      }
      setHouseholdNameError(null);
      const label = inputValue;
      createHousehold.mutate({
        label,
        childrenCount: 0,
        guestsCount: 0,
      });
    }
  };

  // Handle creating household from input (when clicking "Create" option)
  const handleCreateHouseholdFromInput = () => {
    const inputValue = householdInputValue.trim();
    if (!inputValue) return;

    if (!personForm.name.trim()) {
      setHouseholdNameError("Enter a name first to create a household.");
      return;
    }

    setHouseholdNameError(null);
    // Ensure label ends with "Household" if it doesn't already
    const label = inputValue.toLowerCase().endsWith("household")
      ? inputValue
      : `${inputValue} Household`;
    createHousehold.mutate({
      label: label,
      childrenCount: 0,
      guestsCount: 0,
    });
  };

  // Handle quick add person
  const handleQuickAddPerson = (targetId: string | number, name: string) => {
    if (!name?.trim()) {
      setQuickAddMode(null);
      setQuickAddName("");
      return;
    }

    if (!district?.id) {
      console.error("District ID is missing");
      setQuickAddMode(null);
      setQuickAddName("");
      return;
    }

    const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build mutation data with defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mutationData: any = {
      personId,
      name: name.trim(),
      primaryDistrictId: district.id,
      status: "Not Invited", // Default status
      primaryRole: "Campus Staff", // Default role
      depositPaid: false,
    };

    // Always set primaryRegion so region-scoped queries find this person
    if (district.region) {
      mutationData.primaryRegion = district.region;
    }

    // Set role and campus based on target
    if (targetId === "district") {
      // First person in header: XAN = National Director (fixed), districts = District Director (fixed)
      mutationData.primaryRole = isNationalTeam
        ? "National Director"
        : "District Director";
      mutationData.primaryCampusId = null;
    } else if (targetId === "district-staff") {
      mutationData.primaryRole = isNationalTeam
        ? "National Staff"
        : "District Staff";
      mutationData.primaryCampusId = null;
    } else {
      // Campus quick-add: first person = Campus Director, rest = Campus Staff
      if (typeof targetId === "number") {
        const campus = campusesWithPeople.find(c => c.id === targetId);
        mutationData.primaryRole =
          campus && campus.people.length === 0
            ? "Campus Director"
            : "Campus Staff";
        mutationData.primaryCampusId = targetId;
      } else {
        mutationData.primaryCampusId = null;
      }
    }

    createPerson.mutate(mutationData, {
      onSuccess: () => {
        utils.people.list.invalidate();
        utils.campuses.byDistrict.invalidate({
          districtId: district?.id ?? "",
        });
        onDistrictUpdate();
        setQuickAddMode(null);
        setQuickAddName("");
      },
      onError: error => {
        console.error("Error creating person:", error);
        toast.error("Failed to create person: " + error.message);
        setQuickAddMode(null);
        setQuickAddName("");
      },
    });
  };

  // Handle add person
  const handleAddPerson = async () => {
    if (!selectedCampusId) {
      toast.error("Please select a campus or location first");
      return;
    }

    if (!personForm.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!personForm.role?.trim()) {
      toast.error("Role is required");
      return;
    }

    if (!district?.id) {
      toast.error("District information is missing");
      return;
    }

    const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build mutation data - use 'any' type to allow conditional fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mutationData: any = {
      personId,
      name: personForm.name.trim(),
      primaryDistrictId: district.id,
      status: statusMap[personForm.status],
    };

    // Set depositPaid - ensure it's a boolean
    mutationData.depositPaid = personForm.depositPaid ?? false;

    // Always set primaryRegion so region-scoped queries find this person
    if (district.region) {
      mutationData.primaryRegion = district.region;
    }

    // Set role and campus based on selection
    if (selectedCampusId === "district") {
      // First person in header: XAN = National Director (fixed), regular district = District Director (fixed)
      mutationData.primaryRole = isNationalTeam
        ? "National Director"
        : "District Director";
      // Don't set primaryCampusId for district director (will be null in DB)
    } else if (selectedCampusId === "district-staff") {
      mutationData.primaryRole =
        mapRoleToAuthoritative(personForm.role.trim()) ||
        (isNationalTeam ? "National Staff" : "District Staff");
      // Don't set primaryCampusId for district staff (will be null in DB)
    } else {
      mutationData.primaryRole =
        mapRoleToAuthoritative(personForm.role.trim()) || "Campus Staff";
      mutationData.primaryCampusId = selectedCampusId;
    }

    // Add optional fields only if they have values
    if (personForm.notes?.trim()) {
      mutationData.notes = personForm.notes.trim();
    }

    // Household and family fields
    mutationData.spouseAttending = personForm.spouseAttending;
    mutationData.childrenCount = personForm.childrenCount;
    mutationData.guestsCount = personForm.guestsCount;

    // Default household to last name and match/create in same context (same campus row or district header) to avoid double-counting family/guests
    let householdIdToUse = personForm.householdId;
    const lastName = getLastName(personForm.name.trim());
    const contextCampusId =
      selectedCampusId === "district" || selectedCampusId === "district-staff"
        ? null
        : typeof selectedCampusId === "number"
          ? selectedCampusId
          : null;

    if (!personForm.householdId && lastName && allHouseholds && allPeople) {
      const lastNameLower = lastName.toLowerCase();
      const existingHousehold = allHouseholds.find(h => {
        const members = allPeople.filter(p => p.householdId === h.id);
        const labelMatch =
          h.label &&
          (h.label.toLowerCase().includes(lastNameLower) ||
            h.label
              .toLowerCase()
              .replace(/\s*household\s*$/i, "")
              .trim() === lastNameLower);
        const memberLastNameMatch = members.some(m => {
          const ln = getLastName(m.name || "");
          return ln.toLowerCase() === lastNameLower;
        });
        if (!labelMatch && !memberLastNameMatch) return false;
        const hasMemberInSameContext = members.some(
          m => m.primaryCampusId === contextCampusId
        );
        return hasMemberInSameContext;
      });

      if (existingHousehold) {
        householdIdToUse = existingHousehold.id;
      } else {
        const householdLabel = `${lastName} Household`;
        try {
          const newHousehold = await createHousehold.mutateAsync({
            label: householdLabel,
            childrenCount: personForm.childrenCount || 0,
            guestsCount: personForm.guestsCount || 0,
          });
          householdIdToUse = newHousehold.id;
        } catch (error) {
          console.error("Failed to create household:", error);
          toast.error("Failed to create household. Please try again.");
          return;
        }
      }
    }

    if (householdIdToUse) {
      mutationData.householdId = householdIdToUse;
      mutationData.householdRole = "primary";
    }

    if (personForm.childrenAges.length > 0) {
      mutationData.childrenAges = JSON.stringify(personForm.childrenAges);
    }

    // Call the mutation
    createPerson.mutate(mutationData, {
      onSuccess: () => {
        // Update household counts to aggregate all members' counts
        if (householdIdToUse) {
          // Invalidate and refetch to get updated person data, then recalculate household totals
          utils.people.list.invalidate();
          setTimeout(() => {
            utils.people.list.fetch().then(updatedPeople => {
              const peopleToUse: Person[] = (updatedPeople ??
                allPeople) as Person[];
              const householdMembers = peopleToUse.filter(
                p => p.householdId === householdIdToUse
              );
              const totalChildrenCount = householdMembers.reduce(
                (sum: number, p) => sum + (p.childrenCount || 0),
                0
              );
              const totalGuestsCount = householdMembers.reduce(
                (sum: number, p) => sum + (p.guestsCount || 0),
                0
              );

              updateHousehold.mutate({
                id: householdIdToUse,
                childrenCount: totalChildrenCount,
                guestsCount: totalGuestsCount,
              });
            });
          }, 200);
        }
        // Create need only if needType is not "None"
        if (personForm.needType !== "None" && personForm.needType) {
          const parsedAmount = personForm.needAmount
            ? Math.round(parseFloat(personForm.needAmount) * 100)
            : undefined;

          const parsedFundsReceived = personForm.fundsReceivedAmount
            ? Math.round(parseFloat(personForm.fundsReceivedAmount) * 100)
            : undefined;

          const amountPart =
            parsedAmount !== undefined
              ? `$${(parsedAmount / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : null;

          const details = personForm.needDetails?.trim();
          const needDescription = amountPart
            ? details
              ? `${amountPart} - ${details}`
              : `${personForm.needType} need: ${amountPart}`
            : details || `${personForm.needType} need`;

          updateOrCreateNeed.mutate({
            personId,
            type: personForm.needType,
            description: needDescription,
            amount: parsedAmount,
            fundsReceived: parsedFundsReceived,
            isActive: !personForm.needsMet, // Active if needsMet is false
          });

          // Save needDetails to notes table with noteType="REQUEST" if provided
          if (personForm.needDetails?.trim()) {
            createNote.mutate({
              personId,
              category: "INTERNAL",
              content: personForm.needDetails.trim(),
              noteType: "REQUEST",
            });
          }
        }
      },
    });
  };

  // Handle add campus/category
  const handleAddCampus = () => {
    if (!campusForm.name.trim() || !district) return;
    if (hasCampusNameConflict(campusForm.name)) {
      toast.error(
        `A ${entityName.toLowerCase()} with a very similar name already exists. Please use that ${entityName.toLowerCase()} instead of creating a duplicate.`
      );
      return;
    }
    createCampus.mutate({
      name: campusForm.name.trim(),
      districtId: district.id,
    });
  };

  // Handle edit person (uses 3-tier edit authorization)
  const handleEditPerson = async (
    campusId: number | string,
    person: Person
  ) => {
    if (!userCanEditPerson(person)) return;
    setEditingPerson({ campusId, person });
    setIsEditPersonDialogOpen(true);

    // Load form data immediately when opening edit dialog
    // This avoids using useEffect which can cause infinite loops
    try {
      const figmaStatus = reverseStatusMap[person.status] || "not-invited";

      // Fetch needs and notes for this person
      const needsResult = await utils.needs.byPerson.fetch({
        personId: person.personId,
      });
      const notesResult = await utils.notes.byPerson.fetch({
        personId: person.personId,
      });

      const personNeed =
        needsResult && needsResult.length > 0 ? needsResult[0] : null;

      // Parse childrenAges from JSON string if it exists
      let childrenAges: string[] = [];
      if (person.childrenAges) {
        try {
          childrenAges = JSON.parse(person.childrenAges);
        } catch {
          childrenAges = [];
        }
      }

      // Extract needDetails from need description or from notes with noteType="REQUEST"
      let needDetails = "";
      if (personNeed) {
        try {
          if (personNeed.type === "Registration") {
            const desc = personNeed.description || "";
            const match = desc.match(/\$\d+(?:\.\d+)?\s*-\s*(.+)/);
            needDetails = match ? match[1].trim() : "";
          } else {
            needDetails = personNeed.description || "";
          }
        } catch (error) {
          console.error("Error extracting needDetails from need:", error);
        }
      }

      // Also check notes table for request notes (noteType="REQUEST")
      try {
        const safeNotes = notesResult || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const needNotes = safeNotes.filter((n: any) => {
          if (!n) return false;
          return n.noteType === "REQUEST" || n.note_type === "REQUEST";
        });
        if (needNotes.length > 0 && !needDetails) {
          const lastNote = needNotes[needNotes.length - 1];
          needDetails = (lastNote?.content || "") as string;
        }
      } catch (error) {
        console.error("Error processing request notes:", error);
      }

      setPersonForm({
        name: person.name,
        role: mapRoleToAuthoritative(person.primaryRole) || "Campus Staff",
        status: figmaStatus,
        needType: personNeed
          ? (personNeed.type as
              | "Registration"
              | "Transportation"
              | "Housing"
              | "Other")
          : "None",
        needAmount: personNeed?.amount
          ? (personNeed.amount / 100).toString()
          : "",
        fundsReceivedAmount: personNeed?.fundsReceived
          ? (personNeed.fundsReceived / 100).toString()
          : "",
        needDetails: needDetails,
        notes: person.notes || "",
        spouseAttending:
          person.spouseAttending !== undefined &&
          person.spouseAttending !== null
            ? person.spouseAttending
            : false,
        childrenCount:
          person.childrenCount !== undefined && person.childrenCount !== null
            ? person.childrenCount
            : 0,
        guestsCount:
          person.guestsCount !== undefined && person.guestsCount !== null
            ? person.guestsCount
            : 0,
        childrenAges: childrenAges,
        depositPaid: person.depositPaid || false,
        needsMet: personNeed ? !personNeed.isActive : false,
        householdId:
          person.householdId !== undefined && person.householdId !== null
            ? person.householdId
            : null,
      });

      // Set household input value: use existing household display or default to last name and auto-match same context
      try {
        if (person.householdId && allHouseholds && allPeople) {
          const household = allHouseholds.find(
            h => h.id === person.householdId
          );
          if (household) {
            const members = allPeople.filter(
              p => p.householdId === household.id
            );
            const displayName =
              household.label ||
              (members.length > 0
                ? `${getLastName(members[0]!.name || "")} Household`
                : "Household");
            setHouseholdInputValue(
              displayName.endsWith(" Household")
                ? displayName
                : `${displayName} Household`
            );
          } else {
            const lastName = getLastName(person.name || "");
            const displayValue = lastName ? `${lastName} Household` : "";
            setHouseholdInputValue(displayValue);
            if (lastName && allHouseholds?.length && allPeople?.length) {
              const contextCampusId =
                campusId === "district" || campusId === "district-staff"
                  ? null
                  : typeof campusId === "number"
                    ? campusId
                    : null;
              setTimeout(() => {
                runHouseholdMatchByLastName(contextCampusId, lastName);
              }, 0);
            }
          }
        } else {
          const lastName = getLastName(person.name || "");
          const displayValue = lastName ? `${lastName} Household` : "";
          setHouseholdInputValue(displayValue);
          if (lastName && allHouseholds?.length && allPeople?.length) {
            const contextCampusId =
              campusId === "district" || campusId === "district-staff"
                ? null
                : typeof campusId === "number"
                  ? campusId
                  : null;
            setTimeout(() => {
              runHouseholdMatchByLastName(contextCampusId, lastName);
            }, 0);
          }
        }
      } catch (error) {
        console.error("Error setting household input value:", error);
        setHouseholdInputValue("");
      }
    } catch (error) {
      console.error("Error loading person data for editing:", error);
      // Reset form to prevent showing invalid data
      setPersonForm({
        name: "",
        role: "Campus Staff",
        status: "not-invited",
        needType: "None",
        needAmount: "",
        fundsReceivedAmount: "",
        needDetails: "",
        notes: "",
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
        childrenAges: [],
        depositPaid: false,
        needsMet: false,
        householdId: null,
      });
      setHouseholdInputValue("");
    }
  };

  // Handle update person
  const handleUpdatePerson = async () => {
    if (!district || !editingPerson || !personForm.name || !personForm.role)
      return;
    const personId = editingPerson.person.personId;

    // Store form values for use in callbacks
    const formData = { ...personForm };

    // Default household to last name in same context (same campus/header) if not set
    let householdIdToUse = personForm.householdId;
    const lastName = getLastName(personForm.name.trim());
    const contextCampusId =
      editingPerson.campusId === "district" ||
      editingPerson.campusId === "district-staff"
        ? null
        : typeof editingPerson.campusId === "number"
          ? editingPerson.campusId
          : null;

    if (!personForm.householdId && lastName && allHouseholds && allPeople) {
      const lastNameLower = lastName.toLowerCase();
      const existingHousehold = allHouseholds.find(h => {
        const members = allPeople.filter(p => p.householdId === h.id);
        const labelMatch =
          h.label &&
          (h.label.toLowerCase().includes(lastNameLower) ||
            h.label
              .toLowerCase()
              .replace(/\s*household\s*$/i, "")
              .trim() === lastNameLower);
        const memberLastNameMatch = members.some(m => {
          const ln = getLastName(m.name || "");
          return ln.toLowerCase() === lastNameLower;
        });
        if (!labelMatch && !memberLastNameMatch) return false;
        const hasMemberInSameContext = members.some(
          m => m.primaryCampusId === contextCampusId
        );
        return hasMemberInSameContext;
      });

      if (existingHousehold) {
        householdIdToUse = existingHousehold.id;
      } else {
        const householdLabel = `${lastName} Household`;
        try {
          const newHousehold = await createHousehold.mutateAsync({
            label: householdLabel,
            childrenCount: personForm.childrenCount || 0,
            guestsCount: personForm.guestsCount || 0,
          });
          householdIdToUse = newHousehold.id;
        } catch (error) {
          console.error("Failed to create household:", error);
          toast.error("Failed to create household. Please try again.");
          return;
        }
      }
    }

    // Determine if this role requires primaryCampusId to be null (district/national level roles)
    // Map role to authoritative role before saving
    const mappedRole =
      mapRoleToAuthoritative(personForm.role) || "Campus Staff";
    const isDistrictLevelRole = [
      "District Director",
      "District Staff",
      "National Director",
      "Regional Director",
      "Field Director",
      "National Staff",
      "Regional Staff",
    ].includes(mappedRole);

    // Update person with all fields
    updatePerson.mutate(
      {
        personId,
        name: personForm.name,
        primaryRole: mappedRole,
        status: statusMap[personForm.status],
        depositPaid: personForm.depositPaid,
        notes: personForm.notes,
        spouseAttending: personForm.spouseAttending,
        childrenCount: personForm.childrenCount,
        guestsCount: personForm.guestsCount,
        householdId: householdIdToUse,
        householdRole: personForm.householdId ? "primary" : undefined,
        childrenAges:
          personForm.childrenAges.length > 0
            ? JSON.stringify(personForm.childrenAges)
            : undefined,
        // District/national level roles should have primaryCampusId as null
        primaryCampusId: isDistrictLevelRole ? null : undefined,
      },
      {
        onSuccess: () => {
          // Update household counts to aggregate all members' counts
          if (personForm.householdId != null) {
            const householdId = personForm.householdId;
            // Invalidate and refetch to get updated person data, then recalculate household totals
            utils.people.list.invalidate();
            setTimeout(() => {
              utils.people.list
                .fetch()
                .then(updatedPeople => {
                  const peopleToUse: Person[] = (updatedPeople ??
                    allPeople) as Person[];
                  const householdMembers = peopleToUse.filter(
                    p => p.householdId === householdId
                  );
                  const totalChildrenCount = householdMembers.reduce(
                    (sum: number, p) => sum + (p.childrenCount || 0),
                    0
                  );
                  const totalGuestsCount = householdMembers.reduce(
                    (sum: number, p) => sum + (p.guestsCount || 0),
                    0
                  );

                  updateHousehold.mutate({
                    id: householdId,
                    childrenCount: totalChildrenCount,
                    guestsCount: totalGuestsCount,
                  });
                })
                .catch(err => {
                  console.error(
                    "Error fetching people for household update:",
                    err
                  );
                });
            }, 200);
          }
          // Handle needs: create/update if needType is not "None", delete if "None"
          if (formData.needType !== "None" && formData.needType) {
            const parsedAmount = formData.needAmount
              ? Math.round(parseFloat(formData.needAmount) * 100)
              : undefined;

            const parsedFundsReceived = formData.fundsReceivedAmount
              ? Math.round(parseFloat(formData.fundsReceivedAmount) * 100)
              : undefined;

            const amountPart =
              parsedAmount !== undefined
                ? `$${(parsedAmount / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : null;

            const details = formData.needDetails?.trim();
            const needDescription = amountPart
              ? details
                ? `${amountPart} - ${details}`
                : `${formData.needType} need: ${amountPart}`
              : details || `${formData.needType} need`;

            updateOrCreateNeed.mutate(
              {
                personId,
                type: formData.needType,
                description: needDescription,
                amount: parsedAmount,
                fundsReceived: parsedFundsReceived,
                isActive: !formData.needsMet, // Active if needsMet is false
              },
              {
                onSuccess: () => {
                  // Save needDetails to notes table with noteType="REQUEST" if provided
                  if (formData.needDetails?.trim()) {
                    createNote.mutate({
                      personId,
                      category: "INTERNAL",
                      content: formData.needDetails.trim(),
                      noteType: "REQUEST",
                    });
                  }
                  // Close dialog and reset form after needs are updated
                  setPersonForm({
                    name: "",
                    role: "Campus Staff",
                    status: "not-invited",
                    needType: "None",
                    needAmount: "",
                    fundsReceivedAmount: "",
                    needDetails: "",
                    notes: "",
                    spouseAttending: false,
                    childrenCount: 0,
                    guestsCount: 0,
                    childrenAges: [],
                    depositPaid: false,
                    needsMet: false,
                    householdId: null,
                  });
                  setIsEditPersonDialogOpen(false);
                  setEditingPerson(null);
                },
              }
            );
          } else {
            // If needType is "None", mark existing need as inactive (preserve history)
            // Only active needs are counted. Inactive needs are retained for history.
            // Check if person has an active need to mark as inactive
            const activeNeed = allNeeds.find(
              n => n.personId === personId && n.isActive
            );
            if (activeNeed) {
              // Mark as inactive instead of deleting
              updateOrCreateNeed.mutate(
                {
                  personId,
                  type: activeNeed.type, // Keep existing type
                  description: activeNeed.description, // Keep existing description
                  amount: activeNeed.amount ?? undefined,
                  isActive: false, // Mark as inactive
                },
                {
                  onSuccess: () => {
                    // Close dialog and reset form after needs are updated
                    setPersonForm({
                      name: "",
                      role: "Campus Staff",
                      status: "not-invited",
                      needType: "None",
                      needAmount: "",
                      fundsReceivedAmount: "",
                      needDetails: "",
                      notes: "",
                      spouseAttending: false,
                      childrenCount: 0,
                      guestsCount: 0,
                      childrenAges: [],
                      depositPaid: false,
                      needsMet: false,
                      householdId: null,
                    });
                    setIsEditPersonDialogOpen(false);
                    setEditingPerson(null);
                  },
                }
              );
            } else {
              // No active need to update, just close dialog
              setPersonForm({
                name: "",
                role: "Campus Staff",
                status: "not-invited",
                needType: "None",
                needAmount: "",
                fundsReceivedAmount: "",
                needDetails: "",
                notes: "",
                spouseAttending: false,
                childrenCount: 0,
                guestsCount: 0,
                childrenAges: [],
                depositPaid: false,
                needsMet: false,
                householdId: null,
              });
              setIsEditPersonDialogOpen(false);
              setEditingPerson(null);
            }
          }
        },
      }
    );
  };

  // Handle delete person
  const handleDeletePerson = () => {
    if (!editingPerson) return;

    // Check if user has chosen to skip confirmation
    const skipConfirmation =
      localStorage.getItem("skipDeletePersonConfirmation") === "true";

    if (skipConfirmation) {
      // Delete directly without confirmation
      deletePerson.mutate({ personId: editingPerson.person.personId });
    } else {
      // Show confirmation dialog
      setIsDeleteConfirmOpen(true);
    }
  };

  // Handle confirmed delete
  const handleConfirmDelete = () => {
    if (!editingPerson) return;

    // Save preference if "don't ask again" is checked
    if (dontAskAgain) {
      localStorage.setItem("skipDeletePersonConfirmation", "true");
    }

    deletePerson.mutate({ personId: editingPerson.person.personId });
    setIsDeleteConfirmOpen(false);
    setDontAskAgain(false);
  };

  // Handle person click - cycle status
  const handlePersonClick = (campusId: number | string, person: Person) => {
    const statusCycle: Person["status"][] = [
      "Not Invited",
      "Yes",
      "Maybe",
      "No",
    ];
    const currentIndex = statusCycle.indexOf(person.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    onPersonStatusChange(person.personId, nextStatus);
  };

  // Handle edit campus (inline on the row; no dialog)
  const handleEditCampus = (campusId: number) => {
    const campus = campuses.find(c => c.id === campusId);
    if (campus) {
      setCampusForm({ name: campus.name ?? "" });
      setEditingCampusId(campusId);
      setOpenCampusMenuId(null);
      setTimeout(() => inlineCampusNameInputRef.current?.focus(), 0);
    }
  };

  // Handle update campus (used by inline edit and by dialog if still opened elsewhere)
  const handleUpdateCampus = (campusId?: number) => {
    const id = campusId ?? selectedCampusId;
    if (!id || typeof id !== "number" || !campusForm.name?.trim()) return;

    updateCampusName.mutate({ id, name: campusForm.name.trim() });
    setCampusForm({ name: "" });
    setIsEditCampusDialogOpen(false);
    setSelectedCampusId(null);
    setEditingCampusId(null);
  };

  // Handle campus sort change (with delayed animation for "Sort by Status")
  const handleCampusSortChange = (
    campusId: number,
    sortBy: "status" | "name" | "role"
  ) => {
    // Clear any pending sort timeout
    if (sortTimeoutRef.current) {
      clearTimeout(sortTimeoutRef.current);
      sortTimeoutRef.current = null;
    }

    // Start the slow animation indicator
    setAnimatingSortCampus(campusId);

    // Delay the actual sort by 2 seconds (same as auto-sort after status change)
    sortTimeoutRef.current = setTimeout(() => {
      setCampusSorts(prev => ({ ...prev, [campusId]: sortBy }));
      // Disable order preservation when user explicitly sorts by status/name/role
      setPreserveOrder(false);

      // Clear animation state after the layout animation completes (~2s)
      setTimeout(() => {
        setAnimatingSortCampus(null);
      }, 2000);
    }, SORT_DELAY_MS);
  };

  const handleCampusRowDrop = (
    personId: string,
    fromCampusId: number | string,
    toCampusId: number | string
  ) => {
    if (fromCampusId === toCampusId) return;
    handlePersonMove(personId, fromCampusId, toCampusId, 0);
  };

  const handleCampusNameDrop = (
    personId: string,
    fromCampusId: number | string,
    toCampusId: number | string
  ) => {
    if (fromCampusId === toCampusId) return;
    handlePersonMove(personId, fromCampusId, toCampusId, 0);
  };

  const handleDistrictDirectorDrop = (
    personId: string,
    _fromCampusId: number | string
  ) => {
    const person = districtPeople.find(p => p.personId === personId);
    if (!person) return;

    updatePerson.mutate({
      personId: person.personId,
      primaryRole: "District Director",
      primaryCampusId: null,
    });
  };

  const handleDistrictStaffDrop = (
    personId: string,
    _fromCampusId: number | string
  ) => {
    const person = districtPeople.find(p => p.personId === personId);
    if (!person) return;

    updatePerson.mutate({
      personId: person.personId,
      primaryRole: "District Staff",
      primaryCampusId: null,
    });
  };

  const getPerson = (
    personId: string,
    _campusId: number | string
  ): Person | undefined => {
    return districtPeople.find(p => p.personId === personId);
  };

  const getCampus = (
    campusId: number
  ): { name: string; people: Person[] } | undefined => {
    const campus = campusesWithPeople.find(c => c.id === campusId);
    if (!campus) return undefined;
    return {
      name: campus.name,
      people: campus.people,
    };
  };

  // Handle campus reordering
  const handleCampusReorder = (
    draggedCampusId: number,
    targetIndex: number
  ) => {
    const currentIndex = campusOrder.indexOf(draggedCampusId);
    if (currentIndex === -1) return;
    if (currentIndex === targetIndex) return;

    const newOrder = [...campusOrder];
    newOrder.splice(currentIndex, 1);
    const adjustedTargetIndex =
      currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newOrder.splice(adjustedTargetIndex, 0, draggedCampusId);
    setCampusOrder(newOrder);

    if (district?.id) {
      localStorage.setItem(
        `campus-order-${district.id}`,
        JSON.stringify(newOrder)
      );
    }
  };

  // Open add person dialog
  const openAddPersonDialog = (campusId: number | string) => {
    setSelectedCampusId(campusId);

    let defaultRole: CampusRole = "Campus Staff";
    if (campusId === "district") {
      defaultRole = isNationalTeam ? "National Director" : "District Director";
    } else if (campusId === "district-staff") {
      defaultRole = isNationalTeam ? "National Staff" : "District Staff";
    } else if (typeof campusId === "number") {
      const campus = campusesWithPeople.find(c => c.id === campusId);
      if (campus) {
        if (isNationalTeam) {
          if (
            campus.name?.trim().toLowerCase() === "regional directors" &&
            campus.people.length === 0
          ) {
            defaultRole = "Field Director";
          } else {
            defaultRole = "National Staff";
          }
        } else {
          // Campus rows: first person = Campus Director, rest = Campus Staff
          defaultRole =
            campus.people.length === 0 ? "Campus Director" : "Campus Staff";
        }
      }
    }

    setPersonForm({
      name: "",
      role: defaultRole,
      status: "not-invited",
      needType: "None",
      needAmount: "",
      fundsReceivedAmount: "",
      needDetails: "",
      notes: "",
      spouseAttending: false,
      childrenCount: 0,
      guestsCount: 0,
      childrenAges: [],
      depositPaid: false,
      needsMet: false,
      householdId: null,
    });
    setIsPersonDialogOpen(true);
  };

  // Handle drag and drop - person move
  const handlePersonMove = (
    draggedId: string,
    draggedCampusId: number | string,
    targetCampusId: number | string,
    targetIndex: number
  ) => {
    // Find the person
    const person = peopleWithNeeds.find(p => p.personId === draggedId);
    if (!person) return;

    // Handle moving to district director
    if (targetCampusId === "district") {
      handleDistrictDirectorDrop(draggedId, draggedCampusId);
      return;
    }

    if (targetCampusId === "district-staff") {
      handleDistrictStaffDrop(draggedId, draggedCampusId);
      return;
    }

    // Handle within-campus reorder (same campus)
    if (
      draggedCampusId === targetCampusId &&
      typeof targetCampusId === "number"
    ) {
      const campus = campusesWithPeople.find(c => c.id === targetCampusId);
      if (!campus) return;

      // Get current order (from stored order or current people list)
      const currentOrder =
        campusPeopleOrder[targetCampusId] ||
        getSortedPeople(campus.people, targetCampusId).map(p => p.personId);

      // Remove dragged person from current position
      const newOrder = currentOrder.filter(id => id !== draggedId);
      // Insert at target position
      const insertAt = Math.min(targetIndex, newOrder.length);
      newOrder.splice(insertAt, 0, draggedId);

      // Save custom order and enable preserve mode
      setCampusPeopleOrder(prev => ({ ...prev, [targetCampusId]: newOrder }));
      setPreserveOrder(true);
      // Clear sort preference for this campus (now custom)
      setCampusSorts(prev => {
        const updated = { ...prev };
        delete updated[targetCampusId];
        return updated;
      });
      return;
    }

    // Handle moving to a campus
    if (typeof targetCampusId === "number") {
      updatePerson.mutate({
        personId: person.personId,
        primaryCampusId: targetCampusId,
      });
    }
  };

  const content = district ? (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto scrollbar-hide py-2 px-2 sm:px-4">
        {/* Wrapper to keep header and campuses same width */}
        <div className="w-max min-w-full">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-3 sm:p-4 mb-2">
            {/* Title Section - District Name, Region, Directors, and Needs Summary */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div
                ref={districtNameRef}
                className="w-[12rem] min-w-[12rem] max-w-[12rem] flex-shrink-0"
              >
                <h1 className="font-semibold text-slate-900 leading-tight tracking-tight text-xl sm:text-2xl">
                  {isNationalTeam ? (
                    <span className="font-semibold text-slate-900 tracking-tight text-xl sm:text-2xl">
                      XAN
                    </span>
                  ) : (
                    <EditableText
                      value={district.name}
                      onSave={newName => {
                        updateDistrictName.mutate({
                          id: district.id,
                          name: newName,
                        });
                      }}
                      disabled={disableEdits}
                      className="font-semibold text-slate-900 tracking-tight text-xl sm:text-2xl"
                      inputClassName="font-semibold text-slate-900 tracking-tight text-xl sm:text-2xl"
                    />
                  )}
                  {disableEdits && !isNationalTeam && (
                    <span className="ml-1 text-slate-400"></span>
                  )}
                </h1>
                <span className="text-slate-500 text-sm mt-0.5 block font-medium">
                  {isNationalTeam ? (
                    <span className="text-slate-500 text-sm py-2.5 pr-4 min-h-[2.25rem] block -mx-0.5 rounded">
                      Chi Alpha National Team
                    </span>
                  ) : (
                    <EditableText
                      value={district.region}
                      onSave={newRegion => {
                        updateDistrictRegion.mutate({
                          id: district.id,
                          region: newRegion,
                        });
                      }}
                      disabled={disableEdits}
                      className="text-slate-500 text-sm py-2.5 pr-4 min-h-[2.25rem] block -mx-0.5 rounded"
                      inputClassName="text-slate-500 text-sm"
                    />
                  )}
                  {disableEdits && !isNationalTeam && (
                    <span className="ml-1 text-slate-400"></span>
                  )}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

              {/* District Director and Staff - grouped together with smaller gap */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* District Director */}
                <div ref={districtDirectorRef}>
                  <DistrictDirectorDropZone
                    person={displayedDistrictDirector}
                    onDrop={handleDistrictDirectorDrop}
                    onEdit={handleEditPerson}
                    onClick={() => {
                      if (!displayedDistrictDirector) return;
                      const statusCycle: Person["status"][] = [
                        "Not Invited",
                        "Yes",
                        "Maybe",
                        "No",
                      ];
                      const currentIndex = statusCycle.indexOf(
                        displayedDistrictDirector.status
                      );
                      const nextStatus =
                        statusCycle[(currentIndex + 1) % statusCycle.length];
                      onPersonStatusChange(
                        displayedDistrictDirector.personId,
                        nextStatus
                      );
                    }}
                    onAddClick={() => {
                      openAddPersonDialog("district");
                    }}
                    quickAddMode={quickAddMode === "district"}
                    quickAddName={quickAddName}
                    onQuickAddNameChange={setQuickAddName}
                    onQuickAddSubmit={() => handleQuickAddSubmit("district")}
                    onQuickAddCancel={() => {
                      setQuickAddMode(null);
                      setQuickAddName("");
                    }}
                    onQuickAddClick={e => handleQuickAddClick(e, "district")}
                    quickAddInputRef={quickAddInputRef}
                    districtId={district?.id || null}
                    canInteract={
                      canInteract &&
                      (displayedDistrictDirector
                        ? userCanEditPerson(displayedDistrictDirector)
                        : true)
                    }
                    maskIdentity={isPublicSafeMode}
                    maskDetails={
                      !isPublicSafeMode &&
                      !!displayedDistrictDirector &&
                      !userCanViewDetails(displayedDistrictDirector)
                    }
                  />
                </div>

                {/* District Staff slots (optional, multiple) */}
                {displayedDistrictStaffList.map(person => (
                  <DistrictStaffDropZone
                    key={person.personId}
                    person={person}
                    onDrop={handleDistrictStaffDrop}
                    onEdit={handleEditPerson}
                    onClick={() => {
                      if (!person) return;
                      const statusCycle: Person["status"][] = [
                        "Not Invited",
                        "Yes",
                        "Maybe",
                        "No",
                      ];
                      const currentIndex = statusCycle.indexOf(person.status);
                      const nextStatus =
                        statusCycle[(currentIndex + 1) % statusCycle.length];
                      onPersonStatusChange(person.personId, nextStatus);
                    }}
                    onAddClick={() => {
                      openAddPersonDialog("district-staff");
                    }}
                    quickAddMode={quickAddMode === "district-staff"}
                    quickAddName={quickAddName}
                    onQuickAddNameChange={setQuickAddName}
                    onQuickAddSubmit={() =>
                      handleQuickAddSubmit("district-staff")
                    }
                    onQuickAddCancel={() => {
                      setQuickAddMode(null);
                      setQuickAddName("");
                    }}
                    onQuickAddClick={e =>
                      handleQuickAddClick(e, "district-staff")
                    }
                    quickAddInputRef={quickAddInputRef}
                    canInteract={canInteract && userCanEditPerson(person)}
                    maskIdentity={isPublicSafeMode}
                    maskDetails={
                      !isPublicSafeMode && !userCanViewDetails(person)
                    }
                  />
                ))}
                {/* Only one add slot in header at a time: show add-staff slot only when director exists (otherwise add is on director slot as District Director) */}
                {canInteract &&
                  !isPublicSafeMode &&
                  displayedDistrictDirector && (
                    <DistrictStaffDropZone
                      person={null}
                      onDrop={handleDistrictStaffDrop}
                      onEdit={handleEditPerson}
                      onClick={() => {
                        return;
                      }}
                      onAddClick={() => {
                        openAddPersonDialog("district-staff");
                      }}
                      quickAddMode={quickAddMode === "district-staff"}
                      quickAddName={quickAddName}
                      onQuickAddNameChange={setQuickAddName}
                      onQuickAddSubmit={() =>
                        handleQuickAddSubmit("district-staff")
                      }
                      onQuickAddCancel={() => {
                        setQuickAddMode(null);
                        setQuickAddName("");
                      }}
                      onQuickAddClick={e =>
                        handleQuickAddClick(e, "district-staff")
                      }
                      quickAddInputRef={quickAddInputRef}
                      canInteract={canInteract}
                      maskIdentity={isPublicSafeMode}
                      maskDetails={false}
                    />
                  )}
              </div>

              <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

              {/* Stats + Needs/Funds with divider between status block and Needs Met */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Stats - two blocks (Yes/No, Maybe/Not Invited Yet) with Open in Table on hover */}
                <div
                  className="group/stats relative flex items-center gap-3 flex-shrink-0 text-[13px] cursor-pointer rounded-md px-1 -mx-1"
                  onClick={() =>
                    onOpenTable?.({
                      statusFilter: new Set([
                        "Yes",
                        "Maybe",
                        "No",
                        "Not Invited",
                      ]),
                    })
                  }
                >
                  <div className="flex flex-col gap-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-700 flex-shrink-0"></div>
                      <span className="text-slate-600">Yes:</span>
                      <span className="font-semibold text-slate-900 tabular-nums mr-1.5">
                        {safeStats.going}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-700 flex-shrink-0"></div>
                      <span className="text-slate-600 whitespace-nowrap">
                        No:
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums mr-1.5">
                        {safeStats.notGoing}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-600 flex-shrink-0"></div>
                      <span className="text-slate-600">Maybe:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {safeStats.maybe}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0"></div>
                      <span className="text-slate-600 whitespace-nowrap">
                        Not Invited Yet:
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {safeStats.notInvited}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md opacity-0 group-hover/stats:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Table
                    </span>
                  </div>
                </div>

                <div className="w-px h-7 bg-slate-200 flex-shrink-0"></div>

                {/* Needs / Funds Summary (right side) - with Open in Table on hover */}
                <div
                  className="group/needs relative flex-shrink-0 cursor-pointer rounded-md px-1 -mx-1"
                  onClick={() => onOpenTable?.({ needsView: true })}
                >
                  <div className="inline-flex flex-col gap-y-0.5">
                    <div className="flex items-baseline gap-x-3">
                      <span className="w-[7rem] text-[13px] font-medium text-slate-500 text-right shrink-0">
                        Needs Met:
                      </span>
                      <span className="text-[13px] font-semibold text-slate-700 tabular-nums text-left min-w-0">
                        {needsSummary.metNeeds}{" "}
                        <span className="text-slate-500 font-medium">/</span>{" "}
                        {needsSummary.totalNeeds}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-x-3">
                      <span className="w-[7rem] text-[13px] font-medium text-slate-500 text-right shrink-0">
                        Funds Received:
                      </span>
                      <span className="text-[13px] text-slate-600 tabular-nums text-left min-w-0">
                        {`$${((needsSummary.metFinancial || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}{" "}
                        <span className="text-slate-500 font-medium">/</span>{" "}
                        {`$${((needsSummary.totalFinancial || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md opacity-0 group-hover/needs:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Table
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campuses Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-2 pl-2 pr-2 transition-all md:hover:shadow-md md:hover:border-slate-200">
            <div className="space-y-1.5 min-w-max">
              {campusesWithPeople.map((campus, index) => {
                const sortedPeople = getSortedPeople(campus.people, campus.id);
                const canEditThisCampus = canEditCampus(campus.id);
                return (
                  <div key={campus.id} className="relative">
                    {/* Drop zone before campus (covers top half of row) */}
                    <CampusOrderDropZone
                      index={index}
                      onDrop={handleCampusReorder}
                      position="before"
                      canInteract={canEditThisCampus}
                    />

                    {/* Drop zone after campus (covers bottom half of row) */}
                    <CampusOrderDropZone
                      index={index + 1}
                      onDrop={handleCampusReorder}
                      position="after"
                      canInteract={canEditThisCampus}
                    />

                    {/* Draggable Campus Row */}
                    <DraggableCampusRow
                      campusId={campus.id}
                      canInteract={canEditThisCampus}
                    >
                      <div className="flex items-center gap-0 py-0.5 border-b border-slate-100 last:border-b-0 group relative z-10">
                        {/* Campus Name section - fixed width with right border barrier */}
                        <CampusNameDropZone
                          campusId={campus.id}
                          onDrop={handleCampusNameDrop}
                          canInteract={canEditThisCampus}
                        >
                          <div className="w-[16rem] max-w-[16rem] flex-shrink-0 flex items-center gap-2 -ml-2 min-w-0 pr-1 border-r border-slate-200">
                            {/* Kebab Menu */}
                            <div className="relative z-20 flex-shrink-0">
                              <button
                                disabled={!canEditThisCampus}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!canEditThisCampus) return;
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setCampusMenuPosition({
                                    x: rect.left,
                                    y: rect.bottom,
                                  });
                                  setOpenCampusMenuId(
                                    openCampusMenuId === campus.id
                                      ? null
                                      : campus.id
                                  );
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100 relative z-20 disabled:opacity-0 disabled:cursor-default"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-300 hover:text-gray-500" />
                              </button>

                              {/* Dropdown Menu */}
                              {openCampusMenuId === campus.id &&
                                createPortal(
                                  <>
                                    {/* Invisible backdrop to catch clicks outside */}
                                    <div
                                      className="fixed inset-0 z-[99998]"
                                      onClick={() => setOpenCampusMenuId(null)}
                                    ></div>

                                    <div
                                      className="fixed w-52 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-[99999]"
                                      style={{
                                        left: `${campusMenuPosition.x}px`,
                                        top: `${campusMenuPosition.y + 4}px`,
                                      }}
                                    >
                                      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                        Sort by
                                      </div>
                                      <button
                                        onClick={() => {
                                          handleCampusSortChange(
                                            campus.id,
                                            "status"
                                          );
                                          setOpenCampusMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 min-h-[40px]"
                                      >
                                        {campusSorts[campus.id] === "status" ||
                                        (!campusSorts[campus.id] &&
                                          !preserveOrder) ? (
                                          <Check className="w-4 h-4 text-slate-600 shrink-0" />
                                        ) : (
                                          <span className="w-4 shrink-0" />
                                        )}
                                        <span>Status</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          // Cancel any pending sort animation
                                          if (sortTimeoutRef.current) {
                                            clearTimeout(
                                              sortTimeoutRef.current
                                            );
                                            sortTimeoutRef.current = null;
                                          }
                                          setAnimatingSortCampus(null);
                                          // Custom = preserve current order
                                          setPreserveOrder(true);
                                          // Clear sort preference to use custom order
                                          setCampusSorts(prev => {
                                            const updated = { ...prev };
                                            delete updated[campus.id];
                                            return updated;
                                          });
                                          setOpenCampusMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 min-h-[40px]"
                                      >
                                        {preserveOrder &&
                                        !campusSorts[campus.id] ? (
                                          <Check className="w-4 h-4 text-slate-600 shrink-0" />
                                        ) : (
                                          <span className="w-4 shrink-0" />
                                        )}
                                        <span>Custom</span>
                                      </button>
                                      <div className="border-t border-slate-100 my-2" />
                                      <button
                                        onClick={() => {
                                          handleEditCampus(campus.id);
                                          setOpenCampusMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 min-h-[40px]"
                                      >
                                        <Edit2 className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span>Edit {entityName} Name</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          const ok = window.confirm(
                                            `Delete ${entityName.toLowerCase()} "${campus.name}"? People in this ${entityName.toLowerCase()} will be removed from assignment.`
                                          );
                                          if (ok) {
                                            deleteCampus.mutate({
                                              id: campus.id,
                                            });
                                          }
                                          setOpenCampusMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 min-h-[40px]"
                                      >
                                        <Trash2 className="w-4 h-4 shrink-0" />
                                        <span>Delete {entityName}</span>
                                      </button>
                                    </div>
                                  </>,
                                  document.body
                                )}
                            </div>
                            {editingCampusId === campus.id ? (
                              <Input
                                ref={inlineCampusNameInputRef}
                                value={campusForm.name}
                                onChange={e =>
                                  setCampusForm({ name: e.target.value })
                                }
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const name = campusForm.name?.trim();
                                    if (
                                      name &&
                                      !hasCampusNameConflict(name, campus.id)
                                    )
                                      handleUpdateCampus(campus.id);
                                    else if (name)
                                      toast.error(
                                        "A campus with a very similar name already exists in this district."
                                      );
                                  } else if (e.key === "Escape") {
                                    setEditingCampusId(null);
                                    setCampusForm({
                                      name: campus.name ?? "",
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  const name = campusForm.name?.trim();
                                  if (name && name !== (campus.name ?? "")) {
                                    if (!hasCampusNameConflict(name, campus.id))
                                      handleUpdateCampus(campus.id);
                                    else
                                      setCampusForm({
                                        name: campus.name ?? "",
                                      });
                                  }
                                  setEditingCampusId(null);
                                }}
                                className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xl md:text-xl font-medium text-slate-900 break-words bg-transparent py-0 px-0 text-left h-auto min-h-[1.75rem] leading-tight"
                              />
                            ) : (
                              <h3 className="font-medium text-slate-900 break-words text-xl min-w-0 flex-1">
                                {campus.name}
                              </h3>
                            )}
                          </div>
                        </CampusNameDropZone>

                        {/* Person Figures - start right after campus name barrier; same column for all rows */}
                        <div className="flex-1 min-w-0 pl-0 -ml-1">
                          <CampusDropZone
                            campusId={campus.id}
                            onDrop={handleCampusRowDrop}
                            canInteract={canEditThisCampus}
                          >
                            <div className="flex items-center gap-3 min-h-[70px] min-w-max pr-4">
                              {sortedPeople.map((person, index) => {
                                // Mark first campus director (first person of first campus) with data attribute
                                const isFirstCampusDirector =
                                  index === 0 &&
                                  campusesWithPeople.length > 0 &&
                                  campusesWithPeople[0].id === campus.id &&
                                  (person.primaryRole
                                    ?.toLowerCase()
                                    .includes("campus director") ||
                                    index === 0);

                                return (
                                  <PersonDropZone
                                    key={`dropzone-${person.personId}`}
                                    campusId={campus.id}
                                    index={index}
                                    onDrop={handlePersonMove}
                                    canInteract={canEditThisCampus}
                                  >
                                    <div
                                      ref={
                                        isFirstCampusDirector
                                          ? campusDirectorRef
                                          : null
                                      }
                                      data-first-campus-director={
                                        isFirstCampusDirector
                                          ? "true"
                                          : undefined
                                      }
                                    >
                                      <DroppablePerson
                                        key={person.personId}
                                        person={person}
                                        campusId={campus.id}
                                        index={index}
                                        onEdit={handleEditPerson}
                                        onClick={handlePersonClick}
                                        onMove={handlePersonMove}
                                        hasNeeds={
                                          (
                                            person as Person & {
                                              hasNeeds?: boolean;
                                            }
                                          ).hasNeeds
                                        }
                                        onPersonStatusChange={
                                          onPersonStatusChange
                                        }
                                        canInteract={userCanEditPerson(person)}
                                        slowAnimation={
                                          animatingSortCampus === campus.id
                                        }
                                        maskIdentity={isPublicSafeMode}
                                        maskDetails={
                                          !isPublicSafeMode &&
                                          !userCanViewDetails(person)
                                        }
                                      />
                                    </div>
                                  </PersonDropZone>
                                );
                              })}

                              {canEditThisCampus && (
                                <>
                                  {/* Add Person Button */}
                                  <PersonDropZone
                                    campusId={campus.id}
                                    index={sortedPeople.length}
                                    onDrop={handlePersonMove}
                                    canInteract={canEditThisCampus}
                                  >
                                    <div className="relative group/person flex flex-col items-center w-[60px] flex-shrink-0 group/add -mt-2">
                                      <button
                                        type="button"
                                        disabled={!canEditThisCampus}
                                        onClick={e => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (!canEditThisCampus) return;
                                          openAddPersonDialog(campus.id);
                                        }}
                                        className="flex flex-col items-center w-full disabled:opacity-60 disabled:cursor-default"
                                      >
                                        {/* Plus sign in name position - clickable for quick add */}
                                        <div className="relative flex items-center justify-center mb-1 w-full min-w-0 overflow-visible">
                                          {quickAddMode ===
                                          `campus-${campus.id}` ? (
                                            <div className="relative">
                                              <Input
                                                ref={quickAddInputRef}
                                                value={quickAddName}
                                                onChange={e =>
                                                  setQuickAddName(
                                                    e.target.value
                                                  )
                                                }
                                                onKeyDown={e => {
                                                  // Prevent space from triggering the parent button behavior
                                                  e.stopPropagation();
                                                  if (e.key === "Enter") {
                                                    handleQuickAddSubmit(
                                                      `campus-${campus.id}`
                                                    );
                                                  } else if (
                                                    e.key === "Escape"
                                                  ) {
                                                    setQuickAddMode(null);
                                                    setQuickAddName("");
                                                  }
                                                }}
                                                onBlur={() => {
                                                  handleQuickAddSubmit(
                                                    `campus-${campus.id}`
                                                  );
                                                }}
                                                placeholder="Name"
                                                className="w-28 h-7 text-sm px-2 py-1 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                                                autoFocus
                                                spellCheck={true}
                                                autoComplete="name"
                                              />
                                              {/* Quick Add label above */}
                                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm text-slate-500 whitespace-nowrap pointer-events-none">
                                                Quick Add
                                              </div>
                                              {/* Name suggestions dropdown (same behavior as full Add Person) */}
                                              {quickAddFilteredNameSuggestions.length >
                                                0 && (
                                                <ul
                                                  className="absolute left-1/2 -translate-x-1/2 top-full z-10 mt-0.5 max-h-40 w-40 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg text-left"
                                                  role="listbox"
                                                >
                                                  {quickAddFilteredNameSuggestions.map(
                                                    (name, idx) => (
                                                      <li
                                                        key={`${name}-${idx}`}
                                                        role="option"
                                                        aria-selected={
                                                          idx ===
                                                          nameSuggestionsHighlightIndex
                                                        }
                                                        className={`cursor-pointer px-3 py-1.5 text-xs ${
                                                          idx ===
                                                          nameSuggestionsHighlightIndex
                                                            ? "bg-slate-100"
                                                            : "hover:bg-slate-50"
                                                        }`}
                                                        onMouseDown={e => {
                                                          e.preventDefault();
                                                          setQuickAddName(name);
                                                        }}
                                                      >
                                                        {name}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="relative inline-flex items-center justify-center p-0.5 rounded opacity-0 group-hover/add:opacity-100 transition-all cursor-pointer hover:bg-slate-100 hover:scale-110">
                                              <Plus
                                                className="w-4 h-4 text-black"
                                                strokeWidth={1.5}
                                                onClick={e =>
                                                  handleQuickAddClick(
                                                    e,
                                                    campus.id
                                                  )
                                                }
                                              />
                                              <span className="absolute left-full top-1/2 -translate-y-1/2 text-[8px] text-slate-400 whitespace-nowrap pointer-events-none opacity-0 group-hover/add:opacity-100 transition-opacity z-10">
                                                Quick Add
                                              </span>
                                            </span>
                                          )}
                                        </div>
                                        {/* Icon - outline User only; plus is above head in name position */}
                                        <div className="relative inline-block transition-transform hover:scale-105 active:scale-95 -mt-0.5">
                                          <User
                                            className="w-10 h-10 text-gray-300 transition-all"
                                            strokeWidth={1}
                                            fill="none"
                                            stroke="currentColor"
                                          />
                                          <User
                                            className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none"
                                            strokeWidth={1}
                                            fill="none"
                                            stroke="currentColor"
                                          />
                                          <User
                                            className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none"
                                            strokeWidth={0}
                                            fill="currentColor"
                                            style={{
                                              filter:
                                                "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                                            }}
                                          />
                                        </div>
                                      </button>
                                      {/* Label - Absolutely positioned, shown on hover */}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/add:opacity-100 transition-opacity">
                                        Add
                                      </div>
                                    </div>
                                  </PersonDropZone>
                                </>
                              )}
                            </div>
                          </CampusDropZone>
                        </div>
                      </div>
                    </DraggableCampusRow>
                  </div>
                );
              })}

              {/* Add {entityName} (Inline) - Only when canInteract; types in same block as campus names. Fixed height and top alignment so switching to input doesn't move the type box. */}
              {canInteract && (
                <div
                  className="relative z-10 pt-2 min-h-[3.5rem] flex flex-col justify-start"
                  style={{ pointerEvents: "auto" }}
                >
                  {quickAddMode === "add-campus" ? (
                    <div className="flex items-center gap-0 py-3 border-b border-slate-100">
                      <div className="w-[16rem] max-w-[16rem] flex-shrink-0 flex items-center gap-2 -ml-2 min-w-0 pr-1 border-r border-slate-200">
                        <span className="w-7 flex-shrink-0" aria-hidden />
                        <Input
                          ref={quickAddInputRef}
                          value={quickAddName}
                          onChange={e => setQuickAddName(e.target.value)}
                          placeholder={`New ${entityName.toLowerCase()} name…`}
                          className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xl md:text-xl font-medium text-slate-900 break-words bg-transparent placeholder:text-slate-400 py-0 px-0 pl-0 text-left h-auto min-h-[1.75rem] leading-tight"
                          spellCheck={true}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const name = quickAddName.trim();
                              if (!name) return;
                              if (hasCampusNameConflict(name)) {
                                toast.error(
                                  `A ${entityName.toLowerCase()} with a very similar name already exists. Please use that ${entityName.toLowerCase()} instead of creating a duplicate.`
                                );
                                return;
                              }
                              createCampus.mutate({
                                name,
                                districtId: district.id,
                              });
                              setQuickAddName("");
                              setQuickAddMode(null);
                            } else if (e.key === "Escape") {
                              setQuickAddName("");
                              setQuickAddMode(null);
                            }
                          }}
                          onBlur={() => {
                            if (!quickAddName.trim()) {
                              setQuickAddMode(null);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="flex-1 min-w-0" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disableEdits}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (disableEdits) return;
                        setQuickAddMode("add-campus");
                        setQuickAddName("");
                        setTimeout(() => quickAddInputRef.current?.focus(), 0);
                      }}
                      className="w-[calc(16rem-12px)] max-w-[calc(16rem-12px)] py-3 pl-0 pr-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-start gap-2 text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-default"
                    >
                      <span className="w-7 flex-shrink-0" aria-hidden />
                      <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                      <span className="text-sm">
                        Add {entityName}
                        {disableEdits ? " " : ""}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Close wrapper div */}
      </div>
    </div>
  ) : null;

  // Always wrap in DndProvider so hooks have context, but disable drag/drop via canDrag/canDrop
  const mainContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full flex flex-col"
    >
      {content}
    </motion.div>
  );

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        {mainContent}
        <CustomDragLayer getPerson={getPerson} getCampus={getCampus} />
      </DndProvider>

      {/* Quick-add still uses list="quick-add-name-suggestions" from drop zones; name fields use live suggestions only */}
      <datalist id="quick-add-name-suggestions">
        {nameSuggestions.map((name, idx) => (
          <option key={idx} value={name} />
        ))}
      </datalist>

      {canEditDistrict && (
        <>
          {/* Add Person Dialog — ResponsiveDialog: BottomSheet on mobile, Dialog on desktop */}
          <ResponsiveDialog
            open={isPersonDialogOpen}
            onOpenChange={open => {
              setIsPersonDialogOpen(open);
              if (!open) {
                // Reset form when dialog is closed
                setPersonForm({
                  name: "",
                  role: "Campus Staff",
                  status: "not-invited",
                  needType: "None",
                  needAmount: "",
                  fundsReceivedAmount: "",
                  needDetails: "",
                  notes: "",
                  spouseAttending: false,
                  childrenCount: 0,
                  guestsCount: 0,
                  childrenAges: [],
                  depositPaid: false,
                  needsMet: false,
                  householdId: null,
                });
                setSelectedCampusId(null);
                setHouseholdInputValue("");
                setHouseholdDropdownOpen(false);
                setNameInputFocused(false);
                setNameSuggestionsHighlightIndex(-1);
              }
            }}
            title="Add New Person"
            snapPoints={[100]}
            defaultSnap={0}
            closeOnBackdrop={true}
            showCloseButton={false}
            showSnapPoints={false}
            compactHeader={true}
            fullScreen={true}
          >
            <form
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                if (
                  !personForm.name.trim() ||
                  !personForm.role.trim() ||
                  !selectedCampusId ||
                  createPerson.isPending
                ) {
                  return;
                }
                handleAddPerson();
              }}
            >
              <div className="space-y-6 py-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Basic Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2 relative">
                      <Label htmlFor="person-name">Full Name *</Label>
                      <Input
                        id="person-name"
                        value={personForm.name}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            name: e.target.value,
                          });
                          setHouseholdNameError(null);
                          setNameSuggestionsHighlightIndex(
                            filteredNameSuggestions.length > 0 ? 0 : -1
                          );
                        }}
                        onFocus={() => setNameInputFocused(true)}
                        onBlur={() =>
                          setTimeout(() => setNameInputFocused(false), 150)
                        }
                        onKeyDown={e => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setNameSuggestionsHighlightIndex(i =>
                              i < filteredNameSuggestions.length - 1 ? i + 1 : i
                            );
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setNameSuggestionsHighlightIndex(i =>
                              i > 0 ? i - 1 : 0
                            );
                          } else if (
                            e.key === "Enter" &&
                            nameSuggestionsHighlightIndex >= 0 &&
                            filteredNameSuggestions[
                              nameSuggestionsHighlightIndex
                            ]
                          ) {
                            e.preventDefault();
                            setPersonForm({
                              ...personForm,
                              name: filteredNameSuggestions[
                                nameSuggestionsHighlightIndex
                              ],
                            });
                            setNameInputFocused(false);
                            setNameSuggestionsHighlightIndex(-1);
                          } else if (e.key === "Escape") {
                            setNameInputFocused(false);
                            setNameSuggestionsHighlightIndex(-1);
                          }
                        }}
                        placeholder="Enter full name"
                        spellCheck={true}
                        autoComplete="off"
                      />
                      {nameInputFocused &&
                        filteredNameSuggestions.length > 0 && (
                          <ul
                            className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                            role="listbox"
                          >
                            {filteredNameSuggestions.map((name, idx) => (
                              <li
                                key={`${name}-${idx}`}
                                role="option"
                                aria-selected={
                                  idx === nameSuggestionsHighlightIndex
                                }
                                className={`cursor-pointer px-3 py-2 text-sm ${
                                  idx === nameSuggestionsHighlightIndex
                                    ? "bg-slate-100"
                                    : "hover:bg-slate-50"
                                }`}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setPersonForm({
                                    ...personForm,
                                    name,
                                  });
                                  setNameInputFocused(false);
                                  setNameSuggestionsHighlightIndex(-1);
                                }}
                                onMouseEnter={() =>
                                  setNameSuggestionsHighlightIndex(idx)
                                }
                              >
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person-role">Role *</Label>
                      {selectedCampusId === "district" ? (
                        <Input
                          id="person-role"
                          value={
                            isNationalTeam
                              ? "National Director"
                              : "District Director"
                          }
                          disabled
                          className="bg-slate-100 cursor-not-allowed"
                        />
                      ) : isFirstPersonInRegionalDirectorsAdd ? (
                        <Input
                          id="person-role"
                          value="Field Director"
                          disabled
                          className="bg-slate-100 cursor-not-allowed"
                        />
                      ) : (
                        <Select
                          value={personForm.role}
                          onValueChange={value =>
                            setPersonForm({
                              ...personForm,
                              role: value as CampusRole,
                            })
                          }
                        >
                          <SelectTrigger id="person-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="person-status">Status</Label>
                      <Select
                        value={personForm.status}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            status: value as keyof typeof statusMap,
                          })
                        }
                      >
                        <SelectTrigger id="person-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="director">Yes</SelectItem>
                          <SelectItem value="staff">Maybe</SelectItem>
                          <SelectItem value="co-director">No</SelectItem>
                          <SelectItem value="not-invited">
                            Not Invited Yet
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Family & Guests - collapsible, hidden by default */}
                <div className="mt-4 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setFamilyGuestsExpanded(!familyGuestsExpanded)
                      }
                      className="flex items-center gap-2 py-2 text-left hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-slate-700">
                        Family & Guests (optional)
                      </h3>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${familyGuestsExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    <div ref={householdInputRef} className="relative min-w-0">
                      <span
                        role="button"
                        tabIndex={0}
                        id="person-household"
                        onClick={e => {
                          e.stopPropagation();
                          setHouseholdDropdownOpen(!householdDropdownOpen);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setHouseholdDropdownOpen(!householdDropdownOpen);
                          }
                        }}
                        title="Autoset by last name"
                        className="text-xs italic text-slate-500 cursor-pointer hover:underline focus:outline-none focus:underline ml-0.5"
                      >
                        {householdInputValue
                          ? householdInputValue
                          : personForm.name.trim()
                            ? `${getLastName(personForm.name)} Household`
                            : ""}
                      </span>
                      {householdDropdownOpen && allHouseholds && allPeople && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto min-w-[11rem]">
                          {householdInputValue.trim() &&
                            !allHouseholds.some(h => {
                              const members = allPeople.filter(
                                p => p.householdId === h.id
                              );
                              const displayName =
                                h.label ||
                                (members.length > 0
                                  ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                  : "Household");
                              return (
                                displayName.toLowerCase() ===
                                householdInputValue.trim().toLowerCase()
                              );
                            }) && (
                              <div
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleCreateHouseholdFromInput();
                                }}
                              >
                                Create "{householdInputValue.trim()}"
                              </div>
                            )}
                          <div
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={e => {
                              e.preventDefault();
                              setHouseholdInputValue("");
                              setPersonForm({
                                ...personForm,
                                householdId: null,
                              });
                              setHouseholdDropdownOpen(false);
                            }}
                          >
                            None
                          </div>
                          {allHouseholds
                            .filter(household => {
                              if (!householdInputValue.trim()) return true;
                              const members = allPeople.filter(
                                p => p.householdId === household.id
                              );
                              const displayName =
                                household.label ||
                                (members.length > 0
                                  ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                  : "Household");
                              return displayName
                                .toLowerCase()
                                .includes(householdInputValue.toLowerCase());
                            })
                            .map(household => {
                              const members = allPeople.filter(
                                p => p.householdId === household.id
                              );
                              const displayName =
                                household.label ||
                                (members.length > 0
                                  ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                  : "Household");
                              return (
                                <div
                                  key={household.id}
                                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    setHouseholdInputValue(displayName);
                                    setPersonForm({
                                      ...personForm,
                                      householdId: household.id,
                                    });
                                    setHouseholdDropdownOpen(false);
                                    setHouseholdValidationError(null);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span>{displayName}</span>
                                    {members.length > 0 && (
                                      <span className="text-xs text-slate-500">
                                        {members.map(m => m.name).join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                  {familyGuestsExpanded && (
                    <div className="pt-4 pb-2">
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                        <div className="space-y-2">
                          <Label
                            htmlFor="person-spouse-attending"
                            className="text-sm font-medium"
                          >
                            Spouse attending
                          </Label>
                          <div className="flex items-center min-h-9">
                            <Checkbox
                              id="person-spouse-attending"
                              checked={personForm.spouseAttending}
                              onCheckedChange={checked => {
                                setPersonForm({
                                  ...personForm,
                                  spouseAttending: checked === true,
                                });
                                setHouseholdValidationError(null);
                                setHouseholdNameError(null);
                              }}
                              className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 h-4 w-4 shrink-0"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="person-children-count">
                            Children attending
                          </Label>
                          <Input
                            id="person-children-count"
                            type="number"
                            min="0"
                            max="10"
                            value={
                              personForm.childrenCount === 0
                                ? ""
                                : personForm.childrenCount
                            }
                            onChange={e => {
                              const raw = e.target.value;
                              if (raw === "") {
                                setPersonForm({
                                  ...personForm,
                                  childrenCount: 0,
                                  childrenAges: [],
                                });
                                setHouseholdValidationError(null);
                                setHouseholdNameError(null);
                                return;
                              }
                              const count = Math.max(
                                0,
                                Math.min(10, parseInt(raw, 10) || 0)
                              );
                              setPersonForm({
                                ...personForm,
                                childrenCount: count,
                                childrenAges: Array(count).fill(""),
                              });
                              setHouseholdValidationError(null);
                              setHouseholdNameError(null);
                            }}
                            placeholder="0"
                            className="w-24 focus-visible:border-red-600/60 focus-visible:ring-red-600/25 focus-visible:ring-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="person-guests-count">
                            Guests attending
                          </Label>
                          <Input
                            id="person-guests-count"
                            type="number"
                            min="0"
                            max="10"
                            value={
                              personForm.guestsCount === 0
                                ? ""
                                : personForm.guestsCount
                            }
                            onChange={e => {
                              const raw = e.target.value;
                              if (raw === "") {
                                setPersonForm({
                                  ...personForm,
                                  guestsCount: 0,
                                });
                                return;
                              }
                              const count = Math.max(
                                0,
                                Math.min(10, parseInt(raw, 10) || 0)
                              );
                              setPersonForm({
                                ...personForm,
                                guestsCount: count,
                              });
                            }}
                            placeholder="0"
                            className="w-24 focus-visible:border-red-600/60 focus-visible:ring-red-600/25 focus-visible:ring-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Need, Funds Needed */}
                <div className="space-y-4 mt-4">
                  <div className="flex items-start gap-4 flex-nowrap">
                    <div className="space-y-2 w-32">
                      <Label htmlFor="person-need">Need</Label>
                      <Select
                        value={personForm.needType}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            needType: value as
                              | "None"
                              | "Registration"
                              | "Transportation"
                              | "Housing"
                              | "Other",
                            needAmount: "",
                            fundsReceivedAmount: "",
                            needDetails: "",
                          })
                        }
                      >
                        <SelectTrigger id="person-need">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Registration">
                            Registration
                          </SelectItem>
                          <SelectItem value="Transportation">
                            Transportation
                          </SelectItem>
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {personForm.needType !== "None" && (
                        <motion.div
                          key="funds-fields"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-4"
                        >
                          <div className="space-y-2 w-32">
                            <Label htmlFor="person-need-amount">
                              Funds Needed
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                $
                              </span>
                              <Input
                                id="person-need-amount"
                                type="number"
                                step="0.01"
                                value={personForm.needAmount}
                                onChange={e =>
                                  setPersonForm({
                                    ...personForm,
                                    needAmount: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                                className="pl-7 w-28"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 w-40">
                            <Label htmlFor="person-funds-received-amount">
                              Funds Received
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                $
                              </span>
                              <Input
                                id="person-funds-received-amount"
                                type="number"
                                step="0.01"
                                value={personForm.fundsReceivedAmount}
                                onChange={e =>
                                  setPersonForm({
                                    ...personForm,
                                    fundsReceivedAmount: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                                className="pl-7 w-28"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Need Note (only when need selected) and Journey Notes - slow slide when need selected */}
                <motion.div
                  layout
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className={`space-y-4 mt-4 grid gap-4 overflow-hidden ${personForm.needType !== "None" ? "grid-cols-[1fr_1fr]" : "grid-cols-1"}`}
                >
                  <AnimatePresence mode="popLayout">
                    {personForm.needType !== "None" && (
                      <motion.div
                        key="need-note"
                        initial={{ opacity: 0, x: -120 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -120 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="space-y-4 min-w-0 w-full"
                      >
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">
                          Need Note
                        </h3>
                        <div className="space-y-2 min-w-0">
                          <Textarea
                            id="person-need-notes"
                            value={personForm.needDetails || ""}
                            onChange={e => {
                              setPersonForm({
                                ...personForm,
                                needDetails: e.target.value,
                              });
                            }}
                            placeholder="Enter notes about the need"
                            rows={4}
                            className="resize-none w-full min-w-0"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Label
                            htmlFor="person-needs-met"
                            className="cursor-pointer text-sm font-medium"
                          >
                            Need Met
                          </Label>
                          <Checkbox
                            id="person-needs-met"
                            checked={personForm.needsMet}
                            onCheckedChange={checked =>
                              setPersonForm({
                                ...personForm,
                                needsMet: checked === true,
                              })
                            }
                            className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Journey Notes Section - slides when Need Note appears */}
                  <motion.div
                    layout
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="space-y-4 min-w-0 w-full"
                  >
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Journey Notes
                    </h3>
                    <div className="space-y-2 min-w-0">
                      <Textarea
                        id="person-notes"
                        value={personForm.notes || ""}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            notes: e.target.value,
                          });
                        }}
                        placeholder="Enter journey notes"
                        rows={4}
                        className="resize-none w-full min-w-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Label
                        htmlFor="person-deposit-paid"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Deposit Paid
                      </Label>
                      <Checkbox
                        id="person-deposit-paid"
                        checked={personForm.depositPaid}
                        onCheckedChange={checked =>
                          setPersonForm({
                            ...personForm,
                            depositPaid: checked === true,
                          })
                        }
                        className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </div>
              <DialogFooter className="flex w-full items-center justify-between pt-0 px-0">
                <div />
                <div className="flex items-center gap-3 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPersonDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (
                        !personForm.name.trim() ||
                        !personForm.role.trim() ||
                        !selectedCampusId ||
                        createPerson.isPending
                      ) {
                        return;
                      }
                      handleAddPerson();
                    }}
                    disabled={
                      !personForm.name.trim() ||
                      !personForm.role.trim() ||
                      !selectedCampusId ||
                      createPerson.isPending
                    }
                    className="bg-black text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createPerson.isPending ? "Adding..." : "Add Person"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </ResponsiveDialog>

          {/* Edit Person Dialog — ResponsiveDialog: BottomSheet on mobile, Dialog on desktop */}
          <ResponsiveDialog
            open={isEditPersonDialogOpen}
            onOpenChange={open => {
              setIsEditPersonDialogOpen(open);
              if (!open) {
                setHouseholdInputValue("");
                setHouseholdDropdownOpen(false);
                setNameInputFocused(false);
                setNameSuggestionsHighlightIndex(-1);
              }
            }}
            title="Edit Person"
            snapPoints={[100]}
            defaultSnap={0}
            closeOnBackdrop={true}
            showCloseButton={false}
            showSnapPoints={false}
            compactHeader={true}
            fullScreen={true}
          >
            <div className="space-y-6 py-4">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Basic Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="edit-person-name">Full Name *</Label>
                    <Input
                      id="edit-person-name"
                      value={personForm.name}
                      onChange={e => {
                        setPersonForm({
                          ...personForm,
                          name: e.target.value,
                        });
                        setHouseholdNameError(null);
                        setNameSuggestionsHighlightIndex(
                          filteredNameSuggestions.length > 0 ? 0 : -1
                        );
                      }}
                      onFocus={() => setNameInputFocused(true)}
                      onBlur={() =>
                        setTimeout(() => setNameInputFocused(false), 150)
                      }
                      onKeyDown={e => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setNameSuggestionsHighlightIndex(i =>
                            i < filteredNameSuggestions.length - 1 ? i + 1 : i
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setNameSuggestionsHighlightIndex(i =>
                            i > 0 ? i - 1 : 0
                          );
                        } else if (
                          e.key === "Enter" &&
                          nameSuggestionsHighlightIndex >= 0 &&
                          filteredNameSuggestions[nameSuggestionsHighlightIndex]
                        ) {
                          e.preventDefault();
                          setPersonForm({
                            ...personForm,
                            name: filteredNameSuggestions[
                              nameSuggestionsHighlightIndex
                            ],
                          });
                          setNameInputFocused(false);
                          setNameSuggestionsHighlightIndex(-1);
                        } else if (e.key === "Escape") {
                          setNameInputFocused(false);
                          setNameSuggestionsHighlightIndex(-1);
                        }
                      }}
                      spellCheck={true}
                      autoComplete="off"
                      placeholder="Enter full name"
                    />
                    {nameInputFocused && filteredNameSuggestions.length > 0 && (
                      <ul
                        className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                        role="listbox"
                      >
                        {filteredNameSuggestions.map((name, idx) => (
                          <li
                            key={`${name}-${idx}`}
                            role="option"
                            aria-selected={
                              idx === nameSuggestionsHighlightIndex
                            }
                            className={`cursor-pointer px-3 py-2 text-sm ${
                              idx === nameSuggestionsHighlightIndex
                                ? "bg-slate-100"
                                : "hover:bg-slate-50"
                            }`}
                            onMouseDown={e => {
                              e.preventDefault();
                              setPersonForm({
                                ...personForm,
                                name,
                              });
                              setNameInputFocused(false);
                              setNameSuggestionsHighlightIndex(-1);
                            }}
                            onMouseEnter={() =>
                              setNameSuggestionsHighlightIndex(idx)
                            }
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-person-role">Role *</Label>
                    {editingPerson?.campusId === "district" ? (
                      <Input
                        id="edit-person-role"
                        value={
                          isNationalTeam
                            ? "National Director"
                            : "District Director"
                        }
                        disabled
                        className="bg-slate-100 cursor-not-allowed"
                      />
                    ) : isFirstPersonInRegionalDirectorsEdit ? (
                      <Input
                        id="edit-person-role"
                        value="Field Director"
                        disabled
                        className="bg-slate-100 cursor-not-allowed"
                      />
                    ) : (
                      <Select
                        value={personForm.role}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            role: value as CampusRole,
                          })
                        }
                      >
                        <SelectTrigger id="edit-person-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="edit-person-status">Status</Label>
                    <Select
                      value={personForm.status}
                      onValueChange={value =>
                        setPersonForm({
                          ...personForm,
                          status: value as keyof typeof statusMap,
                        })
                      }
                    >
                      <SelectTrigger id="edit-person-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="director">Yes</SelectItem>
                        <SelectItem value="staff">Maybe</SelectItem>
                        <SelectItem value="co-director">No</SelectItem>
                        <SelectItem value="not-invited">
                          Not Invited Yet
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Family & Guests - collapsible, hidden by default */}
              <div className="mt-4 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setFamilyGuestsExpanded(!familyGuestsExpanded)
                    }
                    className="flex items-center gap-2 py-2 text-left hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-slate-700">
                      Family & Guests (optional)
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${familyGuestsExpanded ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <div ref={householdInputRef} className="relative min-w-0">
                    <span
                      role="button"
                      tabIndex={0}
                      id="edit-person-household"
                      onClick={e => {
                        e.stopPropagation();
                        setHouseholdDropdownOpen(!householdDropdownOpen);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setHouseholdDropdownOpen(!householdDropdownOpen);
                        }
                      }}
                      title="Autoset by last name"
                      className="text-xs italic text-slate-500 cursor-pointer hover:underline focus:outline-none focus:underline ml-0.5"
                    >
                      {householdInputValue
                        ? householdInputValue
                        : personForm.name.trim()
                          ? `${getLastName(personForm.name)} Household`
                          : ""}
                    </span>
                    {householdDropdownOpen && allHouseholds && allPeople && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto min-w-[11rem]">
                        {householdInputValue.trim() &&
                          !allHouseholds.some(h => {
                            const members = allPeople.filter(
                              p => p.householdId === h.id
                            );
                            const displayName =
                              h.label ||
                              (members.length > 0
                                ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                : "Household");
                            return (
                              displayName.toLowerCase() ===
                              householdInputValue.trim().toLowerCase()
                            );
                          }) && (
                            <div
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              onMouseDown={e => {
                                e.preventDefault();
                                handleCreateHouseholdFromInput();
                              }}
                            >
                              Create "{householdInputValue.trim()}"
                            </div>
                          )}
                        <div
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={e => {
                            e.preventDefault();
                            setHouseholdInputValue("");
                            setPersonForm({
                              ...personForm,
                              householdId: null,
                            });
                            setHouseholdDropdownOpen(false);
                          }}
                        >
                          None
                        </div>
                        {allHouseholds
                          .filter(household => {
                            if (!householdInputValue.trim()) return true;
                            const members = allPeople.filter(
                              p => p.householdId === household.id
                            );
                            const displayName =
                              household.label ||
                              (members.length > 0
                                ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                : "Household");
                            return displayName
                              .toLowerCase()
                              .includes(householdInputValue.toLowerCase());
                          })
                          .map(household => {
                            const members = allPeople.filter(
                              p => p.householdId === household.id
                            );
                            const displayName =
                              household.label ||
                              (members.length > 0
                                ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                : "Household");
                            return (
                              <div
                                key={household.id}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setHouseholdInputValue(displayName);
                                  setPersonForm({
                                    ...personForm,
                                    householdId: household.id,
                                  });
                                  setHouseholdDropdownOpen(false);
                                  setHouseholdValidationError(null);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{displayName}</span>
                                  {members.length > 0 && (
                                    <span className="text-xs text-slate-500">
                                      {members.map(m => m.name).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
                {familyGuestsExpanded && (
                  <div className="pt-4 pb-2">
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-person-spouse-attending"
                          className="text-sm font-medium"
                        >
                          Spouse attending
                        </Label>
                        <div className="flex items-center min-h-9">
                          <Checkbox
                            id="edit-person-spouse-attending"
                            checked={personForm.spouseAttending}
                            onCheckedChange={checked => {
                              setPersonForm({
                                ...personForm,
                                spouseAttending: checked === true,
                              });
                              setHouseholdValidationError(null);
                              setHouseholdNameError(null);
                            }}
                            className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 h-4 w-4 shrink-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-person-children-count">
                          Children attending
                        </Label>
                        <Input
                          id="edit-person-children-count"
                          type="number"
                          min="0"
                          max="10"
                          value={
                            personForm.childrenCount === 0
                              ? ""
                              : personForm.childrenCount
                          }
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setPersonForm({
                                ...personForm,
                                childrenCount: 0,
                                childrenAges: [],
                              });
                              setHouseholdValidationError(null);
                              setHouseholdNameError(null);
                              return;
                            }
                            const count = Math.max(
                              0,
                              Math.min(10, parseInt(raw, 10) || 0)
                            );
                            setPersonForm({
                              ...personForm,
                              childrenCount: count,
                              childrenAges: Array(count).fill(""),
                            });
                            setHouseholdValidationError(null);
                            setHouseholdNameError(null);
                          }}
                          placeholder="0"
                          className="w-24 focus-visible:border-red-600/60 focus-visible:ring-red-600/25 focus-visible:ring-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-person-guests-count">
                          Guests attending
                        </Label>
                        <Input
                          id="edit-person-guests-count"
                          type="number"
                          min="0"
                          max="10"
                          value={
                            personForm.guestsCount === 0
                              ? ""
                              : personForm.guestsCount
                          }
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setPersonForm({
                                ...personForm,
                                guestsCount: 0,
                              });
                              return;
                            }
                            const count = Math.max(
                              0,
                              Math.min(10, parseInt(raw, 10) || 0)
                            );
                            setPersonForm({
                              ...personForm,
                              guestsCount: count,
                            });
                          }}
                          placeholder="0"
                          className="w-24 focus-visible:border-red-600/60 focus-visible:ring-red-600/25 focus-visible:ring-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Need, Funds Needed */}
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-4 flex-nowrap">
                  <div className="space-y-2 w-32">
                    <Label htmlFor="edit-person-need">Need</Label>
                    <Select
                      value={personForm.needType}
                      onValueChange={value =>
                        setPersonForm({
                          ...personForm,
                          needType: value as
                            | "None"
                            | "Registration"
                            | "Transportation"
                            | "Housing"
                            | "Other",
                          needAmount: "",
                          fundsReceivedAmount: "",
                          needDetails: "",
                        })
                      }
                    >
                      <SelectTrigger id="edit-person-need">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Registration">
                          Registration
                        </SelectItem>
                        <SelectItem value="Transportation">
                          Transportation
                        </SelectItem>
                        <SelectItem value="Housing">Housing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {personForm.needType !== "None" && (
                      <motion.div
                        key="funds-fields"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-4"
                      >
                        <div className="space-y-2 w-32">
                          <Label htmlFor="edit-person-need-amount">
                            Funds Needed
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                              $
                            </span>
                            <Input
                              id="edit-person-need-amount"
                              type="number"
                              step="0.01"
                              value={personForm.needAmount}
                              onChange={e =>
                                setPersonForm({
                                  ...personForm,
                                  needAmount: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="pl-7 w-24"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 w-32">
                          <Label htmlFor="edit-person-funds-received-amount">
                            Funds Received
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                              $
                            </span>
                            <Input
                              id="edit-person-funds-received-amount"
                              type="number"
                              step="0.01"
                              value={personForm.fundsReceivedAmount}
                              onChange={e =>
                                setPersonForm({
                                  ...personForm,
                                  fundsReceivedAmount: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="pl-7 w-24"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Need Note (only when need selected) and Journey Notes - slow slide when need selected */}
              <motion.div
                layout
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className={`space-y-4 mt-4 grid gap-4 overflow-hidden ${personForm.needType !== "None" ? "grid-cols-[1fr_1fr]" : "grid-cols-1"}`}
              >
                <AnimatePresence mode="popLayout">
                  {personForm.needType !== "None" && (
                    <motion.div
                      key="edit-need-note"
                      initial={{ opacity: 0, x: -120 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -120 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="space-y-4 min-w-0 w-full"
                    >
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Need Note
                      </h3>
                      <div className="space-y-2 min-w-0">
                        <Textarea
                          id="edit-person-need-notes"
                          value={personForm.needDetails || ""}
                          onChange={e => {
                            setPersonForm({
                              ...personForm,
                              needDetails: e.target.value,
                            });
                          }}
                          placeholder="Enter notes about the need"
                          rows={4}
                          className="resize-none w-full min-w-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Label
                          htmlFor="edit-person-needs-met"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Need Met
                        </Label>
                        <Checkbox
                          id="edit-person-needs-met"
                          checked={personForm.needsMet}
                          onCheckedChange={checked =>
                            setPersonForm({
                              ...personForm,
                              needsMet: checked === true,
                            })
                          }
                          className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Journey Notes Section - slides when Need Note appears */}
                <motion.div
                  layout
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="space-y-4 min-w-0 w-full"
                >
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">
                    Journey Notes
                  </h3>
                  <div className="space-y-2 min-w-0">
                    <Textarea
                      id="edit-person-notes"
                      value={personForm.notes || ""}
                      onChange={e => {
                        setPersonForm({
                          ...personForm,
                          notes: e.target.value,
                        });
                      }}
                      placeholder="Enter journey notes"
                      rows={4}
                      className="resize-none w-full min-w-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Label
                      htmlFor="edit-person-deposit-paid"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Deposit Paid
                    </Label>
                    <Checkbox
                      id="edit-person-deposit-paid"
                      checked={personForm.depositPaid}
                      onCheckedChange={checked =>
                        setPersonForm({
                          ...personForm,
                          depositPaid: checked === true,
                        })
                      }
                      className="border-slate-600 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>
            <DialogFooter className="flex w-full items-center justify-between pt-0 px-0">
              {/* Trashcan - anchored to far bottom-left */}
              <button
                onClick={handleDeletePerson}
                disabled={deletePerson.isPending}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Delete person"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Right side: Cancel, Update */}
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditPersonDialogOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleUpdatePerson}
                  className="bg-black text-white hover:bg-red-600"
                >
                  Update Person
                </Button>
              </div>
            </DialogFooter>
          </ResponsiveDialog>

          {/* Delete Person Confirmation Dialog */}
          <AlertDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Person</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{editingPerson?.person.name}
                  "? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <Checkbox
                  id="dont-ask-again"
                  checked={dontAskAgain}
                  onCheckedChange={checked => setDontAskAgain(checked === true)}
                />
                <label
                  htmlFor="dont-ask-again"
                  className="text-sm font-medium leading-none peer-disabled:cursor-default peer-disabled:opacity-70 cursor-pointer"
                >
                  Don't ask again
                </label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDontAskAgain(false);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Add Campus/Category Dialog */}
          <ResponsiveDialog
            open={isCampusDialogOpen}
            onOpenChange={setIsCampusDialogOpen}
            title={`Add New ${entityName}`}
            snapPoints={[30, 50]}
            defaultSnap={1}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campus-name">{entityName} Name</Label>
                <Input
                  id="campus-name"
                  value={campusForm.name}
                  onChange={e => setCampusForm({ name: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (campusForm.name.trim() && !createCampus.isPending) {
                        handleAddCampus();
                      }
                    }
                  }}
                  placeholder={`Enter ${entityName.toLowerCase()} name`}
                  spellCheck={true}
                  autoComplete="organization"
                  autoFocus
                  className="text-xl md:text-xl font-semibold text-slate-900 focus-visible:border-red-400/60 focus-visible:ring-red-400/25"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCampusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCampus}
                disabled={!campusForm.name.trim() || createCampus.isPending}
              >
                {createCampus.isPending ? "Adding..." : `Add ${entityName}`}
              </Button>
            </DialogFooter>
          </ResponsiveDialog>

          {/* Edit Campus/Category Dialog */}
          <ResponsiveDialog
            open={isEditCampusDialogOpen}
            onOpenChange={setIsEditCampusDialogOpen}
            title={`Edit ${entityName}`}
            snapPoints={[30, 50]}
            defaultSnap={1}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-campus-name">{entityName} Name</Label>
                <Input
                  id="edit-campus-name"
                  list="edit-campus-name-suggestions"
                  value={campusForm.name}
                  onChange={e => setCampusForm({ name: e.target.value })}
                  placeholder={`Enter ${entityName.toLowerCase()} name`}
                  spellCheck={true}
                  autoComplete="organization"
                  className="text-xl md:text-xl font-semibold text-slate-900 focus-visible:border-red-400/60 focus-visible:ring-red-400/25"
                />
                <datalist id="edit-campus-name-suggestions">
                  {campusSuggestions.map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditCampusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleUpdateCampus()}
                disabled={!campusForm.name.trim() || updateCampusName.isPending}
              >
                {updateCampusName.isPending
                  ? "Updating..."
                  : `Update ${entityName}`}
              </Button>
            </DialogFooter>
          </ResponsiveDialog>
        </>
      )}
    </>
  );
}
