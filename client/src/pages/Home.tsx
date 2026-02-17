import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Info,
  Menu,
  LogIn,
  UserRound,
  Shield,
  Send,
} from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { HeaderEditorModal } from "@/components/HeaderEditorModal";
import { ShareModal } from "@/components/ShareModal";
import { NationalPanel } from "@/components/NationalPanel";
import { LoginModal } from "@/components/LoginModal";
import { AccountPanel } from "@/components/AccountPanel";
import { EventInfoPanel } from "@/components/EventInfoPanel";
import { WhatIsCmcGoPanel } from "@/components/WhatIsCmcGoPanel";
import { ScopeSelector, useScopeFilter } from "@/components/ScopeSelector";
import { InviteDialog } from "@/components/InviteDialog";
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
import { toast } from "sonner";

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
  const [peoplePanelSnapKey, setPeoplePanelSnapKey] = useState(0);
  const [peoplePanelOpenFilter, setPeoplePanelOpenFilter] = useState<{
    districtId?: string;
    regionId?: string;
    campusIds?: number[];
    statusFilter?: Set<"Yes" | "Maybe" | "No" | "Not Invited">;
    needsView?: boolean;
  } | null>(null);
  const [districtPanelWidth, setDistrictPanelWidth] = useState(60); // percentage
  const [peoplePanelWidth, setPeoplePanelWidth] = useState(40); // percentage
  const [isResizingDistrict, setIsResizingDistrict] = useState(false);
  const [isResizingPeople, setIsResizingPeople] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerBgColor, setHeaderBgColor] = useState<string>("#000000");
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
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [eventInfoPanelOpen, setEventInfoPanelOpen] = useState(false);
  const [whatIsCmcGoPanelOpen, setWhatIsCmcGoPanelOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const closeMenuPanels = () => {
    setShareModalOpen(false);
    setEventInfoPanelOpen(false);
    setAccountPanelOpen(false);
    setWhatIsCmcGoPanelOpen(false);
  };

  const openMenuPanel = (
    panel: "share" | "eventInfo" | "account" | "whatIs"
  ) => {
    closeMenuPanels();
    setMenuOpen(false);
    if (panel === "share") setShareModalOpen(true);
    if (panel === "eventInfo") setEventInfoPanelOpen(true);
    if (panel === "account") setAccountPanelOpen(true);
    if (panel === "whatIs") setWhatIsCmcGoPanelOpen(true);
  };

  const userDisplayName = user?.fullName || user?.name || "Account";

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

    // Convert blob to base64 and upload to S3
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;

      const fileName = selectedFileName || `header-${Date.now()}.jpg`;

      uploadHeaderImage.mutate(
        {
          imageData: base64Data,
          fileName: fileName,
          backgroundColor: backgroundColor,
        },
        {
          onSuccess: _data => {
            // Upload successful — header image updated
          },
          onError: _error => {
            // Upload failed — optimistic preview already shown
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
    onError: error => {
      toast.error(error.message || "Failed to save setting");
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
    if (savedHeaderImage && savedHeaderImage.url) {
      setHeaderImageUrl(savedHeaderImage.url);
    }
  }, [savedHeaderImage]);

  // Set background color from database on load (default black; ignore saved white)
  useEffect(() => {
    if (savedBgColor?.value) {
      const v = savedBgColor.value.trim().toLowerCase();
      if (v && v !== "#ffffff" && v !== "#fff" && v !== "white") {
        setHeaderBgColor(savedBgColor.value);
      }
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
    onError: error => {
      toast.error(error.message || "Failed to create person");
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
    const selectedDistrict = districts.find(d => d.id === districtId);
    const regionId =
      selectedDistrict?.region ||
      extractRegionForViewState(districtId, districts);

    // On mobile with the Table drawer open, update the table filter instead of
    // opening the district panel.  The table will scope to the selected district
    // and expand its campuses/people.  Also highlight district+region on the map.
    if (isMobile && peoplePanelOpen) {
      const campusIds = allCampuses
        .filter(c => c.districtId === districtId)
        .map(c => c.id);
      setPeoplePanelOpenFilter({
        districtId,
        regionId: regionId ?? undefined,
        campusIds,
      });
      setSelectedDistrictId(districtId);
      setViewState({
        mode: "district",
        districtId,
        regionId: regionId ?? null,
        campusId: null,
        panelOpen: false,
      });
      return;
    }

    setSelectedDistrictId(districtId);

    if (peoplePanelOpen) {
      const campusIds = allCampuses
        .filter(c => c.districtId === districtId)
        .map(c => c.id);
      setPeoplePanelOpenFilter({
        districtId,
        regionId: regionId ?? undefined,
        campusIds,
      });
      setPeoplePanelOpen(true);
    }

    const newViewState: ViewState = {
      mode: "district",
      districtId: districtId,
      regionId: regionId,
      campusId: null,
      panelOpen: true,
    };
    setViewState(newViewState);
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

  const handlePersonStatusChange = useCallback(
    (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => {
      updateStatus.mutate({ personId, status: newStatus });
    },
    [updateStatus]
  );

  const handlePersonAdd = useCallback(
    (campusId: number, name: string) => {
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
    },
    [allCampuses, createPerson]
  );

  const handlePersonClick = useCallback((person: Person) => {
    setSelectedPerson(person);
    setPersonDialogOpen(true);
  }, []);

  // After login/register, auto-open the user's district panel
  const handleAuthSuccess = (districtId: string | null) => {
    if (districtId) {
      handleDistrictSelect(districtId);
    }
  };

  // Stable callbacks for DistrictPanel (prevents re-renders when wrapped in memo)
  const handleDistrictPanelClose = useCallback(() => {
    setSelectedDistrictId(null);
    setViewState(prev => ({
      ...prev,
      districtId: null,
      regionId: null,
      campusId: null,
      panelOpen: false,
    }));
  }, []);

  const handleDistrictUpdate = useCallback(() => {
    utils.districts.list.invalidate();
    utils.people.list.invalidate();
  }, [utils]);

  const handleOpenTable = useCallback(
    (
      filter?: {
        districtId?: string;
        regionId?: string;
        campusIds?: number[];
        statusFilter?: Set<"Yes" | "Maybe" | "No" | "Not Invited">;
        needsView?: boolean;
      } | null
    ) => {
      setPeoplePanelOpenFilter(filter ?? null);
      setPeoplePanelOpen(true);
    },
    []
  );

  const handleNationalPanelClose = useCallback(() => {
    setNationalPanelOpen(false);
  }, []);

  const handleMobileDrawerClose = useCallback(() => {
    setSelectedDistrictId(null);
    setNationalPanelOpen(false);
    setViewState(prev => ({
      ...prev,
      districtId: null,
      regionId: null,
      campusId: null,
      panelOpen: false,
    }));
  }, []);

  // Keyboard shortcuts for district panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close panels and modals (in priority order: modals first, then panels)
      if (e.key === "Escape") {
        // If a Radix popover/dropdown/select is currently open, let Radix handle
        // the Escape key — don't also close the underlying panel/drawer.
        const openRadixPopup = document.querySelector(
          '[data-radix-popper-content-wrapper], [data-state="open"][data-radix-select-content]'
        );
        if (openRadixPopup) return;
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
        if (
          shareModalOpen ||
          loginModalOpen ||
          menuOpen ||
          whatIsCmcGoPanelOpen ||
          eventInfoPanelOpen ||
          accountPanelOpen
        ) {
          if (shareModalOpen) setShareModalOpen(false);
          if (loginModalOpen) setLoginModalOpen(false);
          if (menuOpen) setMenuOpen(false);
          if (whatIsCmcGoPanelOpen) setWhatIsCmcGoPanelOpen(false);
          if (eventInfoPanelOpen) setEventInfoPanelOpen(false);
          if (accountPanelOpen) setAccountPanelOpen(false);
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

  return (
    <div
      id="main-content"
      className="min-h-screen bg-slate-50 paper-texture overflow-x-hidden"
    >
      {/* Header - Chi Alpha Toolbar Style */}
      <header
        className="relative z-[250] flex items-center px-2 sm:px-4 group flex-shrink-0"
        style={{
          height: isMobile ? "52px" : `${headerHeight}px`,
          minHeight: isMobile ? "52px" : "52px",
          backgroundColor: headerBgColor || savedBgColor?.value || "#000000",
        }}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Logo + Banner - Left Side: Go Together first, then CMC GO (chase + bounce) */}
        <div
          className="flex-shrink-0 h-8 sm:h-12 w-auto mr-2 sm:mr-4 relative z-10 flex items-center gap-2"
          style={{ marginLeft: isMobile ? "8px" : "12px" }}
        >
          {headerLogoUrl || savedHeaderLogo?.value ? (
            <img
              src={headerLogoUrl || savedHeaderLogo?.value || undefined}
              alt="Logo"
              className="h-full w-auto object-contain max-w-[120px] sm:max-w-none"
            />
          ) : (
            <>
              {/* CMC GO: starts after Go Together, chases and bounces off */}
              <div
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-white flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  opacity: 0,
                  animation:
                    "roll-in-chase 1.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s forwards",
                }}
              >
                <img
                  src="/favicon.svg"
                  alt="CMC GO"
                  className="h-full w-full object-contain"
                  style={{ transform: "rotate(-13deg)" }}
                />
              </div>
              {/* Go Together: slides in from left first, stops to the right of CMC GO */}
              <div
                className="hidden sm:flex items-center gap-2 flex-shrink-0 z-10"
                style={{
                  fontSize: "16px",
                  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                  fontWeight: 400,
                  opacity: 0,
                  animation:
                    "slide-in-go-together-from-left 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s forwards",
                }}
              >
                <span className="whitespace-nowrap text-white">
                  Go Together
                </span>
              </div>
            </>
          )}
        </div>

        {/* Edit Header Button - Positioned absolutely in top left corner */}
        <button
          onClick={() => setHeaderEditorOpen(true)}
          className={`absolute top-1 left-1 flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 ${isHeaderHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>

        {/* Context badge - desktop only: district/campus only (never show role in toolbar on production) */}
        {user && !isMobile && (user.districtName || user.campusName) && (
          <div className="flex-shrink min-w-0 mr-1 z-10 text-white/90 text-sm overflow-hidden">
            <span
              className="inline-block px-2 py-1.5 bg-white/20 rounded-md text-xs font-medium truncate max-w-[140px]"
              title={(user.districtName || user.campusName) ?? undefined}
            >
              {user.districtName || user.campusName}
            </span>
          </div>
        )}

        {/* Right Side: Scope Selector, Why button, Hamburger Menu, CMC Go logo */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10 ml-auto min-w-0 max-w-[70%] sm:max-w-none">
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

          {/* What Is CMC Go Button - desktop only (kept near scope selector) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.preventDefault();
              openMenuPanel("whatIs");
            }}
            className="hidden sm:flex text-white/80 hover:text-white hover:bg-red-700"
          >
            <span className="text-sm font-semibold tracking-wide">
              What is CMC Go?
            </span>
          </Button>

          {/* Hamburger Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/80 hover:text-white hover:bg-red-700 min-w-[44px] min-h-[44px] p-0 sm:p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Dropdown Menu — portalled to body so it sits above all MobileDrawer layers */}
            {menuOpen &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[300]"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="mobile-menu-dropdown fixed right-2 sm:right-4 w-56 sm:w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[301] py-1 max-h-[80vh] overflow-y-auto"
                    style={{ top: isMobile ? "52px" : `${headerHeight}px` }}
                  >
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

                    {/* What Is CMC Go - Mobile only */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openMenuPanel("whatIs");
                      }}
                      className="w-full px-4 py-3 sm:hidden text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                    >
                      <Calendar className="w-5 h-5" />
                      What is CMC Go?
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openMenuPanel("share");
                      }}
                      className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                    >
                      <Share2 className="w-5 h-5 sm:w-4 sm:h-4" />
                      Share CMC Go
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openMenuPanel("eventInfo");
                      }}
                      className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 transition-colors flex items-center gap-3"
                    >
                      <Info className="w-5 h-5 sm:w-4 sm:h-4" />
                      <span className="text-sm">Event Info</span>
                    </button>

                    {(user?.role === "CMC_GO_ADMIN" ||
                      user?.role === "NATIONAL_DIRECTOR" ||
                      user?.role === "FIELD_DIRECTOR" ||
                      user?.role === "REGION_DIRECTOR") && (
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
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setInviteDialogOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 flex items-center gap-3 transition-colors"
                      >
                        <Send className="w-5 h-5 sm:w-4 sm:h-4" />
                        Invite
                      </button>
                    )}

                    {isAuthenticated && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openMenuPanel("account");
                          }}
                          className="w-full px-4 py-3 sm:py-2 text-left text-sm text-black hover:bg-red-600 hover:text-white active:bg-red-700 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <UserRound className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5" />
                            <div className="flex flex-col items-start">
                              <span className="font-semibold">Account</span>
                              <span className="text-xs text-gray-500">
                                {userDisplayName}
                              </span>
                            </div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </>,
                document.body
              )}
          </div>
        </div>
      </header>

      <AccountPanel
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        user={user}
        onLogout={async () => {
          await logout();
          setLoginModalOpen(true);
        }}
      />

      {/* Main Content Area Below Header */}
      <main
        className="flex main-content-area md:flex-row flex-col overflow-hidden"
        style={{
          height: isMobile
            ? "calc(100dvh - 52px)"
            : `calc(100vh - ${headerHeight}px)`,
          minHeight: isMobile ? "calc(100dvh - 52px)" : undefined,
        }}
      >
        {/* Left District/National Panel - Desktop */}
        {!isMobile && (
          <div
            className={[
              "bg-white border-r border-gray-300 flex-shrink-0 relative",
              !isResizingDistrict
                ? "transition-[width] duration-300 ease-in-out"
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
                {/* Resize Handle / Drawer Edge (desktop only) */}
                <div
                  className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-10 border-l border-gray-300 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                  onMouseDown={handleDistrictMouseDown}
                  aria-label="Resize panel"
                />
                {selectedDistrictId && selectedDistrict && (
                  <DistrictPanel
                    key={selectedDistrict.id}
                    district={selectedDistrict}
                    campuses={selectedDistrictCampuses}
                    people={selectedDistrictPeople}
                    isOutOfScope={!isSelectedDistrictInScope}
                    onClose={handleDistrictPanelClose}
                    onPersonStatusChange={handlePersonStatusChange}
                    onPersonAdd={handlePersonAdd}
                    onPersonClick={handlePersonClick}
                    onDistrictUpdate={handleDistrictUpdate}
                    onOpenTable={handleOpenTable}
                  />
                )}
                {nationalPanelOpen && (
                  <NationalPanel
                    onClose={handleNationalPanelClose}
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
            isOpen={
              !!(selectedDistrictId || nationalPanelOpen) && !peoplePanelOpen
            }
            onClose={handleMobileDrawerClose}
            title={nationalPanelOpen ? "National Team" : "District Overview"}
            hideTitleCloseInCorner={false}
            closeOnBackdropClick={true}
          >
            {selectedDistrictId && selectedDistrict && (
              <DistrictPanel
                key={selectedDistrict.id}
                district={selectedDistrict}
                campuses={selectedDistrictCampuses}
                people={selectedDistrictPeople}
                isOutOfScope={!isSelectedDistrictInScope}
                onClose={handleDistrictPanelClose}
                onPersonStatusChange={handlePersonStatusChange}
                onPersonAdd={handlePersonAdd}
                onPersonClick={handlePersonClick}
                onDistrictUpdate={handleDistrictUpdate}
                onOpenTable={handleOpenTable}
              />
            )}
            {nationalPanelOpen && (
              <NationalPanel
                onClose={handleNationalPanelClose}
                onPersonClick={handlePersonClick}
                onPersonStatusChange={handlePersonStatusChange}
              />
            )}
          </MobileDrawer>
        )}

        {/* Center Map Area - fills remaining space so map is full size; on mobile with drawer open, constrain to top half so map fits fully and stays clickable above backdrop */}
        <div
          className={`flex-1 relative overflow-hidden map-container-mobile bg-white ${isMobile && (selectedDistrictId || nationalPanelOpen || peoplePanelOpen) ? "z-[215]" : ""}`}
          style={{
            minWidth: 0,
            ...(isMobile && {
              maxHeight:
                selectedDistrictId || nationalPanelOpen || peoplePanelOpen
                  ? "45dvh"
                  : "calc(100dvh - 52px)",
              flexShrink:
                selectedDistrictId || nationalPanelOpen || peoplePanelOpen
                  ? 0
                  : 1,
              transition: "max-height 0.35s ease-out",
            }),
          }}
        >
          {/* Map wrapper - centers the map and gives it full height */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              padding: isMobile ? 0 : "0.25rem 1.75rem",
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
              isTableOpen={peoplePanelOpen}
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
                ? "transition-[width] duration-300 ease-in-out"
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
                  className="absolute top-0 left-0 w-2 h-full cursor-col-resize bg-gray-200 hover:bg-gray-400 active:bg-gray-500 transition-colors z-10"
                  onMouseDown={handlePeopleMouseDown}
                />
                <PeoplePanel
                  onClose={() => {
                    setPeoplePanelOpen(false);
                    setPeoplePanelOpenFilter(null);
                  }}
                  initialFilter={peoplePanelOpenFilter}
                />
              </>
            )}
          </div>
        )}

        {/* Right People Panel - Mobile (swipe-to-close drawer) */}
        {isMobile && (
          <MobileDrawer
            isOpen={peoplePanelOpen}
            onClose={() => {
              setPeoplePanelOpen(false);
              setPeoplePanelOpenFilter(null);
            }}
            title={
              peoplePanelOpenFilter?.districtId
                ? `People — ${districts.find(d => d.id === peoplePanelOpenFilter.districtId)?.name ?? peoplePanelOpenFilter.districtId}`
                : "People"
            }
            initialSnap="half"
            coverToolbar
            closeOnBackdropClick={true}
            snapOverride={
              peoplePanelSnapKey
                ? { snap: "full", key: peoplePanelSnapKey }
                : undefined
            }
          >
            <PeoplePanel
              onClose={() => {
                setPeoplePanelOpen(false);
                setPeoplePanelOpenFilter(null);
              }}
              initialFilter={peoplePanelOpenFilter}
            />
          </MobileDrawer>
        )}
      </main>

      {/* People Tab Button - Fixed to right side on desktop, bottom right on mobile; hidden when district drawer open on mobile */}
      {!peoplePanelOpen &&
        (!isMobile || !(selectedDistrictId || nationalPanelOpen)) && (
          <Tooltip>
            <TooltipTrigger asChild>
              {isMobile ? (
                /* Mobile: Full-width bar at bottom of screen, extends to bottom edge with safe area */
                <button
                  onClick={e => {
                    (e.currentTarget as HTMLElement).blur();
                    if (!user) {
                      setLoginModalOpen(true);
                      return;
                    }
                    setPeoplePanelOpenFilter(
                      currentScope === "REGION" && selectedRegion
                        ? { regionId: selectedRegion }
                        : currentScope === "DISTRICT" && scopeSelectedDistrict
                          ? {
                              regionId: selectedRegion ?? undefined,
                              districtId: scopeSelectedDistrict,
                            }
                          : null
                    );
                    setPeoplePanelOpen(true);
                  }}
                  className={`
                  fixed inset-x-0 bottom-0 z-30 w-full pt-4 pb-[max(12px,env(safe-area-inset-bottom))] bg-black hover:bg-red-700 active:bg-red-800 text-white rounded-t-xl font-semibold text-lg backdrop-blur-sm transition-all duration-300 ease-out shadow-lg flex items-center justify-center touch-manipulation table-tab-button
                  ${!user ? "opacity-70" : ""}
                `}
                >
                  <span className="inline-block whitespace-nowrap select-none">
                    People
                  </span>
                </button>
              ) : (
                /* Desktop: Slide-out tab on right edge; shrinks when district panel open */
                <div
                  className={`fixed -translate-y-1/2 z-30 ${selectedDistrictId ? "pr-10" : "pr-16"}`}
                  style={{ right: 0, top: "calc(50% + 36px)" }}
                >
                  <button
                    onClick={() => {
                      if (!user) {
                        setLoginModalOpen(true);
                        return;
                      }
                      setPeoplePanelOpenFilter(
                        currentScope === "REGION" && selectedRegion
                          ? { regionId: selectedRegion }
                          : currentScope === "DISTRICT" && scopeSelectedDistrict
                            ? {
                                regionId: selectedRegion ?? undefined,
                                districtId: scopeSelectedDistrict,
                              }
                            : null
                      );
                      setPeoplePanelOpen(true);
                    }}
                    className={`
                    relative bg-black hover:bg-red-700 text-white rounded-full font-medium backdrop-blur-sm transition-all duration-300 ease-out touch-target translate-x-[92%] hover:translate-x-[86%] text-left
                    ${selectedDistrictId ? "w-[120px] py-2 pl-3 pr-4 text-xs" : "w-[200px] py-3.5 pl-5 pr-6 text-sm"}
                    ${!user ? "opacity-70" : ""}
                  `}
                  >
                    <span className="inline-block whitespace-nowrap select-none">
                      People
                    </span>
                  </button>
                </div>
              )}
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
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onAuthSuccess={handleAuthSuccess}
        showClose
      />
      <EventInfoPanel
        open={eventInfoPanelOpen}
        onOpenChange={setEventInfoPanelOpen}
      />
      <WhatIsCmcGoPanel
        open={whatIsCmcGoPanelOpen}
        onOpenChange={setWhatIsCmcGoPanelOpen}
      />
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}
