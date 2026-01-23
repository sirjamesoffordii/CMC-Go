import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import "@/styles/mobile.css";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { PeoplePanel } from "@/components/PeoplePanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { ViewModeSelector } from "@/components/ViewModeSelector";
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
  Upload,
  Menu,
  LogIn,
  Shield,
  ClipboardList,
} from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { HeaderEditorModal } from "@/components/HeaderEditorModal";
import { ShareModal } from "@/components/ShareModal";
import { ImportModal } from "@/components/ImportModal";
import { NationalPanel } from "@/components/NationalPanel";
import { LoginModal } from "@/components/LoginModal";
import { Breadcrumb } from "@/components/Breadcrumb";
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
import { District, Campus } from "../../../drizzle/schema";
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
  const { user } = usePublicAuth();
  const isAuthenticated = !!user;
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
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

  // Fetch saved header image, background color, height, and logo
  const { data: savedHeaderImage } = trpc.settings.get.useQuery({
    key: "headerImageUrl",
  });
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
      utils.settings.get.invalidate({ key: "headerImageUrl" });
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

  // Set header image from database on load
  useEffect(() => {
    console.log(
      "[Header] savedHeaderImage raw:",
      JSON.stringify(savedHeaderImage)
    );
    if (savedHeaderImage && savedHeaderImage.value) {
      console.log("[Header] Setting header image URL:", savedHeaderImage.value);
      setHeaderImageUrl(savedHeaderImage.value);
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
      } catch (e) {
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

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Re-read the URL and update view state
      const urlState = initializeViewStateFromURL();
      setViewState(urlState);
      setSelectedDistrictId(urlState.districtId);

      // Update panel states based on URL
      if (urlState.panelOpen && urlState.districtId) {
        // Panel should be open
        setPeoplePanelOpen(false);
        setNationalPanelOpen(false);
      } else {
        // No panel open
        setPeoplePanelOpen(false);
        setNationalPanelOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  // Keyboard shortcuts for district panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+F to open Follow-Up view (global shortcut)
      if (e.shiftKey && e.key === "F") {
        e.preventDefault();
        setLocation("/follow-up");
        return;
      }

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
        // Close all hamburger menu related modals and menu
        if (shareModalOpen || importModalOpen || loginModalOpen || menuOpen) {
          if (shareModalOpen) setShareModalOpen(false);
          if (importModalOpen) setImportModalOpen(false);
          if (loginModalOpen) setLoginModalOpen(false);
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
    importModalOpen,
    loginModalOpen,
    menuOpen,
    districts,
    setViewState,
    setLocation,
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

  // Calculate days until CMC - dynamic counter that updates
  const [daysUntilCMC, setDaysUntilCMC] = useState(() => {
    const cmcDate = new Date("2026-07-06");
    const today = new Date();
    return Math.abs(
      Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
  });

  // Update days until CMC counter periodically
  useEffect(() => {
    const updateDaysUntilCMC = () => {
      const cmcDate = new Date("2026-07-06");
      const today = new Date();
      const days = Math.abs(
        Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );
      setDaysUntilCMC(days);
    };

    // Update immediately and then every hour
    updateDaysUntilCMC();
    const interval = setInterval(updateDaysUntilCMC, 60 * 60 * 1000); // Update every hour

    return () => clearInterval(interval);
  }, []);

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
        className="relative flex items-center px-4 group flex-shrink-0"
        style={{
          height: `${headerHeight}px`,
          minHeight: "52px",
          backgroundColor: headerBgColor || savedBgColor?.value || "#1f1f1f",
        }}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Logo - Left Side */}
        <div
          className="flex-shrink-0 h-12 w-auto mr-4 relative z-10 flex items-center gap-2"
          style={{ marginLeft: "12px" }}
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

        {/* Banner Text - "Going Together" - Fades in towards end of CMC Go animation */}
        <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center overflow-hidden pointer-events-none z-0">
          <div
            className="whitespace-nowrap text-white absolute"
            style={{
              fontSize: "16px",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
              animation: "fade-in-text 1.2s ease-out 4.2s forwards",
              left: "calc(12px + 36px + 16px + 12px)", // Position after logo
              fontWeight: 400,
              opacity: 0,
            }}
          >
            Going Together
          </div>
        </div>

        {/* Edit Header Button - Positioned absolutely in top left corner */}
        <button
          onClick={() => setHeaderEditorOpen(true)}
          className={`absolute top-1 left-1 flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 ${isHeaderHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>

        {/* User info (authentication disabled) */}
        {user && (
          <div className="flex-shrink-0 mr-2 z-10 text-white/80 text-sm flex items-center gap-2 flex-wrap">
            <span>{user.fullName || user.email}</span>
            {/* PR 4: Editing badge - mobile only */}
            {isMobile && (
              <span className="px-2 py-1 bg-white/20 rounded text-xs whitespace-nowrap">
                Editing as: {user.districtName || user.campusName || user.role}
              </span>
            )}
          </div>
        )}

        {/* Right Side: Why Personal Invitations Matter Button and Hamburger Menu */}
        <div className="flex items-center gap-2 flex-shrink-0 z-10 ml-auto">
          {/* Why Personal Invitations Matter Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.preventDefault();
              setLocation("/why-invitations-matter");
            }}
            className="text-white/80 hover:text-white hover:bg-red-700"
          >
            <span className="text-sm font-semibold tracking-wide">
              Why Personal Invitations Matter
            </span>
          </Button>

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
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setLoginModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 font-semibold transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShareModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setImportModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    onClick={e => {
                      e.preventDefault();
                      setLocation("/admin");
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Console
                  </button>
                  <button
                    onClick={e => {
                      e.preventDefault();
                      setLocation("/follow-up");
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Follow-Up List
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setLocation("/more-info");
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <span className="text-sm font-semibold">CMC Info</span>
                  </button>
                  {/* Days Until CMC - Footer */}
                  <div className="px-4 py-2 border-t border-gray-200">
                    <div className="text-sm font-bold text-gray-900">
                      {daysUntilCMC} days until CMC
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={selectedDistrict}
        selectedCampus={
          viewState.campusId
            ? allCampuses.find(c => c.id === viewState.campusId) || null
            : null
        }
        selectedPerson={selectedPerson}
        onHomeClick={() => {
          setSelectedDistrictId(null);
          setPeoplePanelOpen(false);
          setNationalPanelOpen(false);
          setViewState(DEFAULT_VIEW_STATE);
        }}
        onRegionClick={regionId => handleRegionSelect(regionId)}
        onDistrictClick={districtId => handleDistrictSelect(districtId)}
        onCampusClick={campusId => handleCampusSelect(campusId)}
      />

      {/* Main Content Area Below Header */}
      <div
        className="flex main-content-area md:flex-row flex-col"
        style={{ height: "calc(100vh - 120px)" }}
      >
        {/* Left District/National Panel */}
        <div
          className={[
            "bg-white border-r border-gray-300 flex-shrink-0 relative",
            !isResizingDistrict
              ? "transition-all duration-300 ease-in-out"
              : "",
            isMobile ? "left-panel-mobile" : "",
            isMobile && !(selectedDistrictId || nationalPanelOpen)
              ? "closed"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            isMobile
              ? {
                  width: "100%",
                  height:
                    selectedDistrictId || nationalPanelOpen ? "45vh" : "0",
                  overflow:
                    selectedDistrictId || nationalPanelOpen ? "auto" : "hidden",
                }
              : {
                  width:
                    selectedDistrictId || nationalPanelOpen
                      ? `${districtPanelWidth}%`
                      : "0%",
                  height: "100%",
                  overflow:
                    selectedDistrictId || nationalPanelOpen ? "auto" : "hidden",
                }
          }
        >
          {(selectedDistrictId || nationalPanelOpen) && (
            <>
              {/* Resize Handle (desktop only) */}
              {!isMobile && (
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 bg-gray-200 transition-colors z-10"
                  onMouseDown={handleDistrictMouseDown}
                />
              )}
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

        {/* Center Map Area */}
        <div
          className="flex-1 relative overflow-auto map-container-mobile"
          style={{ minWidth: 0 }}
        >
          {/* View Mode Selector - fixed near XAN at bottom-right of screen */}
          <div
            className="fixed z-30"
            style={{ right: "12%", bottom: "5%", margin: 0, padding: 0 }}
          >
            <ViewModeSelector
              viewState={viewState}
              onViewStateChange={handleViewStateChange}
            />
          </div>
          {/* Map with Overlay Metrics */}
          <div
            className="relative py-4"
            style={{
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100%",
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

        {/* Right People Panel */}
        <div
          className={[
            "bg-white border-l border-gray-100 flex-shrink-0 relative flex flex-col",
            !isResizingPeople ? "transition-all duration-300 ease-in-out" : "",
            isMobile ? "right-panel-mobile" : "",
            isMobile && !peoplePanelOpen ? "closed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            isMobile
              ? {
                  width: "100%",
                  height: peoplePanelOpen ? "50vh" : "0",
                  overflow: "hidden",
                }
              : {
                  width: peoplePanelOpen ? `${peoplePanelWidth}%` : "0%",
                  height: "100%",
                  overflow: "hidden",
                }
          }
        >
          {peoplePanelOpen && (
            <>
              {/* Resize Handle */}
              {!isMobile && (
                <div
                  className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-gray-400 bg-gray-200 transition-colors z-10"
                  onMouseDown={handlePeopleMouseDown}
                />
              )}
              <PeoplePanel onClose={() => setPeoplePanelOpen(false)} />
            </>
          )}
        </div>
      </div>

      {/* People Tab Button - Fixed to right side, slides out from edge on hover */}
      {!peoplePanelOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="fixed top-1/2 -translate-y-1/2 z-30 group md:block people-tab-mobile"
              style={{ right: 0 }}
            >
              <button
                onClick={() => {
                  if (!user) {
                    // Do nothing - tooltip will show
                    return;
                  }
                  setPeoplePanelOpen(true);
                }}
                className={`
                  bg-black text-white px-1 py-6 rounded-full md:rounded-l-full md:rounded-r-none shadow-md font-medium text-sm backdrop-blur-sm md:translate-x-[calc(100%-20px)] md:group-hover:translate-x-0 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(0,0,0,0.7)] touch-target
                  ${!user ? "opacity-50 cursor-not-allowed" : "group-hover:bg-red-700/90"}
                `}
              >
                <span className="inline-block whitespace-nowrap select-none">
                  People
                </span>
              </button>
            </div>
          </TooltipTrigger>
          {!user && (
            <TooltipContent side="left">
              <p>Please log in to view people</p>
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
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />

      {/* Floating Action Button for Follow-Up (AC: one click from anywhere) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setLocation("/follow-up")}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white z-40 flex items-center justify-center"
            size="icon"
          >
            <ClipboardList className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Follow-Up List (Shift+F)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
