import { ViewMode, ViewState } from "@/types/viewModes";
import { Button } from "@/components/ui/button";
import { Globe2, MapPin, Building2, School } from "lucide-react";

interface ViewModeSelectorProps {
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
}

export function ViewModeSelector({
  viewState,
  onViewStateChange,
}: ViewModeSelectorProps) {
  const handleModeChange = (mode: ViewMode) => {
    // When switching modes, reset scope to appropriate level
    const newState: ViewState = {
      ...viewState,
      mode,
      // Reset scope when switching modes
      regionId: mode === "region" ? viewState.regionId : null,
      districtId: mode === "district" ? viewState.districtId : null,
      campusId: mode === "campus" ? viewState.campusId : null,
    };
    onViewStateChange(newState);
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
      <span className="text-sm text-gray-600 font-medium mr-1">View:</span>
      <Button
        variant={viewState.mode === "nation" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("nation")}
        className={`
          flex items-center gap-1.5
          ${
            viewState.mode === "nation"
              ? "bg-black text-white hover:bg-red-600"
              : "text-black hover:bg-red-600 hover:text-white"
          }
        `}
      >
        <Globe2 className="w-4 h-4" />
        Nation
      </Button>
      <Button
        variant={viewState.mode === "region" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("region")}
        className={`
          flex items-center gap-1.5
          ${
            viewState.mode === "region"
              ? "bg-black text-white hover:bg-red-600"
              : "text-black hover:bg-red-600 hover:text-white"
          }
        `}
      >
        <MapPin className="w-4 h-4" />
        Region
      </Button>
      <Button
        variant={viewState.mode === "district" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("district")}
        className={`
          flex items-center gap-1.5
          ${
            viewState.mode === "district"
              ? "bg-black text-white hover:bg-red-600"
              : "text-black hover:bg-red-600 hover:text-white"
          }
        `}
      >
        <Building2 className="w-4 h-4" />
        District
      </Button>
      <Button
        variant={viewState.mode === "campus" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("campus")}
        className={`
          flex items-center gap-1.5
          ${
            viewState.mode === "campus"
              ? "bg-black text-white hover:bg-red-600"
              : "text-black hover:bg-red-600 hover:text-white"
          }
        `}
      >
        <School className="w-4 h-4" />
        Campus
      </Button>
    </div>
  );
}
