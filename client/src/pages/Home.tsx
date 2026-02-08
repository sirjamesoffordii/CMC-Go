import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import "@/styles/mobile.css";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { PeoplePanel } from "@/components/PeoplePanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { ViewModeSelector } from "@/components/ViewModeSelector";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Person } from "../../../drizzle/schema";
import {
  Calendar,
  Pencil,
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Check,
  Menu,
  LogIn,
  LogOut,
  Shield,
  Search,
  X,
  Upload,
  MapPin,
} from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { HeaderEditorModal } from "@/components/HeaderEditorModal";
import { ShareModal } from "@/components/ShareModal";
import { ImportModal } from "@/components/ImportModal";
import { NationalPanel } from "@/components/NationalPanel";
import { LoginModal } from "@/components/LoginModal";
import { ScopeSelector, useScopeFilter } from "@/components/ScopeSelector";
import { useLocation } from "wouter";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ViewState,
  initializeViewStateFromURL,
  updateURLWithViewState,
  DEFAULT_VIEW_STATE,
} from "@/types/viewModes";
import { DISTRICT_REGION_MAP } from "@/lib/regions";
import { District } from "../../../drizzle/schema";
import { isDistrictInScope, isCampusInScope } from "@/lib/scopeCheck";

/**
 * DISTRICT_REGION_MAP: Temporary fallback for districts not yet in database
 *
 * This mapping provides region assignments for districts that exist in the map SVG
 * but haven't been seeded into the database yet. Used in two places:
 *
 * 1. selectedDistrict useMemo: Creates synthetic district objects with region from map
 * 2. ViewState region extraction: Falls back to map when district.region is missing
 *
 * TODO: Remove once all districts are properly seeded with region assignments.
 * Safety: All usages include fallback to "Unknown" or null to prevent crashes.
 */

/**
 * Extracts region for ViewState: database first, then DISTRICT_REGION_MAP fallback.
 * Returns null if not found (ViewState allows null regionId).
 */
function extractRegionForViewState(
  districtId: string | null,
  districts: District[]
): string | null {
  if (!districtId) return null;

  const district = districts.find(d => d.id === districtId);
  if (district?.region) {
    return district.region;
  }

  // Fallback to map for districts not yet in database
  return DISTRICT_REGION_MAP[districtId] || null;
}

/**
 * Creates synthetic district for districts not yet in database.
 * Special case: "XAN" → region "NATIONAL". Others use DISTRICT_REGION_MAP fallback.
 * Returns existing district if found in database, or null if districtId is null.
 */
