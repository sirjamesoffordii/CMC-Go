import React from "react";
import { District, Person } from "../../../../drizzle/schema";

interface DistrictPanelHeaderProps {
  district: District;
  displayedDistrictDirector: Person | null;
  displayedDistrictStaffList: Person[];
  canInteract: boolean;
  isPublicSafeMode: boolean;
  quickAddMode: string | null;
  quickAddName: string;
  setQuickAddName: (name: string) => void;
  setQuickAddMode: (mode: string | null) => void;
  quickAddInputRef: React.RefObject<HTMLInputElement | null>;
  onPersonStatusChange: (personId: string, status: Person["status"]) => void;
  onEditPerson: (campusId: number | string, person: Person) => void;
  openAddPersonDialog: (campusId: number | string) => void;
  handleQuickAddSubmit: (targetId: string | number) => void;
  handleQuickAddClick: (e: React.MouseEvent, targetId: string | number) => void;
}

export function DistrictPanelHeader({ district }: DistrictPanelHeaderProps) {
  // Minimal header with district name heading for E2E tests
  // Full implementation will be migrated from DistrictPanel.tsx
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-2 mb-1.5 w-full">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-3 min-w-max">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="ml-2 min-w-0">
            <h1 className="font-semibold text-slate-900 leading-tight tracking-tight text-2xl">
              {district.name}
            </h1>
            <span className="text-slate-500 text-sm mt-0.5 block font-medium">
              {district.region}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
