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
  onPersonStatusChange: (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onPersonAdd: (campusId: number, name: string) => void;
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
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: campus.id });
  
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
        const statusOrder = { "Going": 0, "Maybe": 1, "Not Going": 2, "Not invited yet": 3 };
        return peopleCopy.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      
      case "name":
        return peopleCopy.sort((a, b) => a.name.localeCompare(b.name));
      
      case "date":
        return peopleCopy.sort((a, b) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      
      default:
        return peopleCopy;
    }
  };

  const sortedPeople = getSortedPeople();

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
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
      className="flex-shrink-0 w-40 bg-gray-50/80 rounded-md border border-gray-100 px-2.5 py-2.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Campus Header - Refined spacing */}
      <div className="relative mb-2.5">
        {/* Drag handle areas on edges */}
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
        
        <div className="flex items-center justify-between gap-1 relative">
          <div className="flex-1 min-w-0 px-3">
            <h3 className="font-medium text-gray-700 text-xs text-center pb-1.5 border-b border-gray-200">
              <EditableText
                value={campus.name}
                onSave={(newName) => {
                  updateCampusName.mutate({ id: campus.id, name: newName });
                }}
                className="font-medium text-gray-700 text-xs"
                inputClassName="font-medium text-gray-700 text-xs w-full text-center"
              />
            </h3>
          </div>
          
          {/* 3-dot menu - positioned at edge */}
          {isHovered && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-0 h-5 w-5 cursor-pointer hover:bg-gray-200 rounded z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
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
          )}
        </div>
      </div>

      {/* People List - Compact with Drag and Drop */}
      <SortableContext
        items={sortedPeople.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 mb-2">
          {sortedPeople.map(person => (
            <PersonRow
              key={person.id}
              person={person}
              onStatusChange={onPersonStatusChange}
              onClick={onPersonClick}
              onPersonUpdate={onCampusUpdate}
            />
          ))}
        </div>
      </SortableContext>

      {/* Quick Add - Compact */}
      <form onSubmit={handleAddPerson} className="mt-2">
        <Input
          type="text"
          placeholder="Add name..."
          value={newPersonName}
          onChange={(e) => setNewPersonName(e.target.value)}
          className="text-xs h-7 px-2"
        />
      </form>
    </div>
  );
}