function createSyntheticDistrict(
  districtId: string | null,
  districts: District[]
): District | null {
  if (!districtId) return null;

  const found = districts.find(d => d.id === districtId);
  if (found) return found;

  // Special case: XAN (Chi Alpha National)
  if (districtId === "XAN") {
    return {
      id: "XAN",
      name: "Chi Alpha National",
      region: "NATIONAL",
      leftNeighbor: null,
      rightNeighbor: null,
    } as District;
  }

  // Create synthetic district: extract name from ID, get region from fallback map
  const name = districtId
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^./, str => str.toUpperCase());

  const region = DISTRICT_REGION_MAP[districtId] || "Unknown";

  return {
    id: districtId,
    name: name,
    region: region,
    leftNeighbor: null,
    rightNeighbor: null,
  } as District;
}
export default function Home() {
  // PR 2: Real authentication
  const { user, logout } = usePublicAuth();
  const isAuthenticated = !!user;
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  // Scope filter for map filtering (only visible when authenticated)
  const {
    currentScope,
    selectedRegion,
    selectedDistrict: scopeSelectedDistrict,
    setScopeFilter,
  } = useScopeFilter();

  // View mode state - initialize from URL or defaults
  // Default: district-scoped view (as per requirements)
  const getViewStateInitial = (): ViewState => {
    const urlState = initializeViewStateFromURL();
    // If URL has view state, use it; otherwise default to district mode
    if (urlState.districtId || urlState.regionId || urlState.campusId) {
      return urlState;
    }
    return DEFAULT_VIEW_STATE;
  };
  const [viewState, setViewState] = useState<ViewState>(getViewStateInitial());

  // Legacy selectedDistrictId for backward compatibility
  // Sync with viewState.districtId
  const getSelectedDistrictIdInitial = (): string | null => {
    const urlState = initializeViewStateFromURL();
    return urlState.districtId || null;
  };
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    getSelectedDistrictIdInitial()
  );

  const [nationalPanelOpen, setNationalPanelOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [peoplePanelOpen, setPeoplePanelOpen] = useState(false);
  const [districtPanelWidth, setDistrictPanelWidth] = useState(50); // percentage
  const [peoplePanelWidth, setPeoplePanelWidth] = useState(40); // percentage
  const [isResizingDistrict, setIsResizingDistrict] = useState(false);
  const [isResizingPeople, setIsResizingPeople] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerBgColor, setHeaderBgColor] = useState<string>("#1a1a1a");
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState<string>("");
  const [headerEditorOpen, setHeaderEditorOpen] = useState(false);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(56); // pixels - matches Chi Alpha toolbar
  const [isResizingHeader, setIsResizingHeader] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Never allow the People panel to open when logged out.
  useEffect(() => {
    if (!isAuthenticated && peoplePanelOpen) {
      setPeoplePanelOpen(false);
    }
  }, [isAuthenticated, peoplePanelOpen]);

  // Fetch data (protected): only when authenticated
  const districtsQuery = trpc.districts.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const campusesQuery = trpc.campuses.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Check if selected district/campus is in scope (before fetching people)
  const isSelectedDistrictInScope = useMemo(() => {
    if (!selectedDistrictId) return true; // No selection = in scope
    const selectedDistrict =
      districtsQuery.data?.find(d => d.id === selectedDistrictId) ||
      createSyntheticDistrict(selectedDistrictId, districtsQuery.data || []);
    if (!selectedDistrict) return true; // District not found = assume in scope
    return isDistrictInScope(
      selectedDistrictId,
      user,
      selectedDistrict.region || null
    );
  }, [selectedDistrictId, districtsQuery.data, user]);

  const isSelectedCampusInScope = useMemo(() => {
    if (!viewState.campusId) return true; // No campus selected = in scope
    const campus = campusesQuery.data?.find(c => c.id === viewState.campusId);
    if (!campus) return true; // Campus not found = assume in scope
    const district =
      districtsQuery.data?.find(d => d.id === campus.districtId) ||
      createSyntheticDistrict(campus.districtId, districtsQuery.data || []);
    return isCampusInScope(
      viewState.campusId,
      campus.districtId,
      user,
      district?.region || null
    );
  }, [viewState.campusId, campusesQuery.data, districtsQuery.data, user]);

  // Only fetch people when authenticated AND selected district/campus is in scope
  const shouldFetchPeople =
    isAuthenticated && isSelectedDistrictInScope && isSelectedCampusInScope;
  const peopleQuery = trpc.people.list.useQuery(undefined, {
    enabled: shouldFetchPeople,
    retry: false, // Don't retry on auth errors
  });

  const districts = districtsQuery.data || [];
  const allCampuses = campusesQuery.data || [];
  const allPeople = peopleQuery.data || [];

  const { data: metrics } = trpc.metrics.get.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false, // Don't retry on auth errors
  });

  // Fetch saved header image URL (fresh presigned URL generated on each request)
  const { data: savedHeaderImage } = trpc.settings.getHeaderImageUrl.useQuery();
  const { data: savedBgColor } = trpc.settings.get.useQuery({
    key: "headerBgColor",
  });
  const { data: savedHeaderHeight } = trpc.settings.get.useQuery({
    key: "headerHeight",
  });
  const { data: savedHeaderLogo } = trpc.settings.get.useQuery({
    key: "headerLogoUrl",
  });
  const { data: savedHeaderText } = trpc.settings.get.useQuery({
    key: "headerText",
  });

  // Upload header image mutation
  const uploadHeaderImage = trpc.settings.uploadHeaderImage.useMutation({
    onSuccess: data => {
      setHeaderImageUrl(data.url);
      if (data.backgroundColor) {
        setHeaderBgColor(data.backgroundColor);
      }
      utils.settings.getHeaderImageUrl.invalidate();
      utils.settings.get.invalidate({ key: "headerBgColor" });
    },
  });

  // Handle crop complete
  const handleCropComplete = (
    croppedImageBlob: Blob,
    croppedImageUrl: string,
    backgroundColor: string
  ) => {
    // Show preview immediately
    setHeaderImageUrl(croppedImageUrl);
    setHeaderBgColor(backgroundColor);
    setCropModalOpen(false);

    console.log(
      "[handleCropComplete] Starting upload, blob size:",
      croppedImageBlob.size
    );

    // Convert blob to base64 and upload to S3
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      console.log(
        "[handleCropComplete] Base64 data length:",
        base64Data.length
      );

      const fileName = selectedFileName || `header-${Date.now()}.jpg`;
      console.log("[handleCropComplete] Uploading with fileName:", fileName);

      uploadHeaderImage.mutate(
        {
          imageData: base64Data,
          fileName: fileName,
          backgroundColor: backgroundColor,
        },
        {
          onSuccess: data => {
            console.log("[handleCropComplete] Upload successful:", data.url);
          },
          onError: error => {
            console.error("[handleCropComplete] Upload failed:", error);
          },
        }
      );
    };
    reader.onerror = error => {
      console.error("[handleCropComplete] FileReader error:", error);
    };
    reader.readAsDataURL(croppedImageBlob);
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    setCropModalOpen(false);
    setSelectedImageSrc("");
    setSelectedFileName("");
  };

  // Update settings mutation for logo and bg color
  const updateSetting = trpc.settings.set.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      // Upload logo using the same pattern as header image
      uploadHeaderImage.mutate(
        {
          imageData: base64Data,
          fileName: `logo-${Date.now()}-${file.name}`,
          backgroundColor: "",
        },
        {
          onSuccess: data => {
            setHeaderLogoUrl(data.url);
            // Save logo URL to settings
            updateSetting.mutate({ key: "headerLogoUrl", value: data.url });
          },
        }
      );
    };
    reader.readAsDataURL(file);
  };

  // Handle background color change
  const handleBgColorChange = (color: string) => {
    setHeaderBgColor(color);
    updateSetting.mutate({ key: "headerBgColor", value: color });
  };

  // Set header image from database on load (fresh presigned URL)
  useEffect(() => {
    console.log(
      "[Header] savedHeaderImage raw:",
      JSON.stringify(savedHeaderImage)
    );
    if (savedHeaderImage && savedHeaderImage.url) {
      console.log("[Header] Setting header image URL:", savedHeaderImage.url);
      setHeaderImageUrl(savedHeaderImage.url);
    }
  }, [savedHeaderImage]);

  // Set background color from database on load
  useEffect(() => {
    console.log("[Header] savedBgColor raw:", JSON.stringify(savedBgColor));
    if (savedBgColor && savedBgColor.value) {
      console.log("[Header] Setting bg color:", savedBgColor.value);
      setHeaderBgColor(savedBgColor.value);
    }
  }, [savedBgColor]);

  // Set header height from database on load
  useEffect(() => {
    if (savedHeaderHeight && savedHeaderHeight.value) {
      setHeaderHeight(parseInt(savedHeaderHeight.value, 10));
    }
  }, [savedHeaderHeight]);

  // Clear "National Director" from saved header text if it exists (legacy default)
  useEffect(() => {
    if (savedHeaderText?.value === "National Director") {
      setHeaderText("");
      updateSetting.mutate({ key: "headerText", value: "" });
    }
  }, [savedHeaderText]);

  // Header resize handlers
  const handleHeaderResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHeader(true);
  };

  useEffect(() => {
    if (!isResizingHeader) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(60, Math.min(300, e.clientY));
      setHeaderHeight(newHeight);
    };

    const handleMouseUp = async () => {
      setIsResizingHeader(false);
      // Save to database
      try {
        // Note: This is a placeholder fetch - actual saving is done via tRPC mutations
        // Keeping this for reference but it doesn't need to use configurable URL
        await fetch(
          "/api/trpc/settings.get?batch=1&input=" +
            encodeURIComponent(
              JSON.stringify({ "0": { key: "headerHeight" } })
            ),
          {
            method: "GET",
          }
        );
        // Use a simple approach - just save via the mutation pattern
      } catch (_e) {
        console.error("Failed to save header height");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingHeader, headerHeight]);

  // Mutations
  const updateStatus = trpc.people.updateStatus.useMutation({
    onMutate: async ({ personId, status }) => {
      await utils.people.list.cancel();
      const previousPeople = utils.people.list.getData();

      utils.people.list.setData(undefined, old => {
        if (!old) return old;
        return old.map(p =>
          p.personId === personId
            ? { ...p, status, statusLastUpdated: new Date() }
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
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
      utils.metrics.district.invalidate();
      utils.followUp.list.invalidate();
    },
  });

  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
      utils.metrics.allDistricts.invalidate();
      utils.metrics.allRegions.invalidate();
    },
  });

  // ViewMode filtering: Scoped data based on selectedDistrictId
  //
  // These useMemos filter data to the currently selected district scope.
  // The selectedDistrict may be from the database or a synthetic object created
  // via DISTRICT_REGION_MAP fallback for districts not yet seeded.
  const selectedDistrict = useMemo(() => {
    return createSyntheticDistrict(selectedDistrictId, districts);
  }, [districts, selectedDistrictId]);

  // Filter campuses and people to the selected district scope
  const selectedDistrictCampuses = useMemo(
    () => allCampuses.filter(c => c.districtId === selectedDistrictId),
    [allCampuses, selectedDistrictId]
  );

  const selectedDistrictPeople = useMemo(
    () => allPeople.filter(p => p.primaryDistrictId === selectedDistrictId),
    [allPeople, selectedDistrictId]
  );

  // Sync selectedDistrictId with viewState.districtId
  useEffect(() => {
    if (viewState.districtId !== selectedDistrictId) {
      setSelectedDistrictId(viewState.districtId);
    }
  }, [viewState.districtId, selectedDistrictId]);

  // Update URL when viewState changes
  useEffect(() => {
    updateURLWithViewState(viewState);
  }, [viewState]);

  const handleViewStateChange = (newViewState: ViewState) => {
    setViewState(newViewState);
    // Keep selectedDistrictId consistent with URL/view state
    if (newViewState.districtId !== selectedDistrictId) {
      setSelectedDistrictId(newViewState.districtId);
    }
  };

  // District selection: Updates selectedDistrictId and viewState.regionId
  // Only updates viewState if district exists in database (preserves original behavior).
  // Region is extracted from database district, with fallback to DISTRICT_REGION_MAP.
  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);

    const selectedDistrict = districts.find(d => d.id === districtId);
    if (selectedDistrict) {
      // Extract region: database first, then fallback map
      const regionId =
        selectedDistrict.region ||
        extractRegionForViewState(districtId, districts);
      const newViewState: ViewState = {
        mode: "district",
        districtId: districtId,
        regionId: regionId,
        campusId: null,
        panelOpen: true,
      };
      setViewState(newViewState);
    } else {
      // If district not in database, still update viewState but use fallback region
      const regionId = extractRegionForViewState(districtId, districts);
      const newViewState: ViewState = {
        mode: "district",
        districtId: districtId,
        regionId: regionId,
        campusId: null,
        panelOpen: true,
      };
      setViewState(newViewState);
    }
  };

  // Region selection: Sets ViewMode to "region", clears district/campus scope
  const handleRegionSelect = (regionId: string) => {
    const newViewState: ViewState = {
      ...viewState,
      mode: "region",
      regionId,
      districtId: null,
      campusId: null,
      panelOpen: false,
    };
    setViewState(newViewState);
    setSelectedDistrictId(null);
  };

  // Campus selection: Updates viewState with campus, district, and region
  // Region extracted from district (database or DISTRICT_REGION_MAP fallback)
  const handleCampusSelect = (campusId: number) => {
    const campus = allCampuses.find(c => c.id === campusId);
    if (campus && campus.districtId) {
      const regionId = extractRegionForViewState(campus.districtId, districts);
      const newViewState: ViewState = {
        ...viewState,
        mode: "campus",
        campusId,
        districtId: campus.districtId,
        regionId: regionId,
        panelOpen: true,
      };
      setViewState(newViewState);
      setSelectedDistrictId(campus.districtId);
    }
  };

  const handlePersonStatusChange = (
    personId: string,
    newStatus: "Yes" | "Maybe" | "No" | "Not Invited"
  ) => {
    updateStatus.mutate({ personId, status: newStatus });
  };

  const handlePersonAdd = (campusId: number, name: string) => {
    const campus = allCampuses.find(c => c.id === campusId);
    if (!campus) return;

    // Generate a unique personId
    const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    createPerson.mutate({
      personId,
      name,
      primaryCampusId: campusId,
      primaryDistrictId: campus.districtId,
      status: "Not Invited",
    });
  };

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setPersonDialogOpen(true);
  };

  // After login/register, auto-open the user's district panel
  const handleAuthSuccess = (districtId: string | null) => {
    if (districtId) {
      handleDistrictSelect(districtId);
    }
  };

  // Keyboard shortcuts for district panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close panels and modals (in priority order: modals first, then panels)
      if (e.key === "Escape") {
        // Close modals first (they're typically on top)
        if (cropModalOpen) {
          setCropModalOpen(false);
          e.preventDefault();
          return;
        }
        if (headerEditorOpen) {
          setHeaderEditorOpen(false);
          e.preventDefault();
          return;
        }
        // Close search
        if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery("");
          e.preventDefault();
          return;
        }
        // Close all hamburger menu related modals and menu
        if (shareModalOpen || loginModalOpen || importModalOpen || menuOpen) {
          if (shareModalOpen) setShareModalOpen(false);
          if (loginModalOpen) setLoginModalOpen(false);
          if (importModalOpen) setImportModalOpen(false);
          if (menuOpen) setMenuOpen(false);
          e.preventDefault();
          return;
        }
        if (personDialogOpen) {
          setPersonDialogOpen(false);
          e.preventDefault();
          return;
        }

        // Close panels
        if (nationalPanelOpen) {
          setNationalPanelOpen(false);
          e.preventDefault();
          return;
        }
        if (peoplePanelOpen) {
          setPeoplePanelOpen(false);
          e.preventDefault();
          return;
        }
        if (selectedDistrictId) {
          // Clear both selectedDistrictId and viewState to prevent reopening
          setSelectedDistrictId(null);
          setViewState(prev => ({
            ...prev,
            districtId: null,
            campusId: null,
            panelOpen: false,
          }));
          e.preventDefault();
          return;
        }
      }

      // Arrow keys to navigate between geographically adjacent districts (only when district panel is open)
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        selectedDistrictId
      ) {
        e.preventDefault();
        const currentDistrict = districts.find(
          d => d.id === selectedDistrictId
        );
        if (!currentDistrict) return;

        // Use geographic adjacency (leftNeighbor/rightNeighbor)
        const nextDistrictId =
          e.key === "ArrowLeft"
            ? currentDistrict.leftNeighbor
            : currentDistrict.rightNeighbor;

        if (nextDistrictId) {
          setSelectedDistrictId(nextDistrictId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedDistrictId,
    peoplePanelOpen,
    nationalPanelOpen,
    personDialogOpen,
    headerEditorOpen,
    shareModalOpen,
    cropModalOpen,
    loginModalOpen,
    importModalOpen,
    searchOpen,
    menuOpen,
    districts,
    setViewState,
  ]);

  // Handle district panel resize
  const handleDistrictMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingDistrict(true);
  };

  // Handle people panel resize
  const handlePeopleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPeople(true);
  };

  // Mouse move handler for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingDistrict) {
        const newWidth = (e.clientX / window.innerWidth) * 100;
        setDistrictPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // 20-80%
      }
      if (isResizingPeople) {
        const newWidth =
          ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setPeoplePanelWidth(Math.min(Math.max(newWidth, 20), 80)); // 20-80%
      }
    };

    const handleMouseUp = () => {
      setIsResizingDistrict(false);
      setIsResizingPeople(false);
    };

    if (isResizingDistrict || isResizingPeople) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingDistrict, isResizingPeople]);

  // Diagnostic: Log if queries are failing
  if (districtsQuery.isError || campusesQuery.isError || peopleQuery.isError) {
    console.error("[Home] Query errors:", {
      districts: districtsQuery.error,
      campuses: campusesQuery.error,
      people: peopleQuery.error,
    });
  }

  // Safety check: ensure component always returns something
  if (!districtsQuery && !campusesQuery && !peopleQuery) {
    console.warn("[Home] Queries not initialized yet");
  }

  // Debug: Log data when it loads
  useEffect(() => {
    if (districtsQuery.data) {
      console.log(
        "[Home] Districts loaded:",
        districtsQuery.data.length,
        districtsQuery.data.slice(0, 5).map(d => d.id)
      );
    }
    if (peopleQuery.data) {
      console.log("[Home] People loaded:", peopleQuery.data.length);
      const peopleWithDistricts = peopleQuery.data.filter(
        p => p.primaryDistrictId
      );
      console.log("[Home] People with districts:", peopleWithDistricts.length);
      if (peopleWithDistricts.length > 0) {
        const districtCounts = peopleWithDistricts.reduce(
          (acc, p) => {
            acc[p.primaryDistrictId!] = (acc[p.primaryDistrictId!] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
        console.log(
          "[Home] People by district (top 5):",
          Object.entries(districtCounts).slice(0, 5)
        );
      }
    }
    if (campusesQuery.data) {
      console.log("[Home] Campuses loaded:", campusesQuery.data.length);
    }
  }, [districtsQuery.data, peopleQuery.data, campusesQuery.data]);

  return (
    <div className="min-h-screen bg-slate-50 paper-texture">
      {/* Header - Chi Alpha Toolbar Style */}
      <div
        className="relative z-50 flex items-center px-2 sm:px-4 group flex-shrink-0"
        style={{
          height: isMobile ? "48px" : `${headerHeight}px`,
          minHeight: isMobile ? "48px" : "52px",
          backgroundColor: headerBgColor || savedBgColor?.value || "#1f1f1f",
        }}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Logo - Left Side */}
        <div
          className="flex-shrink-0 h-10 sm:h-12 w-auto mr-2 sm:mr-4 relative z-10 flex items-center gap-2"
          style={{ marginLeft: isMobile ? "4px" : "12px" }}
        >
          {headerLogoUrl || savedHeaderLogo?.value ? (
            <img
              src={headerLogoUrl || savedHeaderLogo?.value || undefined}
              alt="Logo"
              className="h-full w-auto object-contain"
            />
          ) : (
            <>
              <div
                className="h-9 w-9 rounded-full bg-black border-2 border-white flex flex-col items-center justify-center text-white font-bold text-xs"
                style={{
                  opacity: 0,
                  animation:
                    "roll-in 4.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s forwards",
                }}
              >
                <span>CMC</span>
                <span className="text-[10px] leading-none">Go</span>
              </div>
            </>
          )}
        </div>

        {/* Header Text / Scrolling Banner - Figma style */}
        <div className="flex-grow relative z-10 overflow-hidden">
          {headerText || savedHeaderText?.value ? (
            <div
              className="text-white/95 tracking-normal"
              style={{
                fontSize: "24px",
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
              dangerouslySetInnerHTML={{
                __html: headerText || savedHeaderText?.value || "",
              }}
            />
          ) : (
            <div
              className="whitespace-nowrap text-white/70 font-medium hidden sm:block"
              style={{
                fontSize: "14px",
                animation: "scroll-banner-text 40s linear forwards",
                letterSpacing: "0.01em",
              }}
            >
              "We're Going Together"
            </div>
          )}
        </div>

        {/* Calendar Widget - CMC Date (desktop only) */}
        {!isMobile && (
          <div className="flex-shrink-0 mr-2 z-10">
            <div
              className="relative bg-black rounded-md border border-white shadow-sm overflow-hidden"
              style={{ width: "32px", height: "32px" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 flex justify-center gap-0.5 pt-0.5">
                <div className="w-0.5 h-0.5 rounded-full bg-white"></div>
                <div className="w-0.5 h-0.5 rounded-full bg-white"></div>
              </div>
              <div className="flex flex-col items-center justify-center h-full pt-1.5">
                <span className="text-[7px] font-semibold text-white uppercase leading-tight">
                  July
                </span>
                <span className="text-sm font-bold text-white leading-none">
                  6
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Edit Header Button - Positioned absolutely in top left corner */}
        <button
          onClick={() => setHeaderEditorOpen(true)}
          className={`absolute top-1 left-1 flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 ${isHeaderHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>

        {/* Editing badge - mobile only, compact */}
        {user && isMobile && (
          <div className="flex-shrink-0 mr-1 z-10 text-white/90 text-sm max-w-[140px] sm:max-w-none">
            <span
              className="editing-badge-mobile inline-block px-2 py-1.5 bg-white/20 rounded-md text-xs font-medium truncate max-w-full"
              title={user.districtName || user.campusName || user.role}
            >
              {user.districtName || user.campusName || user.role}
            </span>
          </div>
        )}

        {/* Right Side: Scope Selector, Why button, and Hamburger Menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10 ml-auto">
          {/* Scope selector - visible when authenticated, compact on mobile */}
          {isAuthenticated && (
            <ScopeSelector
              currentScope={currentScope}
              selectedRegion={selectedRegion}
              selectedDistrict={scopeSelectedDistrict}
              onScopeChange={setScopeFilter}
              className="bg-white/10 border-white/20 text-white [&>span]:text-white text-xs sm:text-sm"
            />
          )}

          {/* Why Personal Invitations Matter Button - desktop only (kept near scope selector) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.preventDefault();
              setLocation("/why-invitations-matter");
            }}
            className="hidden sm:flex text-white/80 hover:text-white hover:bg-red-700"
          >
            <span className="text-sm font-semibold tracking-wide">
              Why Personal Invitations Matter
            </span>
          </Button>

          {/* Search Icon - Figma style */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Search Dropdown */}
            {searchOpen && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[101] p-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search people, campuses, districts..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-300 rounded text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchQuery && (
                    <div className="max-h-80 overflow-y-auto">
                      {(() => {
                        const query = searchQuery.toLowerCase();
                        const matchedPeople = allPeople
                          .filter(
                            p =>
                              p.name.toLowerCase().includes(query) ||
                              p.primaryRole?.toLowerCase().includes(query)
                          )
                          .slice(0, 5);
                        const matchedCampuses = allCampuses
                          .filter(c => c.name?.toLowerCase().includes(query))
                          .slice(0, 3);
                        const matchedDistricts = districts
                          .filter(
                            d =>
                              d.id.toLowerCase().includes(query) ||
                              d.name?.toLowerCase().includes(query) ||
                              d.region?.toLowerCase().includes(query)
                          )
                          .slice(0, 3);

                        const hasResults =
                          matchedPeople.length > 0 ||
                          matchedCampuses.length > 0 ||
                          matchedDistricts.length > 0;

                        if (!hasResults) {
                          return (
                            <div className="p-3 text-gray-500 text-sm">
                              No results found
                            </div>
                          );
                        }

                        return (
                          <>
                            {matchedPeople.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                  People
                                </div>
                                {matchedPeople.map(person => (
                                  <button
                                    key={person.personId}
                                    onClick={() => {
                                      setSelectedPerson(person);
                                      setPersonDialogOpen(true);
                                      setSearchOpen(false);
                                      setSearchQuery("");
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        person.status === "Yes"
                                          ? "bg-green-500"
                                          : person.status === "Maybe"
                                            ? "bg-yellow-500"
                                            : person.status === "No"
                                              ? "bg-red-500"
                                              : "bg-gray-300"
                                      }`}
                                    />
                                    <span className="text-sm text-gray-900">
                                      {person.name}
                                    </span>
                                    {person.primaryRole && (
                                      <span className="text-xs text-gray-500">
                                        {person.primaryRole}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {matchedCampuses.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                  Campuses
                                </div>
                                {matchedCampuses.map(campus => (
                                  <button
                                    key={campus.id}
                                    onClick={() => {
                                      if (campus.districtId) {
                                        handleDistrictSelect(campus.districtId);
                                      }
                                      setSearchOpen(false);
                                      setSearchQuery("");
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100"
                                  >
                                    <span className="text-sm text-gray-900">
                                      {campus.name}
                                    </span>
                                    {campus.districtId && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        in {campus.districtId}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {matchedDistricts.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                  Districts
                                </div>
                                {matchedDistricts.map(district => (
                                  <button
                                    key={district.id}
                                    onClick={() => {
                                      handleDistrictSelect(district.id);
                                      setSearchOpen(false);
                                      setSearchQuery("");
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100"
                                  >
                                    <span className="text-sm text-gray-900">
                                      {district.name || district.id}
                                    </span>
                                    {district.region && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        {district.region}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Hamburger Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/80 hover:text-white hover:bg-red-700"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="mobile-menu-dropdown absolute right-0 top-full mt-2 w-56 sm:w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101] py-1 max-h-[80vh] overflow-y-auto">
                  {!isAuthenticated && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setLoginModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 font-semibold transition-colors"
                      >
                        <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                        Login
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                    </>
                  )}

                  {/* Why Personal Invitations Matter - Mobile only */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setLocation("/why-invitations-matter");
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 sm:hidden text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                    Why Invitations Matter
                  </button>

                  {/* Import - Figma menu item */}
                  {isAuthenticated && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setImportModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                    >
                      <Upload className="w-5 h-5 sm:w-4 sm:h-4" />
                      Import
                    </button>
                  )}

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShareModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                  >
                    <Share2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    Share
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setLocation("/more-info");
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="w-5 h-5 sm:w-4 sm:h-4" />
                    More Info
                  </button>

                  {user?.role === "CMC_GO_ADMIN" && (
                    <button
                      onClick={e => {
                        e.preventDefault();
                        setLocation("/admin");
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                    >
                      <Shield className="w-5 h-5 sm:w-4 sm:h-4" />
                      Admin Console
                    </button>
                  )}

                  {isAuthenticated && (
                    <>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await logout();
                          setMenuOpen(false);
                          setLoginModalOpen(true);
                        }}
                        className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <LogOut className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5" />
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">Logout</span>
                            {user?.email && (
                              <span className="text-xs text-gray-500">
                                {user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area Below Header */}
      <div
        className="flex main-content-area md:flex-row flex-col"
        style={{
          height: isMobile
            ? "calc(100vh - 48px)"
            : `calc(100vh - ${headerHeight}px)`,
        }}
      >
        {/* Left District/National Panel - Desktop */}
        {!isMobile && (
          <div
            className={[
              "bg-white border-r border-gray-300 flex-shrink-0 relative",
              !isResizingDistrict
                ? "transition-all duration-300 ease-in-out"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              width:
                selectedDistrictId || nationalPanelOpen
                  ? `${districtPanelWidth}%`
                  : "0%",
              height: "100%",
              overflow:
                selectedDistrictId || nationalPanelOpen ? "auto" : "hidden",
            }}
          >
            {(selectedDistrictId || nationalPanelOpen) && (
              <>
                {/* Resize Handle (desktop only) */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 bg-gray-200 transition-colors z-10"
                  onMouseDown={handleDistrictMouseDown}
                />
                <AnimatePresence mode="wait">
                  {selectedDistrictId && selectedDistrict && (
                    <DistrictPanel
                      key={selectedDistrict.id}
                      district={selectedDistrict}
                      campuses={selectedDistrictCampuses}
                      people={selectedDistrictPeople}
                      isOutOfScope={!isSelectedDistrictInScope}
                      onClose={() => {
                        setSelectedDistrictId(null);
                        setViewState({
                          ...viewState,
                          districtId: null,
                          regionId: null,
                          campusId: null,
                          panelOpen: false,
                        });
                      }}
                      onPersonStatusChange={handlePersonStatusChange}
                      onPersonAdd={handlePersonAdd}
                      onPersonClick={handlePersonClick}
                      onDistrictUpdate={() => {
                        utils.districts.list.invalidate();
                        utils.people.list.invalidate();
                      }}
                    />
                  )}
                </AnimatePresence>
                {nationalPanelOpen && (
                  <NationalPanel
                    onClose={() => setNationalPanelOpen(false)}
                    onPersonClick={handlePersonClick}
                    onPersonStatusChange={handlePersonStatusChange}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Left District/National Panel - Mobile (swipe-to-close drawer) */}
        {isMobile && (
          <MobileDrawer
            isOpen={!!(selectedDistrictId || nationalPanelOpen)}
            onClose={() => {
              setSelectedDistrictId(null);
              setNationalPanelOpen(false);
              setViewState({
                ...viewState,
                districtId: null,
                regionId: null,
                campusId: null,
                panelOpen: false,
              });
            }}
            title={
              nationalPanelOpen
                ? "National Team"
                : (selectedDistrict?.name ?? "District")
            }
            height="70vh"
          >
            {selectedDistrictId && selectedDistrict && (
              <DistrictPanel
                key={selectedDistrict.id}
                district={selectedDistrict}
                campuses={selectedDistrictCampuses}
                people={selectedDistrictPeople}
                isOutOfScope={!isSelectedDistrictInScope}
                onClose={() => {
                  setSelectedDistrictId(null);
                  setViewState({
                    ...viewState,
                    districtId: null,
                    regionId: null,
                    campusId: null,
                    panelOpen: false,
                  });
                }}
                onPersonStatusChange={handlePersonStatusChange}
                onPersonAdd={handlePersonAdd}
                onPersonClick={handlePersonClick}
                onDistrictUpdate={() => {
                  utils.districts.list.invalidate();
                  utils.people.list.invalidate();
                }}
              />
            )}
            {nationalPanelOpen && (
              <NationalPanel
                onClose={() => setNationalPanelOpen(false)}
                onPersonClick={handlePersonClick}
                onPersonStatusChange={handlePersonStatusChange}
              />
            )}
          </MobileDrawer>
        )}

        {/* Center Map Area - fills remaining space so map is full size */}
        <div
          className="flex-1 relative overflow-hidden map-container-mobile bg-white"
          style={{ minWidth: 0 }}
        >
          {/* Map wrapper - centers the map and gives it full height */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              padding: isMobile ? "0.25rem" : "1rem",
            }}
            onClick={e => {
              // Close panels if clicking on padding/empty space around map
              if (e.target === e.currentTarget) {
                setSelectedDistrictId(null);
                setPeoplePanelOpen(false);
                setViewState({
                  ...viewState,
                  districtId: null,
                  regionId: null,
                  campusId: null,
                  panelOpen: false,
                });
              }
            }}
          >
            <InteractiveMap
              districts={districts}
              selectedDistrictId={selectedDistrictId}
              onDistrictSelect={handleDistrictSelect}
              viewState={viewState}
              scopeFilter={currentScope}
              userRegionId={
                currentScope === "REGION" && selectedRegion
                  ? selectedRegion
                  : currentScope === "DISTRICT" && selectedRegion
                    ? selectedRegion
                    : user?.regionId || user?.overseeRegionId
              }
              userDistrictId={
                currentScope === "DISTRICT" && scopeSelectedDistrict
                  ? scopeSelectedDistrict
                  : user?.districtId
              }
              onBackgroundClick={() => {
                setSelectedDistrictId(null);
                setPeoplePanelOpen(false);
                setNationalPanelOpen(false);
                setViewState({
                  ...viewState,
                  districtId: null,
                  regionId: null,
                  campusId: null,
                  panelOpen: false,
                });
              }}
              onNationalClick={() => {
                // Deliverable 2: Treat XAN as a real district with full DistrictPanel parity.
                // Candidate for View Modes refactor: XAN hardcoded region "NATIONAL" may need
                // special handling in region-scoped views.
                setSelectedDistrictId("XAN");
                setNationalPanelOpen(false);
                setPeoplePanelOpen(false);
                setViewState({
                  mode: "district",
                  districtId: "XAN",
                  regionId: "NATIONAL",
                  campusId: null,
                  panelOpen: true,
                });
              }}
            />
          </div>
        </div>

        {/* Right People Panel - Desktop */}
        {!isMobile && (
          <div
            className={[
              "bg-white border-l border-gray-100 flex-shrink-0 relative flex flex-col",
              !isResizingPeople
                ? "transition-all duration-300 ease-in-out"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              width: peoplePanelOpen ? `${peoplePanelWidth}%` : "0%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {peoplePanelOpen && (
              <>
                {/* Resize Handle */}
                <div
                  className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-gray-400 bg-gray-200 transition-colors z-10"
                  onMouseDown={handlePeopleMouseDown}
                />
                <PeoplePanel onClose={() => setPeoplePanelOpen(false)} />
              </>
            )}
          </div>
        )}

        {/* Right People Panel - Mobile (swipe-to-close drawer) */}
        {isMobile && (
          <MobileDrawer
            isOpen={peoplePanelOpen}
            onClose={() => setPeoplePanelOpen(false)}
            title="Follow Ups"
            height="70vh"
          >
            <PeoplePanel onClose={() => setPeoplePanelOpen(false)} />
          </MobileDrawer>
        )}
      </div>

      {/* People Tab Button - Fixed to right side on desktop, bottom right on mobile */}
      {!peoplePanelOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            {isMobile ? (
              /* Mobile: FAB with safe area for notched devices */
              <button
                onClick={() => {
                  if (!user) {
                    setLoginModalOpen(true);
                    return;
                  }
                  setPeoplePanelOpen(true);
                }}
                className={`
                  mobile-fab-safe fixed bottom-4 right-4 z-30 bg-black hover:bg-red-700 active:bg-red-800 text-white px-5 py-3 rounded-full font-medium text-sm shadow-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center
                  ${!user ? "opacity-70" : ""}
                `}
              >
                <span className="whitespace-nowrap select-none">
                  Follow Ups
                </span>
              </button>
            ) : (
              /* Desktop: Slide-out tab on right edge */
              <div
                className="fixed top-1/2 -translate-y-1/2 z-30 group pr-16"
                style={{ right: 0 }}
              >
                <button
                  onClick={() => {
                    if (!user) {
                      setLoginModalOpen(true);
                      return;
                    }
                    setPeoplePanelOpen(true);
                  }}
                  className={`
                    relative bg-black hover:bg-red-700 text-white w-[200px] py-3.5 pl-5 pr-6 rounded-full font-medium text-sm backdrop-blur-sm transition-transform duration-600 ease-out touch-target translate-x-[92%] group-hover:translate-x-[86%] text-left
                    ${!user ? "opacity-70" : ""}
                  `}
                >
                  <span className="inline-block whitespace-nowrap select-none">
                    Follow Ups
                  </span>
                </button>
              </div>
            )}
          </TooltipTrigger>
          {!user && (
            <TooltipContent side="left">
              <p>Please log in to view table</p>
            </TooltipContent>
          )}
        </Tooltip>
      )}

      <PersonDetailsDialog
        person={selectedPerson}
        open={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
      />

      <ImageCropModal
        open={cropModalOpen}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

      <HeaderEditorModal
        open={headerEditorOpen}
        onClose={() => setHeaderEditorOpen(false)}
        logoUrl={headerLogoUrl || savedHeaderLogo?.value || null}
        headerText={(() => {
          const currentText = headerText || savedHeaderText?.value || "";
          // Clear "National Director" if it exists (legacy default)
          if (
            currentText === "National Director" ||
            currentText.trim() === "National Director"
          ) {
            return "";
          }
          return currentText;
        })()}
        backgroundColor={headerBgColor || savedBgColor?.value || "#000000"}
        onSave={async data => {
          // Save header text
          if (data.headerText) {
            setHeaderText(data.headerText);
            updateSetting.mutate({ key: "headerText", value: data.headerText });
          }

          // Save background color
          if (data.backgroundColor) {
            setHeaderBgColor(data.backgroundColor);
            updateSetting.mutate({
              key: "headerBgColor",
              value: data.backgroundColor,
            });
          }

          // Upload logo if provided
          if (data.logoFile) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              // Use the existing upload mutation for logo
              uploadHeaderImage.mutate(
                {
                  imageData: base64,
                  fileName: `logo-${data.logoFile!.name}`,
                },
                {
                  onSuccess: result => {
                    setHeaderLogoUrl(result.url);
                    updateSetting.mutate({
                      key: "headerLogoUrl",
                      value: result.url,
                    });
                  },
                }
              );
            };
            reader.readAsDataURL(data.logoFile);
          }
        }}
      />

      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onAuthSuccess={handleAuthSuccess}
        showClose
      />
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  );
}
