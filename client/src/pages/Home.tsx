import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { InteractiveMap } from "@/components/InteractiveMap";
import { DistrictPanel } from "@/components/DistrictPanel";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Button } from "@/components/ui/button";
import { Person } from "../../../drizzle/schema";
import { MapPin, Calendar, Pencil } from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [followUpPanelOpen, setFollowUpPanelOpen] = useState(false);
  const [districtPanelWidth, setDistrictPanelWidth] = useState(50); // percentage
  const [followUpPanelWidth, setFollowUpPanelWidth] = useState(50); // percentage
  const [isResizingDistrict, setIsResizingDistrict] = useState(false);
  const [isResizingFollowUp, setIsResizingFollowUp] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState('/cmc-header-banner.png');
  const [headerBgColor, setHeaderBgColor] = useState('#FFFFFF');
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Fetch data
  const { data: districts = [] } = trpc.districts.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const { data: metrics } = trpc.metrics.get.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();
  
  // Fetch saved header image and background color
  const { data: savedHeaderImage } = trpc.settings.get.useQuery({ key: 'headerImageUrl' });
  const { data: savedBgColor } = trpc.settings.get.useQuery({ key: 'headerBgColor' });
  
  // Upload header image mutation
  const uploadHeaderImage = trpc.settings.uploadHeaderImage.useMutation({
    onSuccess: (data) => {
      setHeaderImageUrl(data.url);
      if (data.backgroundColor) {
        setHeaderBgColor(data.backgroundColor);
      }
      utils.settings.get.invalidate({ key: 'headerImageUrl' });
      utils.settings.get.invalidate({ key: 'headerBgColor' });
    },
  });
  
  // Handle crop complete
  const handleCropComplete = (croppedImageBlob: Blob, croppedImageUrl: string, backgroundColor: string) => {
    // Show preview immediately
    setHeaderImageUrl(croppedImageUrl);
    setHeaderBgColor(backgroundColor);
    setCropModalOpen(false);
    
    console.log('[handleCropComplete] Starting upload, blob size:', croppedImageBlob.size);
    
    // Convert blob to base64 and upload to S3
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      console.log('[handleCropComplete] Base64 data length:', base64Data.length);
      
      const fileName = selectedFileName || `header-${Date.now()}.jpg`;
      console.log('[handleCropComplete] Uploading with fileName:', fileName);
      
      uploadHeaderImage.mutate(
        {
          imageData: base64Data,
          fileName: fileName,
          backgroundColor: backgroundColor,
        },
        {
          onSuccess: (data) => {
            console.log('[handleCropComplete] Upload successful:', data.url);
          },
          onError: (error) => {
            console.error('[handleCropComplete] Upload failed:', error);
          },
        }
      );
    };
    reader.onerror = (error) => {
      console.error('[handleCropComplete] FileReader error:', error);
    };
    reader.readAsDataURL(croppedImageBlob);
  };
  
  // Handle crop cancel
  const handleCropCancel = () => {
    setCropModalOpen(false);
    setSelectedImageSrc('');
    setSelectedFileName('');
  };
  
  // Set header image from database on load
  useEffect(() => {
    if (savedHeaderImage?.value) {
      setHeaderImageUrl(savedHeaderImage.value);
    }
  }, [savedHeaderImage]);
  
  // Set background color from database on load
  useEffect(() => {
    if (savedBgColor?.value) {
      setHeaderBgColor(savedBgColor.value);
    }
  }, [savedBgColor]);

  // Mutations
  const updateStatus = trpc.people.updateStatus.useMutation({
    onMutate: async ({ personId, status }) => {
      await utils.people.list.cancel();
      const previousPeople = utils.people.list.getData();
      
      utils.people.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map(p => 
          p.id === personId 
            ? { ...p, status, lastUpdated: new Date() }
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

  // Filter data for selected district
  const selectedDistrict = useMemo(
    () => districts.find(d => d.id === selectedDistrictId) ?? null,
    [districts, selectedDistrictId]
  );

  const selectedDistrictCampuses = useMemo(
    () => allCampuses.filter(c => c.districtId === selectedDistrictId),
    [allCampuses, selectedDistrictId]
  );

  const selectedDistrictPeople = useMemo(
    () => allPeople.filter(p => p.districtId === selectedDistrictId),
    [allPeople, selectedDistrictId]
  );

  // Add notes/needs indicators to people
  const peopleWithIndicators = useMemo(() => {
    return allPeople.map(person => ({
      ...person,
      hasNeeds: allNeeds.some(n => n.personId === person.id && n.isActive),
    }));
  }, [allPeople, allNeeds]);

  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
  };

  const handlePersonStatusChange = (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => {
    updateStatus.mutate({ personId, status: newStatus });
  };

  const handlePersonAdd = (campusId: number, name: string) => {
    const campus = allCampuses.find(c => c.id === campusId);
    if (!campus) return;
    
    createPerson.mutate({
      name,
      campusId,
      districtId: campus.districtId,
      status: "Not invited yet",
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
      if (e.key === 'Escape') {
        if (selectedDistrictId) {
          setSelectedDistrictId(null);
        }
        if (followUpPanelOpen) {
          setFollowUpPanelOpen(false);
        }
        return;
      }
      
      // Arrow keys to navigate between geographically adjacent districts (only when district panel is open)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedDistrictId) {
        e.preventDefault();
        const currentDistrict = districts.find(d => d.id === selectedDistrictId);
        if (!currentDistrict) return;
        
        // Use geographic adjacency (leftNeighbor/rightNeighbor)
        const nextDistrictId = e.key === 'ArrowLeft' 
          ? currentDistrict.leftNeighbor 
          : currentDistrict.rightNeighbor;
        
        if (nextDistrictId) {
          setSelectedDistrictId(nextDistrictId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setFollowUpPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // 20-80%
      }
    };

    const handleMouseUp = () => {
      setIsResizingDistrict(false);
      setIsResizingFollowUp(false);
    };

    if (isResizingDistrict || isResizingFollowUp) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingDistrict, isResizingFollowUp]);

  // Calculate days until CMC
  const cmcDate = new Date('2025-07-06');
  const today = new Date();
  const daysUntilCMC = Math.abs(Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Full Width */}
      <div 
        className="relative min-h-[120px] h-[120px] overflow-hidden group flex-shrink-0 bg-white"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
            {/* Background Image - fills the header with cover mode */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${headerImageUrl})`,
                backgroundColor: headerBgColor
              }}
            />

            {/* Header Content - Image contains text, so no overlay needed */}

            {/* Edit Button - Appears on hover */}
            {isHeaderHovered && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-4 left-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all duration-200 z-50"
                title="Change header background"
              >
                <Pencil className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Create a preview URL and open crop modal
                  const previewUrl = URL.createObjectURL(file);
                  setSelectedImageSrc(previewUrl);
                  setSelectedFileName(file.name);
                  setCropModalOpen(true);
                  
                  // Reset file input so same file can be selected again
                  e.target.value = '';
                }
              }}
            />

            {/* Top Right Buttons */}
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-white/90 hover:bg-white text-sm" onClick={() => setLocation("/more-info")}>
                  More Info
                </Button>
                <Button className="bg-[#ED1C24] hover:bg-[#C91820] text-white text-sm">
                  Login
                </Button>
              </div>
            </div>
      </div>

      {/* Main Content Area Below Header */}
      <div className="flex" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left District Panel */}
        <div
          className="transition-all duration-300 ease-in-out bg-white border-r border-gray-300 flex-shrink-0 relative"
          style={{ 
            width: selectedDistrictId ? 'auto' : '0%', 
            maxWidth: selectedDistrictId ? '80%' : '0%',
            overflow: 'hidden' 
          }}
        >
          {selectedDistrictId && (
            <>
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
              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-gray-300 transition-colors"
                onMouseDown={handleDistrictMouseDown}
              />
            </>
          )}
        </div>

        {/* Center Map Area */}
        <div className="flex-1 relative overflow-auto">
          {/* Map with Overlay Metrics */}
          <div 
            className="relative px-6 py-4"
            onClick={(e) => {
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
              }}
            />
            
            {/* Metrics Overlay */}
            <div className="absolute top-8 left-10 bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-gray-200 pointer-events-none">
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  Going: {metrics?.going ?? 0}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {metrics?.percentInvited ?? 0}% Invited
                  </div>
                  <div className="text-lg text-gray-600">
                    {metrics?.invited ?? 0} / {metrics?.total ?? 0}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Calendar Widget - Bottom Right */}
            <div className="absolute bottom-8 right-10 flex flex-col items-center pointer-events-none">
              <div className="bg-white border-2 border-gray-300 rounded-2xl shadow-lg overflow-hidden" style={{ width: '100px', height: '100px' }}>
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-5xl font-bold text-gray-900">06</div>
                  </div>
                  <div className="bg-white py-2 border-t border-gray-300">
                    <div className="text-center text-sm font-semibold text-gray-700 tracking-widest">JUL</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-700">
                In {daysUntilCMC} days
              </div>
            </div>
          </div>
        </div>



        {/* Right Follow Up Panel */}
        <div
          className="transition-all duration-300 ease-in-out bg-white border-l border-gray-300 flex-shrink-0 relative"
          style={{ width: followUpPanelOpen ? `${followUpPanelWidth}%` : '0%', overflow: 'hidden' }}
        >
          {followUpPanelOpen && (
            <>
              {/* Resize Handle */}
              <div
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-gray-300 transition-colors z-10"
                onMouseDown={handleFollowUpMouseDown}
              />
              <FollowUpPanel onClose={() => setFollowUpPanelOpen(false)} />
            </>
          )}
        </div>
      </div>

      {/* Follow Up Tab Button - Fixed to right side */}
      {!followUpPanelOpen && (
        <button
          onClick={() => setFollowUpPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#ED1C24] text-white px-4 py-8 rounded-l-lg shadow-lg hover:bg-[#C91820] transition-colors z-30 font-semibold"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Follow Up
        </button>
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
    </div>
  );
}
