import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import "@/styles/mobile.css";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Person } from "../../../drizzle/schema";
import {
  MapPin,
  Calendar,
  Pencil,
  Search,
  X,
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Check,
  Upload,
  Menu,
  LogIn,
} from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { HeaderEditorModal } from "@/components/HeaderEditorModal";
import { ShareModal } from "@/components/ShareModal";
import { ImportModal } from "@/components/ImportModal";
import { NationalPanel } from "@/components/NationalPanel";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  );
  const [nationalPanelOpen, setNationalPanelOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [followUpPanelOpen, setFollowUpPanelOpen] = useState(false);
  const [districtPanelWidth, setDistrictPanelWidth] = useState(50); // percentage
  const [followUpPanelWidth, setFollowUpPanelWidth] = useState(50); // percentage
  const [isResizingDistrict, setIsResizingDistrict] = useState(false);
  const [isResizingFollowUp, setIsResizingFollowUp] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerBgColor, setHeaderBgColor] = useState<string>("#1a1a1a");
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState<string>("");
  const [headerEditorOpen, setHeaderEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(56); // pixels - matches Chi Alpha toolbar
  const [isResizingHeader, setIsResizingHeader] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Fetch data
  const { data: districts = [] } = trpc.districts.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const { data: metrics } = trpc.metrics.get.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

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
      utils.followUp.list.invalidate();
    },
  });

  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.metrics.get.invalidate();
    },
  });

  // District to region mapping (for districts not yet in database)
  const districtRegionMap: Record<string, string> = {
    Alabama: "Southeast",
    Alaska: "Northwest",
    Appalachian: "Mid-Atlantic",
    Arizona: "West Coast",
    Arkansas: "South Central",
    Colorado: "Big Sky",
    Georgia: "Southeast",
    Hawaii: "West Coast",
    Illinois: "Great Lakes",
    Indiana: "Great Lakes",
    Iowa: "Great Plains South",
    Kansas: "Great Plains South",
    Kentucky: "Mid-Atlantic",
    Louisiana: "South Central",
    Michigan: "Great Lakes",
    Minnesota: "Great Plains North",
    Mississippi: "Southeast",
    Montana: "Big Sky",
    Nebraska: "Great Plains South",
    NewJersey: "Northeast",
    NewMexico: "Texico",
    NewYork: "Northeast",
    NorthCarolina: "Mid-Atlantic",
    NorthDakota: "Great Plains North",
    "NorthernCal-Nevada": "West Coast",
    NorthernNewEnglend: "Northeast",
    NorthernNewEngland: "Northeast",
    NorthIdaho: "Northwest",
    NorthernMissouri: "Great Plains South",
    NorthTexas: "Texico",
    Ohio: "Great Lakes",
    Oklahoma: "South Central",
    Oregon: "Northwest",
    PeninsularFlorida: "Southeast",
    "Penn-Del": "Northeast",
    Potomac: "Mid-Atlantic",
    SouthCarolina: "Southeast",
    SouthDakota: "Great Plains North",
    SouthernCalifornia: "West Coast",
    SouthernNewEngland: "Northeast",
    SouthIdaho: "Big Sky",
    SouthernMissouri: "Great Plains South",
    SouthTexas: "Texico",
    Tennessee: "Mid-Atlantic",
    Utah: "Big Sky",
    Washington: "Northwest",
    WestFlorida: "Southeast",
    WestTexas: "Texico",
    "Wisconsin-NorthMichigan": "Great Plains North",
    Wyoming: "Big Sky",
    Connecticut: "Northeast",
    Maine: "Northeast",
    Massachusetts: "Northeast",
    NewHampshire: "Northeast",
    Pennsylvania: "Northeast",
    Vermont: "Northeast",
    Virginia: "Mid-Atlantic",
    WestVirginia: "Mid-Atlantic",
    Florida: "Southeast",
    Nevada: "West Coast",
    NorthCalifornia: "West Coast",
    SouthCalifornia: "West Coast",
  };

  // Filter data for selected district
  // Create a district object on the fly if it doesn't exist in database
  const selectedDistrict = useMemo(() => {
    if (!selectedDistrictId) return null;
    const found = districts.find(d => d.id === selectedDistrictId);
    if (found) return found;
    // District not in database yet - create a minimal district object
    // Extract name from ID (e.g., "NorthCarolina" -> "North Carolina")
    const name = selectedDistrictId
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, str => str.toUpperCase());
    return {
      id: selectedDistrictId,
      name: name,
      region: districtRegionMap[selectedDistrictId] || "Unknown",
      leftNeighbor: null,
      rightNeighbor: null,
    };
  }, [districts, selectedDistrictId]);

  const selectedDistrictCampuses = useMemo(
    () => allCampuses.filter(c => c.districtId === selectedDistrictId),
    [allCampuses, selectedDistrictId]
  );

  const selectedDistrictPeople = useMemo(
    () => allPeople.filter(p => p.primaryDistrictId === selectedDistrictId),
    [allPeople, selectedDistrictId]
  );

  // Add notes/needs indicators to people
  const peopleWithIndicators = useMemo(() => {
    return allPeople.map(person => ({
      ...person,
      hasNeeds: allNeeds.some(
        n => n.personId === person.personId && n.isActive
      ),
    }));
  }, [allPeople, allNeeds]);

  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
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
      // Escape to close panels
      if (e.key === "Escape") {
        if (selectedDistrictId) {
          setSelectedDistrictId(null);
        }
        if (followUpPanelOpen) {
          setFollowUpPanelOpen(false);
        }
        return;
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
  }, [selectedDistrictId, followUpPanelOpen, districts]);

  // Handle district panel resize
  const handleDistrictMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingDistrict(true);
  };

  // Handle follow up panel resize
  const handleFollowUpMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingFollowUp(true);
  };

  // Mouse move handler for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingDistrict) {
        const newWidth = (e.clientX / window.innerWidth) * 100;
        setDistrictPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // 20-80%
      }
      if (isResizingFollowUp) {
        const newWidth =
          ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setFollowUpPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // 20-80%
      }
    };

    const handleMouseUp = () => {
      setIsResizingDistrict(false);
      setIsResizingFollowUp(false);
    };

    if (isResizingDistrict || isResizingFollowUp) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingDistrict, isResizingFollowUp]);

  // Calculate days until CMC
  const cmcDate = new Date("2025-07-06");
  const today = new Date();
  const daysUntilCMC = Math.abs(
    Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

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
              src={headerLogoUrl || savedHeaderLogo?.value}
              alt="Logo"
              className="h-full w-auto object-contain"
            />
          ) : (
            <>
              <div
                className="h-9 w-9 rounded-full bg-black border-2 border-white flex flex-col items-center justify-center text-white font-bold text-xs"
                style={{ transform: "rotate(12deg)" }}
              >
                <span>CMC</span>
                <span className="text-[10px] leading-none">Go</span>
              </div>
            </>
          )}
        </div>

        {/* Header Text - Editable */}
        <div
          className="flex-grow text-white/95 tracking-normal relative z-10"
          style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "0.01em" }}
          dangerouslySetInnerHTML={{
            __html: headerText || savedHeaderText?.value || "",
          }}
        />

        {/* Animated Scrolling Text - "We're Going Together" - Starts from logo, stops at search icon */}
        <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center overflow-hidden pointer-events-none z-0">
          <div
            className="whitespace-nowrap text-white/70 font-medium"
            style={{
              fontSize: "14px",
              animation: "scroll-from-countdown-to-search 40s linear forwards",
              letterSpacing: "0.01em",
              left: "calc(100px + 16px)", // Logo (~100px) + margin (16px) = right after logo
            }}
          >
            "We're Going Together"
          </div>
        </div>

        {/* Calendar - June 6 - Positioned on right side, right before where banner stops */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ right: "calc(144px + 140px)" }}
        >
          <div
            className="relative bg-black rounded-md border border-white shadow-sm overflow-hidden"
            style={{ width: "32px", height: "32px" }}
          >
            {/* Calendar binding loops at top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex justify-center gap-0.5 pt-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-white"></div>
              <div className="w-0.5 h-0.5 rounded-full bg-white"></div>
            </div>
            {/* Calendar content */}
            <div className="flex flex-col items-center justify-center h-full pt-1.5">
              <span className="text-[7px] font-semibold text-white uppercase leading-tight">
                June
              </span>
              <span className="text-sm font-bold text-white leading-none">
                6
              </span>
            </div>
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

        {/* Search Icon */}
        <div className="relative flex-shrink-0 mr-2 z-10">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Search Input and Results Dropdown */}
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-300 rounded text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="max-h-80 overflow-y-auto">
                  {/* Filter and display results */}
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
                      .filter(c => c.name.toLowerCase().includes(query))
                      .slice(0, 3);
                    const matchedDistricts = districts
                      .filter(
                        d =>
                          d.id.toLowerCase().includes(query) ||
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
                                  setSelectedDistrictId(campus.districtId);
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100"
                              >
                                <span className="text-sm text-gray-900">
                                  {campus.name}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  in {campus.districtId}
                                </span>
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
                                  setSelectedDistrictId(district.id);
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100"
                              >
                                <span className="text-sm text-gray-900">
                                  {district.name}
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
          )}
        </div>

        {/* Right Side Hamburger Menu */}
        <div className="flex-shrink-0 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white/80 hover:text-white hover:bg-white/10"
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
                    setImportModalOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button
                  onClick={() => {
                    setShareModalOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={e => {
                    e.preventDefault();
                    setLocation("/more-info");
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  More Info
                </button>
                <button
                  onClick={() => {
                    window.location.href = getLoginUrl();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area Below Header */}
      <div
        className="flex main-content-area md:flex-row flex-col"
        style={{ height: "calc(100vh - 120px)" }}
      >
        {/* Left District/National Panel */}
        <div
          className={`transition-all duration-300 ease-in-out bg-white border-r border-gray-300 flex-shrink-0 relative overflow-x-auto left-panel-mobile ${!(selectedDistrictId || nationalPanelOpen) ? "closed" : ""}`}
          style={{
            width: selectedDistrictId || nationalPanelOpen ? "50%" : "0%",
            overflowY: "hidden",
          }}
        >
          {selectedDistrictId && (
            <DistrictPanel
              district={selectedDistrict}
              campuses={selectedDistrictCampuses}
              people={selectedDistrictPeople}
              onClose={() => setSelectedDistrictId(null)}
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
        </div>

        {/* Center Map Area */}
        <div className="flex-1 relative overflow-auto map-container-mobile">
          {/* Map with Overlay Metrics */}
          <div
            className="relative px-6 py-4"
            onClick={e => {
              // Close panels if clicking on padding/empty space around map
              if (e.target === e.currentTarget) {
                setSelectedDistrictId(null);
                setFollowUpPanelOpen(false);
              }
            }}
          >
            <InteractiveMap
              districts={districts}
              selectedDistrictId={selectedDistrictId}
              onDistrictSelect={handleDistrictSelect}
              onBackgroundClick={() => {
                setSelectedDistrictId(null);
                setFollowUpPanelOpen(false);
                setNationalPanelOpen(false);
              }}
              onNationalClick={() => {
                setNationalPanelOpen(true);
                setSelectedDistrictId(null);
                setFollowUpPanelOpen(false);
              }}
            />
          </div>
        </div>

        {/* Right Follow Up Panel */}
        <div
          className={`transition-all duration-300 ease-in-out bg-white border-l border-gray-100 flex-shrink-0 relative right-panel-mobile ${!followUpPanelOpen ? "closed" : ""}`}
          style={{
            width: followUpPanelOpen ? `${followUpPanelWidth}%` : "0%",
            overflow: "hidden",
          }}
        >
          {followUpPanelOpen && (
            <>
              {/* Resize Handle */}
              <div
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-gray-400 bg-gray-200 transition-colors z-10"
                onMouseDown={handleFollowUpMouseDown}
              />
              <FollowUpPanel onClose={() => setFollowUpPanelOpen(false)} />
            </>
          )}
        </div>
      </div>

      {/* Follow Up Tab Button - Fixed to right side, slides out from edge on hover */}
      {!followUpPanelOpen && (
        <div
          className="fixed top-1/2 -translate-y-1/2 z-30 group md:block follow-up-tab-mobile"
          style={{ right: 0 }}
        >
          <button
            onClick={() => setFollowUpPanelOpen(true)}
            className="bg-black/80 text-white px-2 py-8 md:rounded-l-md rounded-full shadow-md font-medium text-sm backdrop-blur-sm translate-x-[calc(100%-6px)] md:group-hover:translate-x-0 group-hover:bg-black transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(0,0,0,0.7)] touch-target"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Follow Ups
          </button>
        </div>
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
        headerText={headerText || savedHeaderText?.value || ""}
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
    </div>
  );
}
