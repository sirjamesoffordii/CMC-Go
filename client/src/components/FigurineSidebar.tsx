import { useState } from "react";
import { District, Campus, Person } from "../../../drizzle/schema";
import { PersonFigurine } from "./PersonFigurine";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface FigurineSidebarProps {
  district: District | null;
  campuses: Campus[];
  people: Person[];
  onClose: () => void;
  onPersonStatusChange: (personId: number, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
}

export function FigurineSidebar({
  district,
  campuses,
  people,
  onClose,
  onPersonStatusChange,
}: FigurineSidebarProps) {
  if (!district) return null;

  // Get campuses for this district
  const districtCampuses = campuses.filter(c => c.districtId === district.id);
  
  // Get people for this district
  const districtPeople = people.filter(p => p.primaryDistrictId === district.id);
  
  // Calculate summary stats
  const goingCount = districtPeople.filter(p => p.status === "Yes").length;
  const maybeCount = districtPeople.filter(p => p.status === "Maybe").length;
  const notGoingCount = districtPeople.filter(p => p.status === "No").length;
  const notInvitedCount = districtPeople.filter(p => p.status === "Not Invited").length;
  const total = districtPeople.length;
  const invitedPercent = total > 0 ? Math.round(((goingCount + maybeCount + notGoingCount) / total) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white w-80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{district.name}</h2>
            <p className="text-sm text-gray-400">{district.region}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800" 
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Summary stats */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="text-green-400">● {goingCount} Going</span>
          <span className="text-yellow-400">● {maybeCount} Maybe</span>
          <span className="text-red-400">● {notGoingCount} No</span>
          <span className="text-gray-400">● {notInvitedCount} Not Invited</span>
        </div>
        <div className="mt-2 text-sm text-gray-300">{invitedPercent}% Invited</div>
      </div>
      
      {/* Campus list with figurines */}
      <div className="flex-1 overflow-y-auto">
        {districtCampuses.map(campus => {
          const campusPeople = districtPeople.filter(p => p.primaryCampusId === campus.id);
          
          if (campusPeople.length === 0) return null;
          
          return (
            <div key={campus.id} className="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50">
              {/* Campus name */}
              <div className="text-sm font-medium text-gray-300 mb-2">{campus.name}</div>
              
              {/* Figurines row */}
              <div className="flex flex-wrap gap-1">
                {campusPeople.map(person => (
                  <PersonFigurine
                    key={person.id}
                    personId={person.id}
                    name={person.name}
                    gender={(person.gender as "male" | "female") || "male"}
                    status={person.status as "Yes" | "Maybe" | "No" | "Not Invited"}
                    onStatusChange={onPersonStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
        
        {/* People without campus assignment */}
        {(() => {
          const noCampusPeople = districtPeople.filter(p => !p.primaryCampusId);
          if (noCampusPeople.length === 0) return null;
          
          return (
            <div className="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50">
              <div className="text-sm font-medium text-gray-400 mb-2">District Staff</div>
              <div className="flex flex-wrap gap-1">
                {noCampusPeople.map(person => (
                  <PersonFigurine
                    key={person.id}
                    personId={person.id}
                    name={person.name}
                    gender={(person.gender as "male" | "female") || "male"}
                    status={person.status as "Yes" | "Maybe" | "No" | "Not Invited"}
                    onStatusChange={onPersonStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-700 flex-shrink-0">
        <div className="text-xs text-gray-500 mb-2">Click figurine to cycle status:</div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Going
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Maybe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            No
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Not Invited
          </span>
        </div>
      </div>
    </div>
  );
}
