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
      className="flex-shrink-0 w-40 bg-gray-50 rounded-lg border border-gray-200 px-2 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Campus Header - Compact with 3-dot menu */}
      <div className="relative mb-2">
        <div 
          className="flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-xs text-center pb-1.5 relative">
              <EditableText
                value={campus.name}
                onSave={(newName) => {
                  updateCampusName.mutate({ id: campus.id, name: newName });
                }}
                className="font-semibold text-gray-900 text-xs"
                inputClassName="font-semibold text-gray-900 text-xs w-full text-center"
              />
              {/* Curved divider line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300">
                <div className="absolute left-0 bottom-0 w-2 h-2 border-l border-b border-gray-300 rounded-bl-sm" style={{ transform: 'translateY(50%)' }} />
                <div className="absolute right-0 bottom-0 w-2 h-2 border-r border-b border-gray-300 rounded-br-sm" style={{ transform: 'translateY(50%)' }} />
              </div>
            </h3>
          </div>
          
          {/* 3-dot menu - appears on hover */}
          {isHovered && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 cursor-pointer hover:bg-gray-200 rounded"
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
