import { X } from "lucide-react";
import { District, Campus, Person } from "../../../drizzle/schema";
import { Button } from "./ui/button";
import { CampusColumn } from "./CampusColumn";

interface DistrictPanelProps {
  district: District | null;
  campuses: Campus[];
  people: Person[];
  onClose: () => void;
  onPersonStatusChange: (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onPersonAdd: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
}

export function DistrictPanel({
  district,
  campuses,
  people,
  onClose,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
}: DistrictPanelProps) {
  if (!district) return null;

  // Calculate summary counts
  const districtPeople = people.filter(p => p.districtId === district.id);
  const invited = districtPeople.filter(p => p.status !== "Not invited yet").length;
  const going = districtPeople.filter(p => p.status === "Going").length;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{district.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{district.region}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">Invited:</span>{" "}
            <span className="font-semibold text-gray-900">{invited}</span>
          </div>
          <div>
            <span className="text-gray-600">Going:</span>{" "}
            <span className="font-semibold text-gray-900">{going}</span>
          </div>
        </div>
      </div>

      {/* Campus Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        <div className="flex gap-6 min-w-max">
          {campuses.map(campus => {
            const campusPeople = people.filter(p => p.campusId === campus.id);
            return (
              <CampusColumn
                key={campus.id}
                campus={campus}
                people={campusPeople}
                onPersonStatusChange={onPersonStatusChange}
                onPersonAdd={onPersonAdd}
                onPersonClick={onPersonClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
