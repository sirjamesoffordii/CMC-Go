import React from "react";
import { Person } from "../../../../drizzle/schema";

interface DistrictPanelUnassignedProps {
  unassignedPeople: Person[];
  canInteract: boolean;
  // ...other props as needed
}

export function DistrictPanelUnassigned(props: DistrictPanelUnassignedProps) {
  // ...unassigned people rendering logic will be moved here from DistrictPanel...
  return <div>Unassigned</div>;
}
