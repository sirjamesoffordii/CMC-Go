import { useState } from "react";
import { Campus, Person } from "../../../drizzle/schema";
import { PersonRow } from "./PersonRow";
import { Input } from "./ui/input";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { MoreVertical, Archive } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface CampusColumnProps {
  campus: Campus;
  people: Person[];
  onPersonStatusChange: (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
  onPersonAdd?: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
  onCampusUpdate: () => void;
}

export function CampusColumn({
  campus,
  people,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
  onCampusUpdate,
}: CampusColumnProps) {
  const [newPersonName, setNewPersonName] = useState("");
  const [sortBy, setSortBy] = useState<"status" | "name" | "date">("status");
  const [isHovered, setIsHovered] = useState(false);
  
  // Disable dragging for "Not Assigned" virtual campus (id === -1)
  const isVirtualCampus = campus.id === -1;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: campus.id,
    disabled: isVirtualCampus, // Disable dragging for virtual campus
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => onCampusUpdate(),
  });

  // Sort people based on selected sort option
  const getSortedPeople = () => {
    const peopleCopy = [...people];
    
    switch (sortBy) {
      case "status":
        const statusOrder = { "Yes": 0, "Maybe": 1, "No": 2, "Not Invited": 3 };
        return peopleCopy.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      
      case "name":
        return peopleCopy.sort((a, b) => a.name.localeCompare(b.name));
      
      case "date":
        return peopleCopy.sort((a, b) => 
          (b.statusLastUpdated ? new Date(b.statusLastUpdated).getTime() : 0) - (a.statusLastUpdated ? new Date(a.statusLastUpdated).getTime() : 0)
        );
      
      default:
        return peopleCopy;
    }
  };

  const sortedPeople = getSortedPeople();

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim() && onPersonAdd) {
      onPersonAdd(campus.id, newPersonName.trim());
      setNewPersonName("");
    }
  };

  const handleArchive = () => {
    // TODO: Implement archive functionality
    console.log("Archive campus:", campus.id);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-48 h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Campus Header - Refined spacing */}
      <div className="relative mb-3 px-3 py-3 border-b border-gray-100 flex-shrink-0">
        {/* Drag handle areas on edges (only for real campuses, not "Not Assigned") */}
        {!isVirtualCampus && (
          <>
            <div 
              className="absolute left-0 top-0 bottom-0 w-3 cursor-grab active:cursor-grabbing z-10"
              {...attributes}
              {...listeners}
            />
            <div 
              className="absolute right-0 top-0 bottom-0 w-3 cursor-grab active:cursor-grabbing z-10"
              {...attributes}
              {...listeners}
            />
          </>
        )}
        
        <div className="flex items-center justify-between gap-1 relative">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm text-center">
              {isVirtualCampus ? (
                // Non-editable name for virtual "Not Assigned" campus
                <span className="font-semibold text-gray-800 text-sm">{campus.name}</span>
              ) : (
                <EditableText
                  value={campus.name}
                  onSave={(newName) => {
                    updateCampusName.mutate({ id: campus.id, name: newName });
                  }}
                  className="font-semibold text-gray-800 text-sm"
                  inputClassName="font-semibold text-gray-800 text-sm w-full text-center"
                />
              )}
            </h3>
          </div>
          
          {/* 3-dot menu - positioned at edge (only for real campuses) */}
          {!isVirtualCampus && (
          <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-1 -top-1 h-6 w-6 cursor-pointer hover:bg-gray-100 rounded-md z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
                <DropdownMenuItem 
                  className="text-xs cursor-pointer"
                  onClick={() => setSortBy("status")}
                >
                  {sortBy === "status" && "✓ "}Status
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-xs cursor-pointer"
                  onClick={() => setSortBy("name")}
                >
                  {sortBy === "name" && "✓ "}Name
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-xs cursor-pointer"
                  onClick={() => setSortBy("date")}
                >
                  {sortBy === "date" && "✓ "}Last Updated
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-xs cursor-pointer text-red-600"
                  disabled={people.length > 0}
                  onClick={handleArchive}
                >
                  <Archive className="h-3 w-3 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          )}
        </div>
      </div>

      {/* People List - Compact with Drag and Drop */}
      <SortableContext
        items={sortedPeople.map(p => p.personId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {sortedPeople.map(person => (
            <PersonRow
              key={person.personId}
              person={person}
              onStatusChange={onPersonStatusChange}
              onClick={onPersonClick}
              onPersonUpdate={onCampusUpdate}
            />
          ))}
        </div>
      </SortableContext>

      {/* Quick Add - Compact (only show for real campuses, not "Not Assigned") */}
      {onPersonAdd && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-gray-100">
          <form onSubmit={handleAddPerson}>
            <Input
              type="text"
              placeholder="+ Add person..."
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              className="text-xs h-8 px-2.5 border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </form>
        </div>
      )}
    </div>
  );
}
