import { ChevronRight } from "lucide-react";
import { ViewState } from "@/types/viewModes";
import { District, Campus, Person } from "../../../drizzle/schema";

interface BreadcrumbProps {
  viewState: ViewState;
  selectedDistrict: District | null;
  selectedCampus: Campus | null;
  selectedPerson: Person | null;
  onRegionClick?: (regionId: string) => void;
  onDistrictClick?: (districtId: string) => void;
  onCampusClick?: (campusId: number) => void;
  onHomeClick?: () => void;
}

export function Breadcrumb({
  viewState,
  selectedDistrict,
  selectedCampus,
  selectedPerson,
  onRegionClick,
  onDistrictClick,
  onCampusClick,
  onHomeClick,
}: BreadcrumbProps) {
  const parts: { label: string; onClick?: () => void; isActive: boolean }[] =
    [];

  // Always start with home/nation
  parts.push({
    label: "Home",
    onClick: onHomeClick,
    isActive:
      !viewState.regionId && !viewState.districtId && !viewState.campusId,
  });

  // Add region if present
  if (viewState.regionId) {
    parts.push({
      label: viewState.regionId,
      onClick: onRegionClick
        ? () => onRegionClick(viewState.regionId!)
        : undefined,
      isActive: viewState.mode === "region",
    });
  }

  // Add district if present
  if (viewState.districtId && selectedDistrict) {
    parts.push({
      label: selectedDistrict.name,
      onClick: onDistrictClick
        ? () => onDistrictClick(viewState.districtId!)
        : undefined,
      isActive: viewState.mode === "district",
    });
  }

  // Add campus if present
  if (viewState.campusId && selectedCampus) {
    parts.push({
      label: selectedCampus.name,
      onClick: onCampusClick
        ? () => onCampusClick(viewState.campusId!)
        : undefined,
      isActive: viewState.mode === "campus",
    });
  }

  // Add person if present (not clickable, just shows current location)
  if (selectedPerson) {
    parts.push({
      label: selectedPerson.name,
      onClick: undefined,
      isActive: true,
    });
  }

  // Don't show breadcrumb if we're just at home
  if (parts.length <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-1 text-sm text-muted-foreground px-4 py-2 bg-background/95 border-b"
      aria-label="Breadcrumb"
    >
      {parts.map((part, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {part.onClick ? (
            <button
              onClick={part.onClick}
              className={`hover:text-foreground transition-colors ${
                part.isActive ? "text-foreground font-medium" : ""
              }`}
              aria-current={part.isActive ? "page" : undefined}
            >
              {part.label}
            </button>
          ) : (
            <span
              className={part.isActive ? "text-foreground font-medium" : ""}
              aria-current={part.isActive ? "page" : undefined}
            >
              {part.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
