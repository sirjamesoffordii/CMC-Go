import {
  X,
  Plus,
  User,
  Edit2,
  Check,
  Archive,
  Trash2,
  Download,
  MoreVertical,
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
import { deriveHouseholdLabel } from "@/lib/householdLabel";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useAuth } from "@/_core/hooks/useAuth";

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
  onClose,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
  onDistrictUpdate,
}: DistrictPanelProps) {
  const { isAuthenticated } = usePublicAuth();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Visibility & edit gating:
  // - Public/out-of-scope: aggregates + campuses + presence icons only (no identities)
  // - In-scope: full interactive behavior
  const canViewPeopleDetails = isAuthenticated && !isOutOfScope;
  const canEditDistrict = isAuthenticated && !isOutOfScope;
  const isPublicSafeMode = !canViewPeopleDetails;
  const disableEdits = isPublicSafeMode || !canEditDistrict;
  // Back-compat name used throughout this component
  const canInteract = !disableEdits;

  // XAN is Chi Alpha National Team, not a district
  const isNationalTeam = district?.id === "XAN";
  const entityName = isNationalTeam ? "Category" : "Campus";
  const entityNamePlural = isNationalTeam ? "Categories" : "Campuses";
  const organizationName = isNationalTeam ? "National Team" : "District";

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
  const [statusFilter, setStatusFilter] = useState<
    Set<"Yes" | "Maybe" | "No" | "Not Invited">
  >(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [myCampusOnly, setMyCampusOnly] = useState(false);

  // List view state - expanded campuses
  const [expandedCampuses, setExpandedCampuses] = useState<Set<number>>(
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
      alert(
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
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district?.id ?? "" });
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
    onError: error => {
      console.error("Error updating person:", error);
      alert(`Error updating person: ${error.message || "Unknown error"}`);
    },
  });
  const updatePersonStatus = trpc.people.updateStatus.useMutation({
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
      // Invalidate all people queries to ensure UI updates
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      if (district?.id) {
        utils.people.byDistrict.invalidate({ districtId: district.id });
      }
      // Also invalidate campuses to refresh people counts
      utils.campuses.byDistrict.invalidate({ districtId: district?.id ?? "" });
      onDistrictUpdate();
      // Reset form and close dialog only after successful creation
      setPersonForm({
        name: "",
        role: "Campus Staff",
        status: "not-invited",
        needType: "None",
        needAmount: "",
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
      alert(`Error creating person: ${error.message || "Unknown error"}`);
    },
  });
  const deletePerson = trpc.people.delete.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      if (districtId) {
        utils.metrics.district.invalidate({ districtId });
      }
      utils.followUp.list.invalidate();
      setIsEditPersonDialogOpen(false);
      setEditingPerson(null);
      onDistrictUpdate();
    },
  });
  const archiveCampus = trpc.campuses.archive.useMutation({
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
  const [campusMenuPosition, setCampusMenuPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  // Refs for dynamic positioning
  const districtNameRef = useRef<HTMLDivElement>(null);
  const districtDirectorRef = useRef<HTMLDivElement>(null);
  const campusDirectorRef = useRef<HTMLDivElement>(null);
  const [pieChartOffset, setPieChartOffset] = useState(0);
  const [labelsOffset, setLabelsOffset] = useState(0);
  const pieChartPadding = Math.max(0, pieChartOffset);
  const statsGridOffset =
    labelsOffset > 0 ? Math.max(0, labelsOffset - pieChartPadding - 116) : 32;

  // Note: Needs and notes are now fetched directly in handleEditPerson to avoid infinite loops
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Authoritative role list - this is the only source of truth
  const campusRoles = [
    "Volunteer",
    "Intern",
    "Campus Staff",
    "Campus Co-Director",
    "Campus Director",
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
      volunteer: "Volunteer",
      intern: "Intern",
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

  // Filter out 'District Staff' for campus rows (only show it for district header add/edit)
  const filteredRoles = isDistrictHeaderContext
    ? baseAvailableRoles
    : baseAvailableRoles.filter(role => role !== "District Staff");

  // If editing a person, map their role to authoritative role and ensure it's in the available roles list
  const mappedEditingRole = editingPerson?.person?.primaryRole
    ? mapRoleToAuthoritative(editingPerson.person.primaryRole)
    : null;

  const availableRoles =
    mappedEditingRole && !filteredRoles.includes(mappedEditingRole)
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
      | "Financial"
      | "Transportation"
      | "Housing"
      | "Other",
    needAmount: "",
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
  const [householdValidationError, setHouseholdValidationError] = useState<
    string | null
  >(null);
  const [householdNameError, setHouseholdNameError] = useState<string | null>(
    null
  );

  // Household combobox state
  const [householdInputValue, setHouseholdInputValue] = useState("");
  const [householdDropdownOpen, setHouseholdDropdownOpen] = useState(false);
  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const householdInputRef = useRef<HTMLInputElement>(null);
  const householdDropdownRef = useRef<HTMLDivElement>(null);

  const [campusForm, setCampusForm] = useState({
    name: "",
  });

  // Campus sort preferences
  const [campusSorts, setCampusSorts] = useState<
    Record<number, "status" | "name" | "role">
  >({});
  // Preserve order when status changes (don't auto-sort)
  const [preserveOrder, setPreserveOrder] = useState(true);
  // Store original order of people per campus (by personId)
  const [campusPeopleOrder, setCampusPeopleOrder] = useState<
    Record<number, string[]>
  >({});

  // Fetch active needs only - used for counting and hasNeeds indicators
  // Only active needs are counted. Inactive needs are retained for history.
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery(undefined, {
    enabled: canEditDistrict,
    retry: false,
  });

  // Fetch households for dropdown
  const { data: allHouseholds = [], error: householdsError } =
    trpc.households.list.useQuery(undefined, {
      retry: false,
    });
  const [householdSearchQuery, setHouseholdSearchQuery] = useState("");
  const { data: searchedHouseholds = [] } = trpc.households.search.useQuery(
    { query: householdSearchQuery },
    { enabled: householdSearchQuery.length > 0 }
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
      // Update input value to show the created household
      setHouseholdInputValue(newHousehold.label || "Household");
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
  }, [
    personForm.householdId,
    allHouseholds,
    allPeople,
    isPersonDialogOpen,
    householdDropdownOpen,
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
  });

  // Helper to get household members for display
  const getHouseholdDisplayName = (householdId: number) => {
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
  const hasHouseholdValidationError =
    isHouseholdRequired && !personForm.householdId;

  const updateOrCreateNeed = trpc.needs.updateOrCreate.useMutation({
    onSuccess: () => {
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  const deleteNeed = trpc.needs.delete.useMutation({
    onSuccess: () => {
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
      onDistrictUpdate();
    },
  });
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.byPerson.invalidate();
      utils.people.list.invalidate();
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

    // Common first names
    const commonNames = [
      "Jacob",
      "Jake",
      "Jacky",
      "Jack",
      "James",
      "John",
      "Michael",
      "David",
      "Daniel",
      "Matthew",
      "Sarah",
      "Emily",
      "Jessica",
      "Ashley",
      "Amanda",
      "Jennifer",
      "Michelle",
      "Nicole",
      "Stephanie",
      "Robert",
      "William",
      "Richard",
      "Joseph",
      "Thomas",
      "Christopher",
      "Charles",
      "Mark",
      "Donald",
      "Elizabeth",
      "Mary",
      "Patricia",
      "Linda",
      "Barbara",
      "Susan",
      "Karen",
      "Nancy",
      "Lisa",
      "Joshua",
      "Andrew",
      "Kevin",
      "Brian",
      "George",
      "Edward",
      "Ronald",
      "Timothy",
      "Jason",
      "Betty",
      "Helen",
      "Sandra",
      "Donna",
      "Carol",
      "Ruth",
      "Sharon",
      "Michelle",
      "Laura",
      "Moriah",
      "Shelli",
      "Jake",
      "Jake",
      "Jake",
    ];

    commonNames.forEach(name => existingNames.add(name));
    return Array.from(existingNames).sort();
  }, [allPeople]);

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
      "Not Invited": 0,
      Yes: 1,
      Maybe: 2,
      No: 3,
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

  // PR 5: Filter people based on status, search, and campus
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

  const districtLevelPeople = isPublicSafeMode
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

  const sortedUnassignedPeople = useMemo(() => {
    const statusOrder: Record<Person["status"], number> = {
      "Not Invited": 0,
      Yes: 1,
      Maybe: 2,
      No: 3,
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
        } catch (_e) {
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

  // Create ordered campuses with people (using filtered list)
  const campusesWithPeople = useMemo(() => {
    const ordered =
      campusOrder.length > 0
        ? (campusOrder
            .map(id => campusesForLayout.find(c => c.id === id))
            .filter(Boolean) as Campus[])
        : campusesForLayout;

    return ordered.map(campus => ({
      ...campus,
      people: isPublicSafeMode
        ? buildPublicPlaceholderPeople(
            publicCampusCountMap.get(campus.id) ?? 0,
            campus.id
          )
        : filteredPeople.filter(p => p.primaryCampusId === campus.id),
    }));
  }, [
    buildPublicPlaceholderPeople,
    campusesForLayout,
    campusOrder,
    filteredPeople,
    isPublicSafeMode,
    publicCampusCountMap,
  ]);

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
            // Center the stats grid under the icon (stats grid is approximately 200px wide)
            const labelsOffset = directorCenter - containerRect.left - 100;
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

  // Store initial order when panel opens or data changes significantly
  useEffect(() => {
    // When panel opens, preserve order initially (so status changes don't move people)
    // But default to status sort for when panel closes/refreshes
    setPreserveOrder(true);

    const newOrder: Record<number, string[]> = {};
    campusesWithPeople.forEach(campus => {
      // Store current order, but if no custom order exists, use status-sorted order as baseline
      const currentSort = campusSorts[campus.id] || "status";
      if (currentSort === "status") {
        // Store status-sorted order as the initial order
        const statusOrder: Record<Person["status"], number> = {
          "Not Invited": 0,
          Yes: 1,
          Maybe: 2,
          No: 3,
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

  // Calculate stats using shared utility with allPeople to ensure consistency with tooltip and map
  // This ensures the stats match exactly what's shown in the tooltip and map metrics
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
    // Use allPeople (same source as InteractiveMap) for stats calculation
    const districtStats = calculateDistrictStats(allPeople, district.id);
    return toDistrictPanelStats(districtStats);
  }, [allPeople, district?.id, isPublicSafeMode, publicDistrictMetrics]);

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

    return {
      totalNeeds,
      metNeeds: 0,
      totalFinancial, // in cents
    };
  }, [allNeeds, peopleWithNeeds, publicDistrictNeeds]);

  const totalPeople =
    safeStats.going +
    safeStats.maybe +
    safeStats.notGoing +
    safeStats.notInvited;
  const invitedPercentage =
    totalPeople > 0
      ? Math.round(((totalPeople - safeStats.notInvited) / totalPeople) * 100)
      : 0;

  // Sort people based on campus preference
  const getSortedPeople = (people: Person[], campusId: number) => {
    // If preserveOrder is true AND we have a stored order, maintain the stored order
    // This prevents people from moving when status changes while panel is open
    if (preserveOrder && campusPeopleOrder[campusId]) {
      const order = campusPeopleOrder[campusId];
      const peopleMap = new Map(people.map(p => [p.personId, p]));
      const ordered: Person[] = [];
      const unordered: Person[] = [];

      // First, add people in the stored order
      order.forEach(personId => {
        const person = peopleMap.get(personId);
        if (person) {
          ordered.push(person);
          peopleMap.delete(personId);
        }
      });

      // Then add any new people that weren't in the original order
      // New people should be sorted by status (default)
      peopleMap.forEach(person => unordered.push(person));
      if (unordered.length > 0) {
        const statusOrder: Record<Person["status"], number> = {
          "Not Invited": 0,
          Yes: 1,
          Maybe: 2,
          No: 3,
        };
        unordered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      }

      return [...ordered, ...unordered];
    }

    // Otherwise, sort normally (applies on page refresh or when user selects "Status")
    const sortBy = campusSorts[campusId] || "status";

    if (sortBy === "name") {
      return [...people].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "role") {
      return [...people].sort((a, b) =>
        (a.primaryRole || "").localeCompare(b.primaryRole || "")
      );
    } else {
      // Sort by status: Not Invited, Yes, Maybe, No (default)
      const statusOrder: Record<Person["status"], number> = {
        "Not Invited": 0,
        Yes: 1,
        Maybe: 2,
        No: 3,
      };
      return [...people].sort(
        (a, b) => statusOrder[a.status] - statusOrder[b.status]
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

  // Handle household input blur - create household if value doesn't match existing
  const handleHouseholdInputBlur = () => {
    const inputValue = householdInputValue.trim();
    if (!inputValue) {
      setPersonForm({ ...personForm, householdId: null });
      return;
    }

    if (!allHouseholds || !allPeople) return;

    // Check if input matches an existing household
    const matchingHousehold = allHouseholds.find(household => {
      const members = allPeople.filter(p => p.householdId === household.id);
      const displayName =
        household.label ||
        (members.length > 0
          ? `${members[0].name.split(" ").pop() || "Household"} Household`
          : "Household");
      return displayName.toLowerCase() === inputValue.toLowerCase();
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
    const mutationData: any = {
      personId,
      name: name.trim(),
      primaryDistrictId: district.id,
      status: "Not Invited", // Default status
      primaryRole: "Campus Staff", // Default role
      depositPaid: false,
    };

    // Set role and campus based on target
    if (targetId === "district") {
      // National Team (XAN) uses "National Director", districts use "District Director"
      mutationData.primaryRole = isNationalTeam
        ? "National Director"
        : "District Director";
      mutationData.primaryCampusId = null;
    } else if (targetId === "district-staff") {
      mutationData.primaryRole = "District Staff";
      mutationData.primaryCampusId = null;
    } else {
      // Campus quick-add
      if (typeof targetId === "number") {
        mutationData.primaryRole = "Campus Staff";
        mutationData.primaryCampusId = targetId;
      } else {
        mutationData.primaryCampusId = null;
      }

      // Add primaryRegion if district has it
      if (district.region) {
        mutationData.primaryRegion = district.region;
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
        alert("Failed to create person: " + error.message);
        setQuickAddMode(null);
        setQuickAddName("");
      },
    });
  };

  // Handle add person
  const handleAddPerson = async () => {
    console.log("handleAddPerson called", {
      selectedCampusId,
      name: personForm.name,
      role: personForm.role,
      district: district?.id,
    });

    if (!selectedCampusId) {
      console.error("No campus selected");
      alert("Please select a campus or location first");
      return;
    }

    if (!personForm.name?.trim()) {
      console.error("Name is required");
      alert("Name is required");
      return;
    }

    if (!personForm.role?.trim()) {
      console.error("Role is required");
      alert("Role is required");
      return;
    }

    if (!district?.id) {
      console.error("District ID is missing");
      alert("District information is missing");
      return;
    }

    const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build mutation data - use 'any' type to allow conditional fields
    const mutationData: any = {
      personId,
      name: personForm.name.trim(),
      primaryDistrictId: district.id,
      status: statusMap[personForm.status],
    };

    // Set depositPaid - ensure it's a boolean
    mutationData.depositPaid = personForm.depositPaid ?? false;

    // Set role and campus based on selection
    if (selectedCampusId === "district") {
      // National Team (XAN) uses "National Director", districts use "District Director"
      mutationData.primaryRole = isNationalTeam
        ? "National Director"
        : "District Director";
      // Don't set primaryCampusId for district director (will be null in DB)
    } else if (selectedCampusId === "district-staff") {
      // Add district staff
      mutationData.primaryRole = "District Staff";
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

    // Auto-create or find existing household if family/guests are added and no household exists
    let householdIdToUse = personForm.householdId;
    if (
      (personForm.spouseAttending ||
        personForm.childrenCount > 0 ||
        personForm.guestsCount > 0) &&
      !personForm.householdId
    ) {
      // Extract last name from person's name
      const nameParts = personForm.name.trim().split(" ");
      const lastName =
        nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const householdLabel = `${lastName} Household`;

      // Check if there's already a household with this last name for people in the same district
      const existingHousehold = allHouseholds.find(h => {
        if (
          !h.label ||
          !h.label.toLowerCase().includes(lastName.toLowerCase())
        ) {
          return false;
        }
        // Check if any people in this district already belong to this household
        const householdMembers = allPeople.filter(
          p => p.householdId === h.id && p.primaryDistrictId === district.id
        );
        if (householdMembers.length > 0) {
          // Check if any member has the same last name
          return householdMembers.some(member => {
            const memberNameParts = member.name.trim().split(" ");
            const memberLastName =
              memberNameParts.length > 1
                ? memberNameParts[memberNameParts.length - 1]
                : memberNameParts[0];
            return memberLastName.toLowerCase() === lastName.toLowerCase();
          });
        }
        return false;
      });

      if (existingHousehold) {
        // Use existing household - counts will be recalculated after person is saved
        householdIdToUse = existingHousehold.id;
      } else {
        // Create new household with person's last name
        try {
          const newHousehold = await createHousehold.mutateAsync({
            label: householdLabel,
            childrenCount: personForm.childrenCount || 0,
            guestsCount: personForm.guestsCount || 0,
          });
          householdIdToUse = newHousehold.id;
        } catch (error) {
          console.error("Failed to create household:", error);
          alert("Failed to create household. Please try again.");
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

    console.log(
      "Creating person with data:",
      JSON.stringify(mutationData, null, 2)
    );

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
          // Build need description - include needDetails for Financial needs if provided
          let needDescription: string;
          if (personForm.needType === "Financial") {
            const amountPart = `$${personForm.needAmount || "0"}`;
            needDescription = personForm.needDetails
              ? `${amountPart} - ${personForm.needDetails}`
              : `Financial need: ${amountPart}`;
          } else {
            needDescription =
              personForm.needDetails || `${personForm.needType} need`;
          }

          updateOrCreateNeed.mutate({
            personId,
            type: personForm.needType,
            description: needDescription,
            amount:
              personForm.needType === "Financial" && personForm.needAmount
                ? Math.round(parseFloat(personForm.needAmount) * 100)
                : undefined,
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

  // Handle add campus
  const handleAddCampus = () => {
    if (!campusForm.name.trim() || !district) return;
    createCampus.mutate({
      name: campusForm.name.trim(),
      districtId: district.id,
    });
  };

  // Handle edit person
  const handleEditPerson = async (
    campusId: number | string,
    person: Person
  ) => {
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
        } catch (_e) {
          childrenAges = [];
        }
      }

      // Extract needDetails from need description or from notes with noteType="REQUEST"
      let needDetails = "";
      if (personNeed) {
        try {
          if (personNeed.type === "Financial") {
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
              | "Financial"
              | "Transportation"
              | "Housing"
              | "Other")
          : "None",
        needAmount:
          personNeed?.type === "Financial" && personNeed?.amount
            ? (personNeed.amount / 100).toString()
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

      // Set household input value
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
                ? `${members[0].name.split(" ").pop() || "Household"} Household`
                : "Household");
            setHouseholdInputValue(displayName);
          } else {
            setHouseholdInputValue("");
          }
        } else {
          setHouseholdInputValue("");
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
        householdId: personForm.householdId,
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
              utils.people.list.fetch().then(updatedPeople => {
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
              });
            }, 200);
          }
          // Handle needs: create/update if needType is not "None", delete if "None"
          if (formData.needType !== "None" && formData.needType) {
            // Build need description - include needDetails for all need types if provided
            let needDescription: string;
            if (formData.needType === "Financial") {
              const amountPart = `$${formData.needAmount || "0"}`;
              needDescription = formData.needDetails?.trim()
                ? `${amountPart} - ${formData.needDetails.trim()}`
                : `Financial need: ${amountPart}`;
            } else {
              needDescription =
                formData.needDetails?.trim() || `${formData.needType} need`;
            }

            updateOrCreateNeed.mutate(
              {
                personId,
                type: formData.needType,
                description: needDescription,
                amount:
                  formData.needType === "Financial" && formData.needAmount
                    ? Math.round(parseFloat(formData.needAmount) * 100)
                    : undefined,
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

  // Handle edit campus
  const handleEditCampus = (campusId: number) => {
    const campus = campuses.find(c => c.id === campusId);
    if (campus) {
      setCampusForm({ name: campus.name });
      setSelectedCampusId(campusId);
      setIsEditCampusDialogOpen(true);
    }
  };

  // Handle update campus
  const handleUpdateCampus = () => {
    if (
      !selectedCampusId ||
      typeof selectedCampusId !== "number" ||
      !campusForm.name
    )
      return;

    updateCampusName.mutate({ id: selectedCampusId, name: campusForm.name });
    setCampusForm({ name: "" });
    setIsEditCampusDialogOpen(false);
    setSelectedCampusId(null);
  };

  // Handle campus sort change
  const handleCampusSortChange = (
    campusId: number,
    sortBy: "status" | "name" | "role"
  ) => {
    setCampusSorts(prev => ({ ...prev, [campusId]: sortBy }));
    // Disable order preservation when user explicitly sorts
    setPreserveOrder(false);
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
    fromCampusId: number | string
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
    fromCampusId: number | string
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
    campusId: number | string
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
      defaultRole = "District Director";
    } else if (campusId === "district-staff") {
      defaultRole = "District Staff";
    } else if (typeof campusId === "number") {
      const campus = campusesWithPeople.find(c => c.id === campusId);
      if (campus && campus.people.length === 0) {
        defaultRole = "Campus Director";
      }
    }

    setPersonForm({
      name: "",
      role: defaultRole,
      status: "not-invited",
      needType: "None",
      needAmount: "",
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
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-2 sm:p-3 mb-2 w-full">
          {/* Title Section */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-5 flex-wrap">
              <div ref={districtNameRef} className="ml-1 sm:ml-2 min-w-0">
                <h1 className="font-semibold text-slate-900 leading-tight tracking-tight text-xl sm:text-2xl">
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
                  {disableEdits && (
                    <span className="ml-1 text-slate-400"></span>
                  )}
                </h1>
                <span className="text-slate-500 text-sm mt-0.5 block font-medium">
                  <EditableText
                    value={district.region}
                    onSave={newRegion => {
                      updateDistrictRegion.mutate({
                        id: district.id,
                        region: newRegion,
                      });
                    }}
                    disabled={disableEdits}
                    className="text-slate-500 text-sm"
                    inputClassName="text-slate-500 text-sm"
                  />
                  {disableEdits && (
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
                    canInteract={canInteract}
                    maskIdentity={isPublicSafeMode}
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
                    canInteract={canInteract}
                    maskIdentity={isPublicSafeMode}
                  />
                ))}
                {canInteract && !isPublicSafeMode && (
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
                  />
                )}
              </div>
            </div>

            {/* Needs Summary - Clean aligned layout */}
            <div className="flex items-center ml-auto flex-shrink-0 text-right">
              <div className="space-y-0.5">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="font-semibold text-slate-700 tabular-nums text-sm">
                    {Math.max(
                      0,
                      needsSummary.totalNeeds - needsSummary.metNeeds
                    )}
                  </span>
                  <span className="text-slate-500 text-xs">Open</span>
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="font-semibold text-slate-700 tabular-nums text-sm">
                    {`$${(needsSummary.totalFinancial / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  </span>
                  <span className="text-slate-500 text-xs">Requested</span>
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="font-semibold text-slate-700 tabular-nums text-sm">
                    {needsSummary.metNeeds}
                  </span>
                  <span className="text-slate-500 text-xs">Met</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section - Left aligned */}
          <div
            className="flex items-center mt-1.5"
            style={{ paddingLeft: pieChartPadding }}
          >
            {/* Pie Chart - Left aligned, smaller on mobile */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 120 120"
              className="flex-shrink-0 sm:w-[100px] sm:h-[100px]"
            >
              <circle cx="60" cy="60" r="55" fill="#e2e8f0" />
              {(() => {
                const total = totalPeople || 1;
                const goingAngle = (safeStats.going / total) * 360;
                const maybeAngle = (safeStats.maybe / total) * 360;
                const notGoingAngle = (safeStats.notGoing / total) * 360;
                const notInvitedAngle = (safeStats.notInvited / total) * 360;

                const createPieSlice = (
                  startAngle: number,
                  angle: number,
                  color: string
                ) => {
                  const startRad = ((startAngle - 90) * Math.PI) / 180;
                  const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
                  const x1 = 60 + 55 * Math.cos(startRad);
                  const y1 = 60 + 55 * Math.sin(startRad);
                  const x2 = 60 + 55 * Math.cos(endRad);
                  const y2 = 60 + 55 * Math.sin(endRad);
                  const largeArc = angle > 180 ? 1 : 0;

                  return `M 60 60 L ${x1} ${y1} A 55 55 0 ${largeArc} 1 ${x2} ${y2} Z`;
                };

                let currentAngle = 0;
                const slices = [];

                if (safeStats.going > 0) {
                  slices.push(
                    <path
                      key="going"
                      d={createPieSlice(currentAngle, goingAngle, "#047857")}
                      fill="#047857"
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                  currentAngle += goingAngle;
                }

                if (safeStats.maybe > 0) {
                  slices.push(
                    <path
                      key="maybe"
                      d={createPieSlice(currentAngle, maybeAngle, "#ca8a04")}
                      fill="#ca8a04"
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                  currentAngle += maybeAngle;
                }

                if (safeStats.notGoing > 0) {
                  slices.push(
                    <path
                      key="notGoing"
                      d={createPieSlice(currentAngle, notGoingAngle, "#b91c1c")}
                      fill="#b91c1c"
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                  currentAngle += notGoingAngle;
                }

                if (safeStats.notInvited > 0) {
                  slices.push(
                    <path
                      key="notInvited"
                      d={createPieSlice(
                        currentAngle,
                        notInvitedAngle,
                        "#64748b"
                      )}
                      fill="#64748b"
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                }

                return slices;
              })()}
            </svg>

            {/* Stats Grid - Left aligned with more spacing */}
            <div
              className="grid grid-cols-2 gap-x-12 gap-y-2 ml-6"
              style={{ marginLeft: statsGridOffset }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-700 flex-shrink-0 ring-1 ring-emerald-200"></div>
                <span className="text-slate-600 text-base font-medium">
                  Going:
                </span>
                <span className="font-semibold text-slate-900 ml-auto tabular-nums text-base">
                  {safeStats.going}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-600 flex-shrink-0 ring-1 ring-yellow-200"></div>
                <span className="text-slate-600 text-base font-medium">
                  Maybe:
                </span>
                <span className="font-semibold text-slate-900 ml-auto tabular-nums text-base">
                  {safeStats.maybe}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red-700 flex-shrink-0 ring-1 ring-red-200"></div>
                <span className="text-slate-600 text-base font-medium">
                  Not Going:
                </span>
                <span className="font-semibold text-slate-900 ml-auto tabular-nums text-base">
                  {safeStats.notGoing}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-500 flex-shrink-0 ring-1 ring-slate-200"></div>
                <span className="text-slate-600 text-base font-medium">
                  Not Invited Yet:
                </span>
                <span className="font-semibold text-slate-900 ml-auto tabular-nums text-base">
                  {safeStats.notInvited}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Campuses Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-2 pl-2 pr-2 transition-all md:hover:shadow-md md:hover:border-slate-200 w-full">
          <div className="space-y-1.5 min-w-max">
            {campusesWithPeople.map((campus, index) => {
              const sortedPeople = getSortedPeople(campus.people, campus.id);
              return (
                <div key={campus.id} className="relative">
                  {/* Drop zone before campus (covers top half of row) */}
                  <CampusOrderDropZone
                    index={index}
                    onDrop={handleCampusReorder}
                    position="before"
                    canInteract={canInteract}
                  />

                  {/* Drop zone after campus (covers bottom half of row) */}
                  <CampusOrderDropZone
                    index={index + 1}
                    onDrop={handleCampusReorder}
                    position="after"
                    canInteract={canInteract}
                  />

                  {/* Draggable Campus Row */}
                  <DraggableCampusRow
                    campusId={campus.id}
                    canInteract={canInteract}
                  >
                    <div className="flex items-center gap-4 py-0.5 border-b border-slate-100 last:border-b-0 group relative z-10">
                      {/* Campus Name with Kebab Menu */}
                      <CampusNameDropZone
                        campusId={campus.id}
                        onDrop={handleCampusNameDrop}
                        canInteract={canInteract}
                      >
                        <div className="w-72 flex-shrink-0 flex items-center gap-2 -ml-2">
                          {/* Kebab Menu */}
                          <div className="relative z-20">
                            <button
                              disabled={disableEdits}
                              onClick={e => {
                                e.stopPropagation();
                                if (disableEdits) return;
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
                                    className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-[99999]"
                                    style={{
                                      left: `${campusMenuPosition.x}px`,
                                      top: `${campusMenuPosition.y + 4}px`,
                                    }}
                                  >
                                    <div className="px-5 py-2.5 text-sm text-gray-500 font-medium border-b border-gray-100">
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
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      {(campusSorts[campus.id] === "status" ||
                                        (!campusSorts[campus.id] &&
                                          !preserveOrder)) && (
                                        <span className="text-xs">✓</span>
                                      )}
                                      Status
                                    </button>
                                    <button
                                      onClick={() => {
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
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      {preserveOrder &&
                                        !campusSorts[campus.id] && (
                                          <span className="text-xs">✓</span>
                                        )}
                                      Custom
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        handleEditCampus(campus.id);
                                        setOpenCampusMenuId(null);
                                      }}
                                      className="w-full px-5 py-2.5 text-left text-base text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                      Edit Campus Name
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
                                      className="w-full px-5 py-2.5 text-left text-base text-red-600 hover:bg-red-50 flex items-center gap-3"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                      Delete {entityName}
                                    </button>
                                  </div>
                                </>,
                                document.body
                              )}
                          </div>
                          <h3 className="font-medium text-slate-900 break-words text-xl">
                            {campus.name}
                          </h3>
                        </div>
                      </CampusNameDropZone>

                      {/* Person Figures */}
                      <div className="flex-1 min-w-0">
                        <CampusDropZone
                          campusId={campus.id}
                          onDrop={handleCampusRowDrop}
                          canInteract={canInteract}
                        >
                          <div className="flex items-center gap-3 min-h-[70px] min-w-max -ml-16 pr-4">
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
                                  canInteract={canInteract}
                                >
                                  <div
                                    ref={
                                      isFirstCampusDirector
                                        ? campusDirectorRef
                                        : null
                                    }
                                    data-first-campus-director={
                                      isFirstCampusDirector ? "true" : undefined
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
                                      canInteract={canInteract}
                                      maskIdentity={isPublicSafeMode}
                                    />
                                  </div>
                                </PersonDropZone>
                              );
                            })}

                            {canInteract && (
                              <>
                                {/* Add Person Tile */}
                                <PersonDropZone
                                  campusId={campus.id}
                                  index={sortedPeople.length}
                                  onDrop={handlePersonMove}
                                  canInteract={canInteract}
                                >
                                  <div className="relative group/person flex flex-col items-center w-[60px] flex-shrink-0 group/add -mt-2">
                                    <button
                                      type="button"
                                      disabled={disableEdits}
                                      aria-label={`Add person to ${campus.name}`}
                                      onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (disableEdits) return;
                                        openAddPersonDialog(campus.id);
                                      }}
                                      className="flex flex-col items-center w-full disabled:opacity-60 disabled:cursor-default"
                                    >
                                      {/* Plus sign in name position - clickable for quick add */}
                                      <div className="relative flex items-center justify-center mb-1 w-full min-w-0">
                                        {quickAddMode ===
                                        `campus-${campus.id}` ? (
                                          <div className="relative">
                                            <Input
                                              ref={quickAddInputRef}
                                              list="quick-add-name-suggestions"
                                              value={quickAddName}
                                              onChange={e =>
                                                setQuickAddName(e.target.value)
                                              }
                                              onKeyDown={e => {
                                                if (e.key === "Enter") {
                                                  handleQuickAddSubmit(
                                                    `campus-${campus.id}`
                                                  );
                                                } else if (e.key === "Escape") {
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
                                              className="w-20 h-6 text-sm px-2 py-1 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                                              autoFocus
                                              spellCheck={true}
                                              autoComplete="name"
                                            />
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm text-slate-500 whitespace-nowrap pointer-events-none">
                                              Quick Add
                                            </div>
                                          </div>
                                        ) : (
                                          <Plus
                                            className="w-4 h-4 text-black opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110 cursor-pointer"
                                            strokeWidth={1.5}
                                            onClick={e =>
                                              handleQuickAddClick(e, campus.id)
                                            }
                                          />
                                        )}
                                      </div>
                                      {/* Icon - solid */}
                                      <div className="relative">
                                        <User
                                          className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95"
                                          strokeWidth={1.5}
                                          fill="currentColor"
                                        />
                                      </div>
                                    </button>
                                    {/* Label - shown on hover */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/add:opacity-100 transition-opacity">
                                      Add
                                    </div>
                                  </div>
                                </PersonDropZone>

                                {/* Add Person Button */}
                                <PersonDropZone
                                  campusId={campus.id}
                                  index={sortedPeople.length}
                                  onDrop={handlePersonMove}
                                  canInteract={canInteract}
                                >
                                  <div className="relative group/person flex flex-col items-center w-[60px] flex-shrink-0 group/add -mt-2">
                                    <button
                                      type="button"
                                      disabled={disableEdits}
                                      onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (disableEdits) return;
                                        openAddPersonDialog(campus.id);
                                      }}
                                      className="flex flex-col items-center w-full disabled:opacity-60 disabled:cursor-default"
                                    >
                                      {/* Plus sign in name position - clickable for quick add */}
                                      <div className="relative flex items-center justify-center mb-1 w-full min-w-0">
                                        {quickAddMode ===
                                        `campus-${campus.id}` ? (
                                          <div className="relative">
                                            <Input
                                              ref={quickAddInputRef}
                                              value={quickAddName}
                                              onChange={e =>
                                                setQuickAddName(e.target.value)
                                              }
                                              onKeyDown={e => {
                                                if (e.key === "Enter") {
                                                  handleQuickAddSubmit(
                                                    `campus-${campus.id}`
                                                  );
                                                } else if (e.key === "Escape") {
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
                                              className="w-20 h-6 text-sm px-2 py-1 text-center border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                                              autoFocus
                                              spellCheck={true}
                                              autoComplete="name"
                                            />
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm text-slate-500 whitespace-nowrap pointer-events-none">
                                              Quick Add
                                            </div>
                                          </div>
                                        ) : (
                                          <Plus
                                            className="w-4 h-4 text-black opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110 cursor-pointer"
                                            strokeWidth={1.5}
                                            onClick={e =>
                                              handleQuickAddClick(e, campus.id)
                                            }
                                          />
                                        )}
                                      </div>
                                      {/* Icon */}
                                      <div className="relative">
                                        <User
                                          className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95"
                                          strokeWidth={1.5}
                                          fill="none"
                                          stroke="currentColor"
                                        />
                                        <User
                                          className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none"
                                          strokeWidth={1.5}
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
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-xs text-slate-500 text-center max-w-[80px] leading-tight whitespace-nowrap pointer-events-none opacity-0 group-hover/add:opacity-100 transition-opacity">
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

            {/* Add {entityName} (Inline) - Only when canInteract */}
            {canInteract && (
              <div className="relative z-10" style={{ pointerEvents: "auto" }}>
                {quickAddMode === "add-campus" ? (
                  <div className="w-48">
                    <Input
                      ref={quickAddInputRef}
                      value={quickAddName}
                      onChange={e => setQuickAddName(e.target.value)}
                      placeholder={`New ${entityName.toLowerCase()} name…`}
                      className="h-12 text-base"
                      spellCheck={true}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const name = quickAddName.trim();
                          if (!name) return;
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
                        // Keep tidy; only cancel if empty
                        if (!quickAddName.trim()) {
                          setQuickAddMode(null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Press Enter to add • Esc to cancel
                    </div>
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
                    className="w-48 py-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-2 text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-default"
                  >
                    <Plus className="w-5 h-5" strokeWidth={2} />
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
    </div>
  ) : null;

  // Always wrap in DndProvider so hooks have context, but disable drag/drop via canDrag/canDrop
  const mainContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`w-full h-full flex flex-col ${!canInteract ? "cursor-not-allowed" : ""}`}
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

      {/* Datalist for quick-add autocomplete */}
      <datalist id="quick-add-name-suggestions">
        {nameSuggestions.map((name, idx) => (
          <option key={idx} value={name} />
        ))}
      </datalist>

      {canEditDistrict && (
        <>
          {/* Add Person Dialog */}
          <Dialog
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
              }
            }}
          >
            <DialogContent
              aria-describedby={undefined}
              className="max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
              </DialogHeader>
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
                onKeyDown={e => {
                  if (
                    e.key === "Enter" &&
                    (e.target as HTMLElement).tagName !== "TEXTAREA"
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="py-4">
                  {/* 3x3 Grid Layout */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Row 1 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-name"
                        className="text-sm font-medium"
                      >
                        Name *
                      </Label>
                      <Input
                        id="person-name"
                        list="person-name-suggestions"
                        value={personForm.name}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            name: e.target.value,
                          });
                          setHouseholdNameError(null);
                        }}
                        placeholder="Enter name"
                        className="h-9"
                        spellCheck={true}
                        autoComplete="name"
                      />
                      <datalist id="person-name-suggestions">
                        {nameSuggestions.map((name, idx) => (
                          <option key={idx} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-role"
                        className="text-sm font-medium"
                      >
                        Role *
                      </Label>
                      {selectedCampusId === "district" ? (
                        <Input
                          id="person-role"
                          value={
                            isNationalTeam
                              ? "National Director"
                              : "District Director"
                          }
                          disabled
                          className="bg-slate-100 cursor-not-allowed h-9"
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
                          <SelectTrigger id="person-role" className="h-9">
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
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-status"
                        className="text-sm font-medium"
                      >
                        Status
                      </Label>
                      <Select
                        value={personForm.status}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            status: value as keyof typeof statusMap,
                          })
                        }
                      >
                        <SelectTrigger id="person-status" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="director">Going</SelectItem>
                          <SelectItem value="staff">Maybe</SelectItem>
                          <SelectItem value="co-director">Not Going</SelectItem>
                          <SelectItem value="not-invited">
                            Not Invited Yet
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-spouse-attending"
                        className="text-sm font-medium"
                      >
                        Spouse Attending
                      </Label>
                      <div className="flex items-center h-9">
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
                        />
                        <Label
                          htmlFor="person-spouse-attending"
                          className="cursor-pointer ml-2 text-sm"
                        >
                          Yes
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-children-count"
                        className="text-sm font-medium"
                      >
                        Children (0-10)
                      </Label>
                      <Input
                        id="person-children-count"
                        type="number"
                        min="0"
                        max="10"
                        value={personForm.childrenCount}
                        onChange={e => {
                          const count = Math.max(
                            0,
                            Math.min(10, parseInt(e.target.value) || 0)
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
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-guests-count"
                        className="text-sm font-medium"
                      >
                        Guests (0-10)
                      </Label>
                      <Input
                        id="person-guests-count"
                        type="number"
                        min="0"
                        max="10"
                        value={personForm.guestsCount}
                        onChange={e => {
                          const count = Math.max(
                            0,
                            Math.min(10, parseInt(e.target.value) || 0)
                          );
                          setPersonForm({ ...personForm, guestsCount: count });
                        }}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>

                    {/* Row 3 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-household"
                        className="text-sm font-medium"
                      >
                        Household
                      </Label>
                      <div className="relative">
                        <Input
                          ref={householdInputRef}
                          id="person-household"
                          value={householdInputValue}
                          onChange={e => {
                            const value = e.target.value;
                            setHouseholdInputValue(value);
                            setHouseholdSearchQuery(value);
                            setHouseholdDropdownOpen(true);
                            setHouseholdValidationError(null);
                            setHouseholdNameError(null);
                          }}
                          onFocus={() => {
                            setHouseholdDropdownOpen(true);
                            // Set input value to current household label if one is selected
                            if (
                              personForm.householdId &&
                              allHouseholds &&
                              allPeople
                            ) {
                              const household = allHouseholds.find(
                                h => h.id === personForm.householdId
                              );
                              if (household) {
                                const members = allPeople.filter(
                                  p => p.householdId === household.id
                                );
                                const displayName =
                                  household.label ||
                                  (members.length > 0
                                    ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                    : "Household");
                                setHouseholdInputValue(displayName);
                              }
                            }
                          }}
                          onBlur={() => {
                            // Delay to allow click on dropdown item
                            setTimeout(() => {
                              setHouseholdDropdownOpen(false);
                              handleHouseholdInputBlur();
                            }, 200);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleHouseholdInputBlur();
                              householdInputRef.current?.blur();
                            } else if (e.key === "Escape") {
                              setHouseholdDropdownOpen(false);
                              setHouseholdInputValue("");
                              setPersonForm({
                                ...personForm,
                                householdId: null,
                              });
                            }
                          }}
                          placeholder="Type or select household"
                          className="h-9"
                        />
                        {householdDropdownOpen &&
                          allHouseholds &&
                          allPeople && (
                            <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
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
                                    .includes(
                                      householdInputValue.toLowerCase()
                                    );
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
                                            {members
                                              .map(m => m.name)
                                              .join(", ")}
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
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-need"
                        className="text-sm font-medium"
                      >
                        Request
                      </Label>
                      <Select
                        value={personForm.needType}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            needType: value as
                              | "None"
                              | "Financial"
                              | "Transportation"
                              | "Housing"
                              | "Other",
                            needAmount: "",
                            needDetails: "",
                          })
                        }
                      >
                        <SelectTrigger id="person-need" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Financial">Financial</SelectItem>
                          <SelectItem value="Transportation">
                            Transportation
                          </SelectItem>
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {personForm.needType === "Financial" ? (
                          <motion.div
                            key="amount"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2"
                          >
                            <Label
                              htmlFor="person-need-amount"
                              className="text-sm font-medium"
                            >
                              Amount ($)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                $
                              </span>
                              <Input
                                id="person-need-amount"
                                type="number"
                                value={personForm.needAmount}
                                onChange={e =>
                                  setPersonForm({
                                    ...personForm,
                                    needAmount: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                                className="pl-7 h-9"
                              />
                            </div>
                          </motion.div>
                        ) : personForm.needType !== "None" ? (
                          <motion.div
                            key="need-met"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2"
                          >
                            <Label
                              htmlFor="person-needs-met"
                              className="text-sm font-medium"
                            >
                              Request Met
                            </Label>
                            <div className="flex items-center h-9">
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
                              <Label
                                htmlFor="person-needs-met"
                                className="cursor-pointer ml-2 text-sm"
                              >
                                Yes
                              </Label>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="deposit-paid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2"
                          >
                            <Label
                              htmlFor="person-deposit-paid"
                              className="text-sm font-medium"
                            >
                              Deposit Paid
                            </Label>
                            <div className="flex items-center h-9">
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
                              <Label
                                htmlFor="person-deposit-paid"
                                className="cursor-pointer ml-2 text-sm"
                              >
                                Yes
                              </Label>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Household Errors */}
                  {(householdNameError || hasHouseholdValidationError) && (
                    <div className="mt-2 space-y-1">
                      {householdNameError && (
                        <div className="text-xs text-red-600">
                          {householdNameError}
                        </div>
                      )}
                      {hasHouseholdValidationError && (
                        <div className="text-xs text-red-600">
                          To avoid double-counting, link or create a household
                          for spouse/children.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Request Notes and General Notes Section - Side by side */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {/* Request Notes Section */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-need-notes"
                        className="text-sm font-medium"
                      >
                        Request Notes
                      </Label>
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
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* General Notes Section */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="person-notes"
                        className="text-sm font-medium"
                      >
                        General Notes
                      </Label>
                      <Textarea
                        id="person-notes"
                        value={personForm.notes || ""}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            notes: e.target.value,
                          });
                        }}
                        placeholder="Enter general notes"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
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
                      console.log("Add Person button clicked", {
                        name: personForm.name,
                        role: personForm.role,
                        selectedCampusId,
                        isPending: createPerson.isPending,
                      });
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
                    className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createPerson.isPending ? "Adding..." : "Add Person"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Person Dialog */}
          <Dialog
            open={isEditPersonDialogOpen}
            onOpenChange={open => {
              setIsEditPersonDialogOpen(open);
              if (!open) {
                setHouseholdInputValue("");
                setHouseholdDropdownOpen(false);
              }
            }}
          >
            <DialogContent
              aria-describedby={undefined}
              className="max-w-2xl max-h-[85vh] overflow-y-auto"
            >
              <DialogHeader>
                <DialogTitle>Edit Person</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Basic Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-person-name">Name *</Label>
                      <Input
                        id="edit-person-name"
                        list="edit-person-name-suggestions"
                        value={personForm.name}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            name: e.target.value,
                          });
                          // Clear household name error when name changes (but don't auto-update household label)
                          setHouseholdNameError(null);
                        }}
                        spellCheck={true}
                        autoComplete="name"
                        placeholder="Enter name"
                      />
                      <datalist id="edit-person-name-suggestions">
                        {nameSuggestions.map((name, idx) => (
                          <option key={idx} value={name} />
                        ))}
                      </datalist>
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
                          <SelectItem value="director">Going</SelectItem>
                          <SelectItem value="staff">Maybe</SelectItem>
                          <SelectItem value="co-director">Not Going</SelectItem>
                          <SelectItem value="not-invited">
                            Not Invited Yet
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Family & Guests (optional) */}
                <div className="space-y-4 mt-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Family & Guests (optional)
                    </h3>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
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
                        />
                        <Label
                          htmlFor="edit-person-spouse-attending"
                          className="cursor-pointer"
                        >
                          Spouse attending
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="edit-person-children-count">
                        Children attending (0-10)
                      </Label>
                      <Input
                        id="edit-person-children-count"
                        type="number"
                        min="0"
                        max="10"
                        value={personForm.childrenCount}
                        onChange={e => {
                          const count = Math.max(
                            0,
                            Math.min(10, parseInt(e.target.value) || 0)
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
                        className="w-24"
                      />
                    </div>
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="edit-person-guests-count">
                        Guests attending (0-10)
                      </Label>
                      <Input
                        id="edit-person-guests-count"
                        type="number"
                        min="0"
                        max="10"
                        value={personForm.guestsCount}
                        onChange={e => {
                          const count = Math.max(
                            0,
                            Math.min(10, parseInt(e.target.value) || 0)
                          );
                          setPersonForm({ ...personForm, guestsCount: count });
                        }}
                        placeholder="0"
                        className="w-24"
                      />
                    </div>
                  </div>

                  {/* Household Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-person-household">
                      Household (optional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="edit-person-household"
                        value={householdInputValue}
                        onChange={e => {
                          const value = e.target.value;
                          setHouseholdInputValue(value);
                          setHouseholdSearchQuery(value);
                          setHouseholdDropdownOpen(true);
                          setHouseholdValidationError(null);
                          setHouseholdNameError(null);
                        }}
                        onFocus={() => {
                          setHouseholdDropdownOpen(true);
                          // Set input value to current household label if one is selected
                          if (
                            personForm.householdId &&
                            allHouseholds &&
                            allPeople
                          ) {
                            const household = allHouseholds.find(
                              h => h.id === personForm.householdId
                            );
                            if (household) {
                              const members = allPeople.filter(
                                p => p.householdId === household.id
                              );
                              const displayName =
                                household.label ||
                                (members.length > 0
                                  ? `${members[0].name.split(" ").pop() || "Household"} Household`
                                  : "Household");
                              setHouseholdInputValue(displayName);
                            }
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => {
                            setHouseholdDropdownOpen(false);
                            handleHouseholdInputBlur();
                          }, 200);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleHouseholdInputBlur();
                            householdInputRef.current?.blur();
                          } else if (e.key === "Escape") {
                            setHouseholdDropdownOpen(false);
                            setHouseholdInputValue("");
                            setPersonForm({ ...personForm, householdId: null });
                          }
                        }}
                        placeholder="Type or select household"
                      />
                      {householdDropdownOpen && allHouseholds && allPeople && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
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

                  {/* Household Errors */}
                  {(householdNameError || hasHouseholdValidationError) && (
                    <div className="mt-2 space-y-1">
                      {householdNameError && (
                        <div className="text-xs text-red-600">
                          {householdNameError}
                        </div>
                      )}
                      {hasHouseholdValidationError && (
                        <div className="text-xs text-red-600">
                          To avoid double-counting, link or create a household
                          for spouse/children.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="space-y-4 mt-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Additional Information
                    </h3>
                  </div>

                  {/* Request Type & Amount Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-40">
                      <Label htmlFor="edit-person-need">Request</Label>
                      <Select
                        value={personForm.needType}
                        onValueChange={value =>
                          setPersonForm({
                            ...personForm,
                            needType: value as
                              | "None"
                              | "Financial"
                              | "Transportation"
                              | "Housing"
                              | "Other",
                            needAmount: "",
                            needDetails: "",
                          })
                        }
                      >
                        <SelectTrigger id="edit-person-need">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Financial">Financial</SelectItem>
                          <SelectItem value="Transportation">
                            Transportation
                          </SelectItem>
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {personForm.needType === "Financial" && (
                        <motion.div
                          key="amount"
                          initial={{ opacity: 0, x: -30, width: 0 }}
                          animate={{ opacity: 1, x: 0, width: "auto" }}
                          exit={{ opacity: 0, x: -30, width: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-2"
                          layout
                        >
                          <Label htmlFor="edit-person-need-amount">
                            Amount ($)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              $
                            </span>
                            <Input
                              id="edit-person-need-amount"
                              type="number"
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {personForm.needType !== "None" ? (
                          <motion.div
                            key="need-met"
                            initial={{ opacity: 0, x: -30, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "auto" }}
                            exit={{ opacity: 0, x: -30, width: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex items-center gap-2"
                            layout
                          >
                            <Label
                              htmlFor="edit-person-needs-met"
                              className="cursor-pointer"
                            >
                              Request Met
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
                          </motion.div>
                        ) : (
                          <motion.div
                            key="deposit-paid"
                            initial={{ opacity: 0, x: -30, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "auto" }}
                            exit={{ opacity: 0, x: -30, width: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex items-center gap-2"
                            layout
                          >
                            <Label
                              htmlFor="edit-person-deposit-paid"
                              className="cursor-pointer"
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Request Notes and General Notes Section - Side by side */}
                <div className="space-y-4 mt-4 grid grid-cols-2 gap-4">
                  {/* Request Notes Section */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Request Notes
                      </h3>
                    </div>
                    <div className="space-y-2">
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
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* General Notes Section */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="text-sm font-semibold text-slate-700">
                        General Notes
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        id="edit-person-notes"
                        value={personForm.notes || ""}
                        onChange={e => {
                          setPersonForm({
                            ...personForm,
                            notes: e.target.value,
                          });
                        }}
                        placeholder="Enter general notes"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeletePerson}
                    disabled={deletePerson.isPending}
                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed -ml-2"
                    title="Delete person"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {editingPerson && editingPerson.person.statusLastUpdated && (
                    <div className="text-xs text-slate-500">
                      Last edited on{" "}
                      {new Date(
                        editingPerson.person.statusLastUpdated
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone:
                          Intl.DateTimeFormat().resolvedOptions().timeZone,
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditPersonDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleUpdatePerson}>
                    Update Person
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

          {/* Add Campus Dialog */}
          <Dialog
            open={isCampusDialogOpen}
            onOpenChange={setIsCampusDialogOpen}
          >
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add New Campus</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="campus-name">Campus Name</Label>
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
                    placeholder="Enter campus name"
                    spellCheck={true}
                    autoComplete="organization"
                    autoFocus
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
                  {createCampus.isPending ? "Adding..." : "Add Campus"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                    list="edit-campus-name-suggestions"
                    value={campusForm.name}
                    onChange={e => setCampusForm({ name: e.target.value })}
                    placeholder="Enter campus name"
                    spellCheck={true}
                    autoComplete="organization"
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
                  onClick={handleUpdateCampus}
                  disabled={
                    !campusForm.name.trim() || updateCampusName.isPending
                  }
                >
                  {updateCampusName.isPending ? "Updating..." : "Update Campus"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
