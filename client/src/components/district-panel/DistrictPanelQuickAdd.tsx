import React from "react";

interface DistrictPanelQuickAddProps {
  quickAddMode: string | null;
  quickAddName: string;
  setQuickAddName: (name: string) => void;
  setQuickAddMode: (mode: string | null) => void;
  quickAddInputRef: React.RefObject<HTMLInputElement>;
  createCampus: any;
  districtId: string;
  entityName: string;
}

export function DistrictPanelQuickAdd(props: DistrictPanelQuickAddProps) {
  // ...quick add rendering logic will be moved here from DistrictPanel...
  return <div>QuickAdd</div>;
}
