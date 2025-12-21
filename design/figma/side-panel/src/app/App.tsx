import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, User, Edit2, Trash2, MoreVertical, Check } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { DroppablePerson } from './components/DroppablePerson';
import { CampusDropZone } from './components/CampusDropZone';
import { CampusNameDropZone } from './components/CampusNameDropZone';
import { CustomDragLayer } from './components/CustomDragLayer';
import { DistrictDirectorDropZone } from './components/DistrictDirectorDropZone';

interface Person {
  id: string;
  name: string;
  role: string;
  status: 'director' | 'staff' | 'co-director' | 'not-invited';
  need?: string;
  notes?: string;
  spouse?: string;
  kids?: string;
}

interface Campus {
  id: string;
  name: string;
  people: Person[];
  sortBy?: 'status' | 'name' | 'role';
}

const statusColors = {
  director: 'text-green-500',
  staff: 'text-yellow-500',
  'co-director': 'text-red-500',
  'not-invited': 'text-gray-400'
};

const statusLabels = {
  director: 'Going',
  staff: 'Maybe',
  'co-director': 'Not Going',
  'not-invited': 'Not Invited Yet'
};

const initialCampusData: Campus[] = [
  {
    id: '1',
    name: 'Kansas City Art Institute',
    people: [
      { id: '1-1', name: 'Sir James Alexander Thomas', role: 'Campus Director', status: 'director' },
      { id: '1-2', name: 'Mario Hoogendorn', role: 'Staff', status: 'staff' }
    ]
  },
  {
    id: '2',
    name: 'Ozark Christian College',
    people: [
      { id: '2-1', name: 'Greg Young', role: 'Campus Director', status: 'director' },
      { id: '2-2', name: 'Moriah Walker', role: 'Campus Co-Director', status: 'director' }
    ]
  },
  {
    id: '3',
    name: 'East Central College',
    people: [
      { id: '3-1', name: 'Joshua Lee', role: 'Staff', status: 'staff' },
      { id: '3-2', name: 'Jared Wright', role: 'Campus Director', status: 'staff' }
    ]
  },
  {
    id: '4',
    name: 'State Fair Community College',
    people: [
      { id: '4-1', name: 'Reyna Moore', role: 'Campus Director', status: 'staff' },
      { id: '4-2', name: 'Ryan Clark', role: 'Staff', status: 'staff' }
    ]
  },
  {
    id: '5',
    name: 'State Technical College of Missouri',
    people: [
      { id: '5-1', name: 'Scott Rodriguez', role: 'Campus Co-Director', status: 'co-director' },
      { id: '5-2', name: 'Haley Thomas', role: 'Campus Director', status: 'not-invited' }
    ]
  }
];

