import { useState } from "react";
import { Campus, Person } from "../../drizzle/schema";
import { PersonIcon } from "./PersonIcon";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { MoreVertical, User, Plus, Check, Edit2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface CampusRowProps {
  campus: Campus;
  people: Person[];
  onPersonStatusChange: (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
  onPersonAdd?: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
  onPersonEdit?: (person: Person) => void;
  onCampusUpdate: () => void;
  onCampusEdit?: (campus: Campus) => void;
  isVirtual?: boolean;
}

export function CampusRow({
  campus,
  people,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
  onPersonEdit,
  onCampusUpdate,
  onCampusEdit,
  isVirtual = false,
}: CampusRowProps) {
  const [sortBy, setSortBy] = useState<"status" | "name" | "role">("status");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => onCampusUpdate(),
  });

  const deleteCampus = trpc.campuses.delete.useMutation({
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

      case "role":
        return peopleCopy.sort((a, b) => {
          const roleA = a.primaryRole || "";
          const roleB = b.primaryRole || "";
          return roleA.localeCompare(roleB);
        });

      default:
        return peopleCopy;
    }
  };

  const sortedPeople = getSortedPeople();

  const handleAddPerson = () => {
    if (onPersonAdd && !isVirtual) {
      onPersonAdd(campus.id, "");
    }
  };

  return (
    <div className="flex items-center gap-6 py-1 border-b last:border-b-0 group relative">
      {/* Campus Name with Kebab Menu */}
      <div className="w-60 flex-shrink-0 flex items-center gap-2">
        {/* Kebab Menu */}
        {!isVirtual && (
          <div className="relative">
            <button
              onClick={() => setOpenMenuId(openMenuId === campus.id.toString() ? null : campus.id.toString())}
              className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {openMenuId === campus.id.toString() && (
              <>
                {/* Invisible backdrop to catch clicks outside */}
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setOpenMenuId(null)}
                ></div>

                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[101]">
                  {onCampusEdit && (
                    <>
                      <button
                        onClick={() => {
                          onCampusEdit(campus);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Campus Name
                      </button>
                      <button
                        onClick={() => {
                          const ok = window.confirm(`Delete campus "${campus.name}"? People on this campus will be unassigned.`);
                          if (ok) {
                            deleteCampus.mutate({ id: campus.id });
                          }
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Campus
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                    </>
                  )}
                  <div className="px-4 py-1 text-xs text-gray-500 font-medium">Sort by</div>
                  <button
                    onClick={() => {
                      setSortBy("status");
                      setOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Status</span>
                    {sortBy === "status" && <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy("name");
                      setOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Name</span>
                    {sortBy === "name" && <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy("role");
                      setOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Role</span>
                    {sortBy === "role" && <Check className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <h3 className="font-medium text-gray-900 truncate" title={campus.name}>
          {isVirtual ? (
            <span className="font-medium text-gray-500 italic">{campus.name}</span>
          ) : (
            <EditableText
              value={campus.name}
              onSave={(newName) => {
                updateCampusName.mutate({ id: campus.id, name: newName });
              }}
              className="font-medium text-gray-900"
              inputClassName="font-medium text-gray-900 w-full"
            />
          )}
        </h3>
      </div>

      {/* Person Icons */}
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-visible">
        <div className="flex items-center gap-2 min-h-[60px] min-w-max">
          {sortedPeople.map((person) => (
            <PersonIcon
              key={person.personId}
              person={person}
              onStatusChange={onPersonStatusChange}
              onClick={onPersonClick}
              onEdit={onPersonEdit}
            />
          ))}

          {/* Add Person Button */}
          {onPersonAdd && !isVirtual && (
            <div className="relative flex flex-col items-center w-[50px] flex-shrink-0 group/add">
              <button
                onClick={handleAddPerson}
                className="flex flex-col items-center w-[50px]"
              >
                <div className="h-[18px]"></div> {/* Spacer to match name label height */}
                <div className="relative">
                  <User 
                    className="w-10 h-10 text-gray-300 transition-all group-hover/add:scale-110 active:scale-95" 
                    strokeWidth={1} 
                    fill="none"
                    stroke="currentColor"
                  />
                  <User 
                    className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none" 
                    strokeWidth={1} 
                    fill="none"
                    stroke="currentColor"
                  />
                  <User 
                    className="w-10 h-10 text-gray-400 absolute top-0 left-0 opacity-0 group-hover/add:opacity-100 transition-all pointer-events-none" 
                    strokeWidth={0} 
                    fill="currentColor"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                    }}
                  />
                  <Plus className="w-5 h-5 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/add:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
              </button>
              {/* Label - Absolutely positioned, shown on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-xs text-slate-500 text-center max-w-[80px] leading-tight opacity-0 group-hover/add:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Add
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

