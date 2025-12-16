import { X } from "lucide-react";
import { District, Campus, Person } from "../../../drizzle/schema";
import { Button } from "./ui/button";
import { CampusColumn } from "./CampusColumn";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

interface DistrictPanelProps {
  district: District | null;
  campuses: Campus[];
  people: Person[];
  onClose: () => void;
  onPersonStatusChange: (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onPersonAdd: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
  onDistrictUpdate: () => void;
}

export function DistrictPanel({
  district,
  campuses,
  people,
  onClose,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
  onDistrictUpdate,
}: DistrictPanelProps) {
  const [campusOrder, setCampusOrder] = useState<Campus[]>(campuses);
  
  const updateDistrictName = trpc.districts.updateName.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  const updateDistrictRegion = trpc.districts.updateRegion.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Update campus order when campuses prop changes
  useEffect(() => {
    setCampusOrder(campuses);
  }, [campuses]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setCampusOrder((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  if (!district) return null;

  // Calculate summary counts
  const districtPeople = people.filter(p => p.districtId === district.id);
  const goingCount = districtPeople.filter(p => p.status === "Going").length;
  const maybeCount = districtPeople.filter(p => p.status === "Maybe").length;
  const notGoingCount = districtPeople.filter(p => p.status === "Not Going").length;
  const notInvitedCount = districtPeople.filter(p => p.status === "Not invited yet").length;
  const total = districtPeople.length;
  const invitedCount = goingCount + maybeCount + notGoingCount;
  const invitedPercent = total > 0 ? Math.round((invitedCount / total) * 100) : 0;

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
    <div className="h-full flex flex-col bg-white min-w-fit">
      {/* Header - Refined typography hierarchy */}
      <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-medium text-gray-800">
              <EditableText
                value={district.name}
                onSave={(newName) => {
                  updateDistrictName.mutate({ id: district.id, name: newName });
                }}
                className="text-2xl font-medium text-gray-800"
                inputClassName="text-2xl font-medium text-gray-800"
              />
            </h2>
            <span className="text-gray-300 text-xl">|</span>
            <p className="text-base font-normal text-gray-500">
              <EditableText
                value={district.region}
                onSave={(newRegion) => {
                  updateDistrictRegion.mutate({ id: district.id, region: newRegion });
                }}
                className="text-base font-normal text-gray-500"
                inputClassName="text-base font-normal text-gray-500"
              />
            </p>
            <span className="text-gray-200 text-lg">|</span>
            <p className="text-base font-medium text-gray-700">{invitedPercent}% Invited</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Pie Chart and Stats - Refined spacing */}
        <div className="flex items-center gap-6">
          {/* Pie Chart - Medium */}
          <div className="flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              {slices.map((slice, i) => (
                <path key={i} d={slice.path} fill={slice.color} />
              ))}
            </svg>
          </div>
          
          {/* Stats - 2 Columns with Aligned Numbers */}
          <div className="flex gap-8">
            {/* Left Column: Going / Not Going */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between min-w-[110px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Going:</span>
                </div>
                <span className="text-base font-medium text-gray-800">{goingCount}</span>
              </div>
              <div className="flex items-center justify-between min-w-[110px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Not Going:</span>
                </div>
                <span className="text-base font-medium text-gray-800">{notGoingCount}</span>
              </div>
            </div>
            
            {/* Right Column: Maybe / Not Invited Yet */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between min-w-[140px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308] flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Maybe:</span>
                </div>
                <span className="text-base font-medium text-gray-800">{maybeCount}</span>
              </div>
              <div className="flex items-center justify-between min-w-[140px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d1d5db] flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Not Invited Yet:</span>
                </div>
                <span className="text-base font-medium text-gray-800">{notInvitedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Columns - Refined spacing */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={campusOrder.map(c => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-3 min-w-max">
              {campusOrder.map(campus => {
                const campusPeople = people.filter(p => p.campusId === campus.id);
                return (
                  <CampusColumn
                    key={campus.id}
                    campus={campus}
                    people={campusPeople}
                    onPersonStatusChange={onPersonStatusChange}
                    onPersonAdd={onPersonAdd}
                    onPersonClick={onPersonClick}
                    onCampusUpdate={onDistrictUpdate}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