export default function App() {
  const [campuses, setCampuses] = useState<Campus[]>(initialCampusData);
  const [unassignedPeople, setUnassignedPeople] = useState<Person[]>([]);
  const [districtDirector, setDistrictDirector] = useState<Person | null>({
    id: 'dd-1',
    name: 'Sarah Johnson',
    role: 'District Director',
    status: 'director'
  });
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [isCampusDialogOpen, setIsCampusDialogOpen] = useState(false);
  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [isEditCampusDialogOpen, setIsEditCampusDialogOpen] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<{ campusId: string; person: Person } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [personForm, setPersonForm] = useState({
    name: '',
    role: '',
    status: 'director' as Person['status'],
    need: '',
    notes: '',
    spouse: '',
    kids: ''
  });
  
  const [campusForm, setCampusForm] = useState({
    name: ''
  });

  const stats = campuses.reduce((acc, campus) => {
    campus.people.forEach(person => {
      if (person.status === 'director') acc.going++;
      else if (person.status === 'staff') acc.maybe++;
      else if (person.status === 'co-director') acc.notGoing++;
      else if (person.status === 'not-invited') acc.notInvited++;
    });
    return acc;
  }, { going: 0, maybe: 0, notGoing: 0, notInvited: 0 });

  const totalPeople = stats.going + stats.maybe + stats.notGoing + stats.notInvited;
  const invitedPercentage = totalPeople > 0 
    ? Math.round(((totalPeople - stats.notInvited) / totalPeople) * 100) 
    : 0;

  const handleAddPerson = () => {
    if (!selectedCampusId || !personForm.name || !personForm.role) return;
    
    const newPerson: Person = {
      id: `${selectedCampusId}-${Date.now()}`,
      name: personForm.name,
      role: personForm.role,
      status: personForm.status,
      need: personForm.need,
      notes: personForm.notes,
      spouse: personForm.spouse,
      kids: personForm.kids
    };
    
    if (selectedCampusId === 'district') {
      setDistrictDirector(newPerson);
    } else if (selectedCampusId === 'unassigned') {
      setUnassignedPeople([...unassignedPeople, newPerson]);
    } else {
      setCampuses(campuses.map(campus => {
        if (campus.id === selectedCampusId) {
          return { ...campus, people: [...campus.people, newPerson] };
        }
        return campus;
      }));
    }
    
    setPersonForm({ name: '', role: '', status: 'director', need: '', notes: '', spouse: '', kids: '' });
    setIsPersonDialogOpen(false);
    setSelectedCampusId(null);
  };

  const handleAddCampus = () => {
    if (!campusForm.name) return;
    
    const newCampus: Campus = {
      id: `${Date.now()}`,
      name: campusForm.name,
      people: []
    };
    
    setCampuses([...campuses, newCampus]);
    setCampusForm({ name: '' });
    setIsCampusDialogOpen(false);
  };

  const handleEditPerson = (campusId: string, person: Person) => {
    setEditingPerson({ campusId, person });
    setPersonForm({ name: person.name, role: person.role, status: person.status, need: person.need || '', notes: person.notes || '', spouse: person.spouse || '', kids: person.kids || '' });
    setIsEditPersonDialogOpen(true);
  };

  const handleUpdatePerson = () => {
    if (!editingPerson || !personForm.name || !personForm.role) return;
    
    if (editingPerson.campusId === 'district') {
      setDistrictDirector({
        ...districtDirector,
        name: personForm.name,
        role: personForm.role,
        status: personForm.status,
        need: personForm.need,
        notes: personForm.notes,
        spouse: personForm.spouse,
        kids: personForm.kids
      });
    } else if (editingPerson.campusId === 'unassigned') {
      setUnassignedPeople(unassignedPeople.map(p => 
        p.id === editingPerson.person.id
          ? { ...p, name: personForm.name, role: personForm.role, status: personForm.status, need: personForm.need, notes: personForm.notes, spouse: personForm.spouse, kids: personForm.kids }
          : p
      ));
    } else {
      setCampuses(campuses.map(campus => {
        if (campus.id === editingPerson.campusId) {
          return {
            ...campus,
            people: campus.people.map(p => 
              p.id === editingPerson.person.id
                ? { ...p, name: personForm.name, role: personForm.role, status: personForm.status, need: personForm.need, notes: personForm.notes, spouse: personForm.spouse, kids: personForm.kids }
                : p
            )
          };
        }
        return campus;
      }));
    }
    
    setPersonForm({ name: '', role: '', status: 'director', need: '', notes: '', spouse: '', kids: '' });
    setIsEditPersonDialogOpen(false);
    setEditingPerson(null);
  };

  const handleDeletePerson = (campusId: string, personId: string) => {
    setCampuses(campuses.map(campus => {
      if (campus.id === campusId) {
        return {
          ...campus,
          people: campus.people.filter(p => p.id !== personId)
        };
      }
      return campus;
    }));
  };

  const handleDeleteCampus = (campusId: string) => {
    setCampuses(campuses.filter(c => c.id !== campusId));
  };

  const handlePersonClick = (campusId: string, person: Person) => {
    // Cycle through statuses: not-invited -> director -> staff -> co-director -> not-invited
    const statusCycle: Person['status'][] = ['not-invited', 'director', 'staff', 'co-director'];
    const currentIndex = statusCycle.indexOf(person.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    setCampuses(campuses.map(campus => {
      if (campus.id === campusId) {
        return {
          ...campus,
          people: campus.people.map(p => 
            p.id === person.id ? { ...p, status: nextStatus } : p
          )
        };
      }
      return campus;
    }));
  };

  const openAddPersonDialog = (campusId: string) => {
    setSelectedCampusId(campusId);
    
    // Determine default role based on whether it's the first person
    let defaultRole = 'Staff';
    
    if (campusId === 'unassigned') {
      // For unassigned, check if there are any people
      if (unassignedPeople.length === 0) {
        defaultRole = 'Campus Director';
      }
    } else if (campusId === 'district') {
      defaultRole = 'District Director';
    } else {
      // For campus, check if there are any people in that campus
      const campus = campuses.find(c => c.id === campusId);
      if (campus && campus.people.length === 0) {
        defaultRole = 'Campus Director';
      }
    }
    
    setPersonForm({ name: '', role: defaultRole, status: 'director', need: '', notes: '', spouse: '', kids: '' });
    setIsPersonDialogOpen(true);
  };

  const handleEditCampus = (campusId: string) => {
    const campus = campuses.find(c => c.id === campusId);
    if (campus) {
      setCampusForm({ name: campus.name });
      setIsEditCampusDialogOpen(true);
    }
  };

  const handleUpdateCampus = () => {
    if (!selectedCampusId || !campusForm.name) return;
    
    setCampuses(campuses.map(campus => {
      if (campus.id === selectedCampusId) {
        return { ...campus, name: campusForm.name };
      }
      return campus;
    }));
    
    setCampusForm({ name: '' });
    setIsEditCampusDialogOpen(false);
    setSelectedCampusId(null);
  };

  // Handle campus sort change
  const handleCampusSortChange = (campusId: string, sortBy: 'status' | 'name' | 'role') => {
    setCampuses(campuses.map(campus => {
      if (campus.id === campusId) {
        // Apply the sort immediately and update the people array
        const sortedPeople = getSortedPeople(campus.people, sortBy);
        return { ...campus, sortBy, people: sortedPeople };
      }
      return campus;
    }));
  };

  // Get sorted people based on campus sort setting
  const getSortedPeople = (people: Person[], sortBy?: 'status' | 'name' | 'role') => {
    if (!sortBy || sortBy === 'status') {
      return sortPeopleByStatus(people);
    } else if (sortBy === 'name') {
      return [...people].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'role') {
      return [...people].sort((a, b) => a.role.localeCompare(b.role));
    }
    return people;
  };

  // Sort people by status
  const sortPeopleByStatus = (people: Person[]) => {
    const statusOrder: Record<Person['status'], number> = {
      'not-invited': 0,
      'director': 1,
      'staff': 2,
      'co-director': 3
    };
    
    return [...people].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  };

  // Handle drag and drop - supports both reordering and moving between campuses
  const handlePersonMove = (draggedId: string, draggedCampusId: string, targetCampusId: string, targetIndex: number) => {
    // Handle moving from district director (not allowed to move, just ignore)
    if (draggedCampusId === 'district') {
      return;
    }

    // Handle moving from unassigned
    if (draggedCampusId === 'unassigned') {
      const personToMove = unassignedPeople.find(p => p.id === draggedId);
      if (!personToMove) return;

      // Remove from unassigned
      setUnassignedPeople(prev => prev.filter(p => p.id !== draggedId));

      // Add to target campus
      if (targetCampusId === 'unassigned') {
        // Moving within unassigned (reorder)
        const newUnassigned = [...unassignedPeople];
        const draggedIndex = newUnassigned.findIndex(p => p.id === draggedId);
        const [draggedPerson] = newUnassigned.splice(draggedIndex, 1);
        newUnassigned.splice(targetIndex, 0, draggedPerson);
        setUnassignedPeople(newUnassigned);
      } else {
        // Moving to a campus
        setCampuses(prev => prev.map(campus => {
          if (campus.id === targetCampusId) {
            const newPeople = [...campus.people];
            newPeople.splice(targetIndex, 0, personToMove);
            return { ...campus, people: newPeople };
          }
          return campus;
        }));
      }
      return;
    }

    // Handle moving to unassigned
    if (targetCampusId === 'unassigned') {
      const fromCampus = campuses.find(c => c.id === draggedCampusId);
      if (!fromCampus) return;
      
      const personToMove = fromCampus.people.find(p => p.id === draggedId);
      if (!personToMove) return;

      // Remove from campus
      setCampuses(prev => prev.map(campus => {
        if (campus.id === draggedCampusId) {
          return {
            ...campus,
            people: campus.people.filter(p => p.id !== draggedId)
          };
        }
        return campus;
      }));

      // Add to unassigned
      const newUnassigned = [...unassignedPeople];
      newUnassigned.splice(targetIndex, 0, personToMove);
      setUnassignedPeople(newUnassigned);
      return;
    }

    // Same campus - reorder
    if (draggedCampusId === targetCampusId) {
      setCampuses(prev => prev.map(campus => {
        if (campus.id === draggedCampusId) {
          const newPeople = [...campus.people];
          const draggedIndex = newPeople.findIndex(p => p.id === draggedId);
          const [draggedPerson] = newPeople.splice(draggedIndex, 1);
          newPeople.splice(targetIndex, 0, draggedPerson);
          return { ...campus, people: newPeople };
        }
        return campus;
      }));
    } else {
      // Different campus - move
      let personToMove: Person | undefined;

      // Find the person
      const fromCampus = campuses.find(c => c.id === draggedCampusId);
      if (fromCampus) {
        personToMove = fromCampus.people.find(p => p.id === draggedId);
      }

      if (!personToMove) return;

      // Remove from source and add to destination
      setCampuses(prev => prev.map(campus => {
        if (campus.id === draggedCampusId) {
          return {
            ...campus,
            people: campus.people.filter(p => p.id !== draggedId)
          };
        } else if (campus.id === targetCampusId) {
          const newPeople = [...campus.people];
          newPeople.splice(targetIndex, 0, personToMove!);
          return { ...campus, people: newPeople };
        }
        return campus;
      }));
    }
  };

  // Handle drop on campus row (not on specific person) - add to end
  const handleCampusRowDrop = (personId: string, fromCampusId: string, toCampusId: string) => {
    if (fromCampusId === toCampusId) return; // Already in the right place

    let personToMove: Person | undefined;

    // Find the person from unassigned or campus
    if (fromCampusId === 'unassigned') {
      personToMove = unassignedPeople.find(p => p.id === personId);
    } else {
      const fromCampus = campuses.find(c => c.id === fromCampusId);
      if (fromCampus) {
        personToMove = fromCampus.people.find(p => p.id === personId);
      }
    }

    if (!personToMove) return;

    // Remove from source
    if (fromCampusId === 'unassigned') {
      setUnassignedPeople(prev => prev.filter(p => p.id !== personId));
    } else {
      setCampuses(prev => prev.map(campus => {
        if (campus.id === fromCampusId) {
          return {
            ...campus,
            people: campus.people.filter(p => p.id !== personId)
          };
        }
        return campus;
      }));
    }

    // Add to destination
    if (toCampusId === 'unassigned') {
      setUnassignedPeople(prev => [...prev, personToMove!]);
    } else {
      setCampuses(prev => prev.map(campus => {
        if (campus.id === toCampusId) {
          return {
            ...campus,
            people: [...campus.people, personToMove!]
          };
        }
        return campus;
      }));
    }
  };

  // Handle drop on campus name - add to front
  const handleCampusNameDrop = (personId: string, fromCampusId: string, toCampusId: string) => {
    if (fromCampusId === toCampusId) return; // Already in the right place

    let personToMove: Person | undefined;

    // Find the person from unassigned or campus
    if (fromCampusId === 'unassigned') {
      personToMove = unassignedPeople.find(p => p.id === personId);
    } else {
      const fromCampus = campuses.find(c => c.id === fromCampusId);
      if (fromCampus) {
        personToMove = fromCampus.people.find(p => p.id === personId);
      }
    }

    if (!personToMove) return;

    // Remove from source
    if (fromCampusId === 'unassigned') {
      setUnassignedPeople(prev => prev.filter(p => p.id !== personId));
    } else {
      setCampuses(prev => prev.map(campus => {
        if (campus.id === fromCampusId) {
          return {
            ...campus,
            people: campus.people.filter(p => p.id !== personId)
          };
        }
        return campus;
      }));
    }

    // Add to beginning of destination
    setCampuses(prev => prev.map(campus => {
      if (campus.id === toCampusId) {
        return {
          ...campus,
          people: [personToMove!, ...campus.people]
        };
      }
      return campus;
    }));
  };

  // Handle drop on district director position
  const handleDistrictDirectorDrop = (personId: string, fromCampusId: string) => {
    let personToMove: Person | undefined;

    // Find the person from source
    if (fromCampusId === 'unassigned') {
      personToMove = unassignedPeople.find(p => p.id === personId);
    } else if (fromCampusId === 'district') {
      return; // Already district director
    } else {
      const fromCampus = campuses.find(c => c.id === fromCampusId);
      if (fromCampus) {
        personToMove = fromCampus.people.find(p => p.id === personId);
      }
    }

    if (!personToMove) return;

    // Remove from source
    if (fromCampusId === 'unassigned') {
      setUnassignedPeople(prev => prev.filter(p => p.id !== personId));
    } else {
      setCampuses(prev => prev.map(campus => {
        if (campus.id === fromCampusId) {
          return {
            ...campus,
            people: campus.people.filter(p => p.id !== personId)
          };
        }
        return campus;
      }));
    }

    // Move existing district director to unassigned if there is one
    if (districtDirector) {
      setUnassignedPeople(prev => [...prev, districtDirector]);
    }

    // Set new district director
    setDistrictDirector(personToMove);
  };

  // Get person for drag layer
  const getPerson = (personId: string, campusId: string): Person | undefined => {
    if (campusId === 'unassigned') {
      return unassignedPeople.find(p => p.id === personId);
    }
    const campus = campuses.find(c => c.id === campusId);
    return campus?.people.find(p => p.id === personId);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full bg-gray-50 p-6 overflow-auto">
        <div className="max-w-2xl">{/* Side panel width */}
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3 transition-shadow hover:shadow-md">
            {/* Title Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900 leading-tight">Southern Missouri</h1>
                  <span className="text-gray-500 text-sm">Great Plains South</span>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                
                {/* District Director */}
                <DistrictDirectorDropZone
                  person={districtDirector}
                  onDrop={handleDistrictDirectorDrop}
                  onEdit={handleEditPerson}
                  onClick={() => {
                    if (!districtDirector) return;
                    const statusCycle: Person['status'][] = ['not-invited', 'director', 'staff', 'co-director'];
                    const currentIndex = statusCycle.indexOf(districtDirector.status);
                    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
                    setDistrictDirector({ ...districtDirector, status: nextStatus });
                  }}
                  onAddClick={() => openAddPersonDialog('district')}
                />
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="flex items-center gap-8 mt-3">
              {/* Pie Chart - Filled */}
              <svg width="90" height="90" viewBox="0 0 120 120" className="flex-shrink-0">
                {/* Background circle */}
                <circle cx="60" cy="60" r="55" fill="#e5e7eb" />
                
                {/* Calculate pie slices */}
                {(() => {
                  const total = totalPeople || 1;
                  const goingAngle = (stats.going / total) * 360;
                  const maybeAngle = (stats.maybe / total) * 360;
                  const notGoingAngle = (stats.notGoing / total) * 360;
                  const notInvitedAngle = (stats.notInvited / total) * 360;
                  
                  const createPieSlice = (startAngle: number, angle: number, color: string) => {
                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (startAngle + angle - 90) * Math.PI / 180;
                    const x1 = 60 + 55 * Math.cos(startRad);
                    const y1 = 60 + 55 * Math.sin(startRad);
                    const x2 = 60 + 55 * Math.cos(endRad);
                    const y2 = 60 + 55 * Math.sin(endRad);
                    const largeArc = angle > 180 ? 1 : 0;
                    
                    return `M 60 60 L ${x1} ${y1} A 55 55 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  };
                  
                  let currentAngle = 0;
                  const slices = [];
                  
                  if (stats.going > 0) {
                    slices.push(<path key="going" d={createPieSlice(currentAngle, goingAngle, '#22c55e')} fill="#22c55e" stroke="white" strokeWidth="1" />);
                    currentAngle += goingAngle;
                  }
                  
                  if (stats.maybe > 0) {
                    slices.push(<path key="maybe" d={createPieSlice(currentAngle, maybeAngle, '#eab308')} fill="#eab308" stroke="white" strokeWidth="1" />);
                    currentAngle += maybeAngle;
                  }
                  
                  if (stats.notGoing > 0) {
                    slices.push(<path key="notGoing" d={createPieSlice(currentAngle, notGoingAngle, '#ef4444')} fill="#ef4444" stroke="white" strokeWidth="1" />);
                    currentAngle += notGoingAngle;
                  }
                  
                  if (stats.notInvited > 0) {
                    slices.push(<path key="notInvited" d={createPieSlice(currentAngle, notInvitedAngle, '#9ca3af')} fill="#9ca3af" stroke="white" strokeWidth="1" />);
                  }
                  
                  return slices;
                })()}
              </svg>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-x-20 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="text-gray-700">Going:</span>
                  <span className="font-semibold text-gray-900 ml-auto tabular-nums">{stats.going}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                  <span className="text-gray-700">Maybe:</span>
                  <span className="font-semibold text-gray-900 ml-auto tabular-nums">{stats.maybe}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                  <span className="text-gray-700">Not Going:</span>
                  <span className="font-semibold text-gray-900 ml-auto tabular-nums">{stats.notGoing}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></div>
                  <span className="text-gray-700">Not Invited Yet:</span>
                  <span className="font-semibold text-gray-900 ml-auto tabular-nums">{stats.notInvited}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campuses Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 transition-shadow hover:shadow-md">
            <div className="space-y-3">
              {campuses.map((campus) => (
                <div key={campus.id} className="flex items-center gap-6 py-1 border-b last:border-b-0 group relative">
                  {/* Campus Name */}
                  <CampusNameDropZone campusId={campus.id} onDrop={handleCampusNameDrop}>
                    <div className="w-60 flex-shrink-0 flex items-center gap-2">
                    {/* Kebab Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === campus.id ? null : campus.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === campus.id && (
                        <>
                          {/* Invisible backdrop to catch clicks outside */}
                          <div 
                            className="fixed inset-0 z-[5]" 
                            onClick={() => setOpenMenuId(null)}
                          ></div>
                          
                          <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setSelectedCampusId(campus.id);
                                handleEditCampus(campus.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Campus Name
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <div className="px-4 py-1 text-xs text-gray-500 font-medium">Sort by</div>
                            <button
                              onClick={() => {
                                handleCampusSortChange(campus.id, 'status');
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                            >
                              <span>Status</span>
                              {(!campus.sortBy || campus.sortBy === 'status') && <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                handleCampusSortChange(campus.id, 'name');
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                            >
                              <span>Name</span>
                              {campus.sortBy === 'name' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                handleCampusSortChange(campus.id, 'role');
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                            >
                              <span>Role</span>
                              {campus.sortBy === 'role' && <Check className="w-4 h-4" />}
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={() => {
                                // Archive functionality placeholder
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Archive Campus
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-gray-900 truncate" title={campus.name}>{campus.name}</h3>
                    </div>
                  </CampusNameDropZone>
                  
                  {/* Person Figures */}
                  <CampusDropZone campusId={campus.id} onDrop={handleCampusRowDrop}>
                    {campus.people.map((person, index) => (
                      <DroppablePerson
                        key={person.id}
                        person={person}
                        campusId={campus.id}
                        index={index}
                        onEdit={handleEditPerson}
                        onClick={handlePersonClick}
                        onMove={handlePersonMove}
                      />
                    ))}
                    
                    {/* Add Person Button */}
                    <button 
                      onClick={() => openAddPersonDialog(campus.id)}
                      className="flex flex-col items-center w-[50px] group/add"
                      title="Add person"
                    >
                      <div className="h-[18px]"></div> {/* Spacer to match name label height */}
                      <div className="relative">
                        <User className="w-10 h-10 text-gray-200 group-hover/add:text-gray-400 transition-all group-hover/add:scale-110 active:scale-95" strokeWidth={1.5} fill="none" stroke="currentColor" />
                        <Plus className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/add:opacity-100 transition-opacity" strokeWidth={2.5} />
                      </div>
                    </button>
                  </CampusDropZone>
                </div>
              ))}
              
              {/* Unassigned Row - Only show if there are unassigned people */}
              {unassignedPeople.length > 0 && (
                <div className="flex items-start gap-6 py-2 border-b last:border-b-0 group relative">
                  {/* Unassigned Label */}
                  <div className="w-60 flex-shrink-0 flex items-center gap-2">
                    <div className="w-6"></div> {/* Spacer for kebab menu alignment */}
                    <h3 className="font-medium text-gray-500 italic">Unassigned</h3>
                  </div>
                  
                  {/* Person Figures */}
                  <CampusDropZone campusId="unassigned" onDrop={handleCampusRowDrop}>
                    {sortPeopleByStatus(unassignedPeople).map((person, index) => (
                      <DroppablePerson
                        key={person.id}
                        person={person}
                        campusId="unassigned"
                        index={index}
                        onEdit={handleEditPerson}
                        onClick={(campusId, person) => {
                          // For unassigned, cycle status
                          const statusCycle: Person['status'][] = ['not-invited', 'director', 'staff', 'co-director'];
                          const currentIndex = statusCycle.indexOf(person.status);
                          const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
                          
                          setUnassignedPeople(unassignedPeople.map(p => 
                            p.id === person.id ? { ...p, status: nextStatus } : p
                          ));
                        }}
                        onMove={handlePersonMove}
                      />
                    ))}
                    
                    {/* Add Person Button */}
                    <button 
                      onClick={() => openAddPersonDialog('unassigned')}
                      className="w-10 h-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
                      title="Add person"
                    >
                      <Plus className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </CampusDropZone>
                </div>
              )}
              
              {/* Add Campus Button */}
              <button 
                onClick={() => setIsCampusDialogOpen(true)}
                className="w-60 py-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
              >
                <Plus className="w-6 h-6" strokeWidth={2} />
                <span>Add Campus</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Person Dialog */}
        <Dialog open={isPersonDialogOpen} onOpenChange={setIsPersonDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Add New Person</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="person-name">Name</Label>
                <Input
                  id="person-name"
                  value={personForm.name}
                  onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-role">Role</Label>
                <Input
                  id="person-role"
                  value={personForm.role}
                  onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
                  placeholder="e.g., Campus Director, Staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-status">Status</Label>
                <Select
                  value={personForm.status}
                  onValueChange={(value) => setPersonForm({ ...personForm, status: value as Person['status'] })}
                >
                  <SelectTrigger id="person-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Going</SelectItem>
                    <SelectItem value="staff">Maybe</SelectItem>
                    <SelectItem value="co-director">Not Going</SelectItem>
                    <SelectItem value="not-invited">Not Invited Yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-need">Need</Label>
                <Input
                  id="person-need"
                  value={personForm.need}
                  onChange={(e) => setPersonForm({ ...personForm, need: e.target.value })}
                  placeholder="Enter need"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-notes">Notes</Label>
                <Input
                  id="person-notes"
                  value={personForm.notes}
                  onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
                  placeholder="Enter notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-spouse">Spouse</Label>
                <Input
                  id="person-spouse"
                  value={personForm.spouse}
                  onChange={(e) => setPersonForm({ ...personForm, spouse: e.target.value })}
                  placeholder="Enter spouse's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-kids">Kids</Label>
                <Input
                  id="person-kids"
                  value={personForm.kids}
                  onChange={(e) => setPersonForm({ ...personForm, kids: e.target.value })}
                  placeholder="Enter number of kids"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPersonDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleAddPerson}
                disabled={!personForm.name.trim() || !personForm.role.trim()}
              >
                Add Person
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Person Dialog */}
        <Dialog open={isEditPersonDialogOpen} onOpenChange={setIsEditPersonDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Person</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-person-name">Name</Label>
                <Input
                  id="edit-person-name"
                  value={personForm.name}
                  onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-role">Role</Label>
                <Input
                  id="edit-person-role"
                  value={personForm.role}
                  onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
                  placeholder="e.g., Campus Director, Staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-status">Status</Label>
                <Select
                  value={personForm.status}
                  onValueChange={(value) => setPersonForm({ ...personForm, status: value as Person['status'] })}
                >
                  <SelectTrigger id="edit-person-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Going</SelectItem>
                    <SelectItem value="staff">Maybe</SelectItem>
                    <SelectItem value="co-director">Not Going</SelectItem>
                    <SelectItem value="not-invited">Not Invited Yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-need">Need</Label>
                <Input
                  id="edit-person-need"
                  value={personForm.need}
                  onChange={(e) => setPersonForm({ ...personForm, need: e.target.value })}
                  placeholder="Enter need"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-notes">Notes</Label>
                <Input
                  id="edit-person-notes"
                  value={personForm.notes}
                  onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
                  placeholder="Enter notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-spouse">Spouse</Label>
                <Input
                  id="edit-person-spouse"
                  value={personForm.spouse}
                  onChange={(e) => setPersonForm({ ...personForm, spouse: e.target.value })}
                  placeholder="Enter spouse's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-kids">Kids</Label>
                <Input
                  id="edit-person-kids"
                  value={personForm.kids}
                  onChange={(e) => setPersonForm({ ...personForm, kids: e.target.value })}
                  placeholder="Enter number of kids"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPersonDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdatePerson}>Update Person</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Campus Dialog */}
        <Dialog open={isCampusDialogOpen} onOpenChange={setIsCampusDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Add New Campus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campus-name">Campus Name</Label>
                <Input
                  id="campus-name"
                  value={campusForm.name}
                  onChange={(e) => setCampusForm({ name: e.target.value })}
                  placeholder="Enter campus name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCampusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCampus}>Add Campus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Campus Dialog */}
        <Dialog open={isEditCampusDialogOpen} onOpenChange={setIsEditCampusDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Campus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-campus-name">Campus Name</Label>
                <Input
                  id="edit-campus-name"
                  value={campusForm.name}
                  onChange={(e) => setCampusForm({ name: e.target.value })}
                  placeholder="Enter campus name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditCampusDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdateCampus}>Update Campus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Custom Drag Layer */}
        <CustomDragLayer getPerson={getPerson} />
      </div>
    </DndProvider>
  );
}