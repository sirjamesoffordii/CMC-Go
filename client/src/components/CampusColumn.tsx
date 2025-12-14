import { useState } from "react";
import { Campus, Person } from "../../../drizzle/schema";
import { PersonRow } from "./PersonRow";
import { Input } from "./ui/input";

interface CampusColumnProps {
  campus: Campus;
  people: Person[];
  onPersonStatusChange: (personId: number, newStatus: "Not invited yet" | "Maybe" | "Going" | "Not Going") => void;
  onPersonAdd: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
}

export function CampusColumn({
  campus,
  people,
  onPersonStatusChange,
  onPersonAdd,
  onPersonClick,
}: CampusColumnProps) {
  const [newPersonName, setNewPersonName] = useState("");

  // Sort people by status priority
  const statusOrder = { "Going": 0, "Maybe": 1, "Not Going": 2, "Not invited yet": 3 };
  const sortedPeople = [...people].sort((a, b) => {
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      onPersonAdd(campus.id, newPersonName.trim());
      setNewPersonName("");
    }
  };

  return (
    <div className="flex-shrink-0 w-40 bg-gray-50 rounded border border-gray-200 px-2 py-2">
      {/* Campus Header - Compact */}
      <h3 className="font-semibold text-gray-900 text-xs mb-2 text-center border-b border-gray-300 pb-1.5">
        {campus.name}
      </h3>

      {/* People List - Compact */}
      <div className="space-y-1 mb-2">
        {sortedPeople.map(person => (
          <PersonRow
            key={person.id}
            person={person}
            onStatusChange={onPersonStatusChange}
            onClick={onPersonClick}
          />
        ))}
      </div>

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
