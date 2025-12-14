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
  const goingCount = districtPeople.filter(p => p.status === "Going").length;
  const maybeCount = districtPeople.filter(p => p.status === "Maybe").length;
  const notGoingCount = districtPeople.filter(p => p.status === "Not Going").length;
  const notInvitedCount = districtPeople.filter(p => p.status === "Not invited yet").length;
  const total = districtPeople.length;

  // Calculate pie chart segments
  const goingPercent = total > 0 ? (goingCount / total) * 100 : 0;
  const maybePercent = total > 0 ? (maybeCount / total) * 100 : 0;
  const notGoingPercent = total > 0 ? (notGoingCount / total) * 100 : 0;
  const notInvitedPercent = total > 0 ? (notInvitedCount / total) * 100 : 0;

  // Generate pie chart path
  const createPieSlice = (startPercent: number, endPercent: number) => {
    const start = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const end = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = 40 + 35 * Math.cos(start);
    const y1 = 40 + 35 * Math.sin(start);
    const x2 = 40 + 35 * Math.cos(end);
    const y2 = 40 + 35 * Math.sin(end);
    const largeArc = endPercent - startPercent > 50 ? 1 : 0;
    return `M 40 40 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  let currentPercent = 0;
  const slices = [];
  
  if (goingPercent > 0) {
    slices.push({ path: createPieSlice(currentPercent, currentPercent + goingPercent), color: "#22c55e" });
    currentPercent += goingPercent;
  }
  if (maybePercent > 0) {
    slices.push({ path: createPieSlice(currentPercent, currentPercent + maybePercent), color: "#eab308" });
    currentPercent += maybePercent;
  }
  if (notGoingPercent > 0) {
    slices.push({ path: createPieSlice(currentPercent, currentPercent + notGoingPercent), color: "#ef4444" });
    currentPercent += notGoingPercent;
  }
  if (notInvitedPercent > 0) {
    slices.push({ path: createPieSlice(currentPercent, currentPercent + notInvitedPercent), color: "#d1d5db" });
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Compact with Inline Names */}
      <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900">{district.name}</h2>
            <span className="text-gray-400 text-2xl">|</span>
            <p className="text-lg font-semibold text-gray-600">{district.region}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Pie Chart and Stats - Compact */}
        <div className="flex items-center gap-5">
          {/* Pie Chart - Medium */}
          <div className="flex-shrink-0">
            <svg width="90" height="90" viewBox="0 0 80 80">
              {slices.map((slice, i) => (
                <path key={i} d={slice.path} fill={slice.color} />
              ))}
            </svg>
          </div>
          
          {/* Stats - Compact */}
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#22c55e] flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Going:</span>
              <span className="text-lg font-bold text-gray-900 ml-auto">{goingCount}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#eab308] flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Maybe:</span>
              <span className="text-lg font-bold text-gray-900 ml-auto">{maybeCount}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ef4444] flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Not Going:</span>
              <span className="text-lg font-bold text-gray-900 ml-auto">{notGoingCount}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#d1d5db] flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Not Invited Yet:</span>
              <span className="text-lg font-bold text-gray-900 ml-auto">{notInvitedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Columns - Compact */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-3 py-2">
        <div className="flex gap-3 min-w-max">
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
