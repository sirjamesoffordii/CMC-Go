import { X, Plus, User, Edit2, MoreVertical, Check, Archive, Hand } from "lucide-react";
import { District, Campus, Person } from "../../../drizzle/schema";
import { Button } from "./ui/button";
import { EditableText } from "./EditableText";
import { trpc } from "../lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { DroppablePerson } from "./DroppablePerson";
import { CampusDropZone } from "./CampusDropZone";
import { CampusNameDropZone } from "./CampusNameDropZone";
import { CustomDragLayer } from "./CustomDragLayer";
import { DistrictDirectorDropZone } from "./DistrictDirectorDropZone";
import { PersonDropZone } from "./PersonDropZone";

interface DistrictPanelProps {
  district: District | null;
  campuses: Campus[];
  people: Person[];
  onClose: () => void;
  onPersonStatusChange: (personId: string, newStatus: "Yes" | "Maybe" | "No" | "Not Invited") => void;
  onPersonAdd: (campusId: number, name: string) => void;
  onPersonClick: (person: Person) => void;
  onDistrictUpdate: () => void;
}

// Status mapping between Figma design and database
const statusMap = {
  'director': 'Yes' as const,
  'staff': 'Maybe' as const,
  'co-director': 'No' as const,
  'not-invited': 'Not Invited' as const,
};

const reverseStatusMap = {
  'Yes': 'director' as const,
  'Maybe': 'staff' as const,
  'No': 'co-director' as const,
  'Not Invited': 'not-invited' as const,
};

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
  const utils = trpc.useUtils();
  
  const updateDistrictName = trpc.districts.updateName.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  const updateDistrictRegion = trpc.districts.updateRegion.useMutation({
    onSuccess: () => onDistrictUpdate(),
  });
  const createCampus = trpc.campuses.create.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      onDistrictUpdate();
    },
  });
  const updateCampusName = trpc.campuses.updateName.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      onDistrictUpdate();
    },
  });
  const updatePerson = trpc.people.update.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      onDistrictUpdate();
    },
  });
  const updatePersonStatus = trpc.people.updateStatus.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      onDistrictUpdate();
    },
  });
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      onDistrictUpdate();
    },
  });
  const archiveCampus = trpc.campuses.archive.useMutation({
    onSuccess: () => {
      utils.campuses.list.invalidate();
      utils.campuses.byDistrict.invalidate({ districtId: district.id });
      onDistrictUpdate();
    },
  });

  // Dialog states
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [isCampusDialogOpen, setIsCampusDialogOpen] = useState(false);
  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [isEditCampusDialogOpen, setIsEditCampusDialogOpen] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<number | string | null>(null);
  const [editingPerson, setEditingPerson] = useState<{ campusId: number | string; person: Person } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  
  // Form states
  const [personForm, setPersonForm] = useState({
    name: '',
    role: 'Staff',
    status: 'not-invited' as keyof typeof statusMap,
    needType: 'Financial' as 'Financial' | 'Transportation' | 'Housing' | 'Other',
    needAmount: '',
    needDetails: '',
    notes: '',
    spouse: '',
    kids: '',
    depositPaid: false,
    needsMet: false
  });
  
  const [campusForm, setCampusForm] = useState({
    name: ''
  });

  // Campus sort preferences
  const [campusSorts, setCampusSorts] = useState<Record<number, 'status' | 'name' | 'role'>>({});

  // Fetch needs to check if people have needs
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  if (!district) return null;

  // Calculate district people and stats
  const districtPeople = people.filter(p => p.primaryDistrictId === district.id);
  
  // Map people with needs indicator
  const peopleWithNeeds = useMemo(() => {
    return districtPeople.map(person => ({
      ...person,
      hasNeeds: allNeeds.some(n => n.personId === person.personId),
    })) as (Person & { hasNeeds: boolean })[];
  }, [districtPeople, allNeeds]);
  const districtDirector = peopleWithNeeds.find(p => 
    p.primaryRole?.toLowerCase().includes('district director') ||
    p.primaryRole?.toLowerCase().includes('dd')
  ) || null;
  
  const peopleWithoutCampus = peopleWithNeeds.filter(p => 
    !p.primaryCampusId && 
    !(p.primaryRole?.toLowerCase().includes('district director') || p.primaryRole?.toLowerCase().includes('dd'))
  );
  const campusesWithPeople = campuses.map(campus => ({
    ...campus,
    people: peopleWithNeeds.filter(p => p.primaryCampusId === campus.id)
  }));

  // Calculate stats
  const stats = useMemo(() => {
    return peopleWithNeeds.reduce((acc, person) => {
      if (person.status === 'Yes') acc.going++;
      else if (person.status === 'Maybe') acc.maybe++;
      else if (person.status === 'No') acc.notGoing++;
      else if (person.status === 'Not Invited') acc.notInvited++;
      return acc;
    }, { going: 0, maybe: 0, notGoing: 0, notInvited: 0 });
  }, [peopleWithNeeds]);

  // Calculate needs summary for district
  const needsSummary = useMemo(() => {
    const districtPersonIds = new Set(peopleWithNeeds.map(p => p.personId));
    const districtNeeds = allNeeds.filter(n => districtPersonIds.has(n.personId));
    const totalNeeds = districtNeeds.length;
    const totalFinancial = districtNeeds
      .filter(n => n.amount !== null && n.amount !== undefined)
      .reduce((sum, n) => sum + (n.amount || 0), 0);
    
    return {
      totalNeeds,
      totalFinancial, // in cents
    };
  }, [allNeeds, peopleWithNeeds]);

  const totalPeople = stats.going + stats.maybe + stats.notGoing + stats.notInvited;
  const invitedPercentage = totalPeople > 0 
    ? Math.round(((totalPeople - stats.notInvited) / totalPeople) * 100) 
    : 0;

  // Sort people based on campus preference
  const getSortedPeople = (people: Person[], campusId: number) => {
    const sortBy = campusSorts[campusId] || 'status';
    
    if (sortBy === 'name') {
      return [...people].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'role') {
      return [...people].sort((a, b) => (a.primaryRole || '').localeCompare(b.primaryRole || ''));
    } else {
      // Sort by status: Not Invited, Yes, Maybe, No
      const statusOrder: Record<Person['status'], number> = {
        'Not Invited': 0,
        'Yes': 1,
        'Maybe': 2,
        'No': 3
      };
      return [...people].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }
  };

  // Handle add person
  const handleAddPerson = () => {
    if (!selectedCampusId || !personForm.name || !personForm.role) return;
    
    if (selectedCampusId === 'district') {
      // Add district director
      const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      createPerson.mutate({
        personId,
        name: personForm.name,
        primaryDistrictId: district.id,
        primaryRole: 'District Director',
        primaryCampusId: null,
        status: statusMap[personForm.status],
        depositPaid: personForm.depositPaid,
        notes: personForm.notes || undefined,
      });
    } else if (selectedCampusId === 'unassigned') {
      // Add to unassigned - create person without campus
      const personId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      createPerson.mutate({
        personId,
        name: personForm.name,
        primaryDistrictId: district.id,
        primaryRole: personForm.role,
        status: statusMap[personForm.status],
        depositPaid: personForm.depositPaid,
        notes: personForm.notes || undefined,
      });
    } else if (typeof selectedCampusId === 'number') {
      // Add to specific campus - use existing onPersonAdd for compatibility
      onPersonAdd(selectedCampusId, personForm.name);
      // Note: Role and status will need to be updated separately after person is created
      // This is a limitation of the current API - would need to enhance onPersonAdd callback
    }
    
    setPersonForm({ name: '', role: 'Staff', status: 'not-invited', needType: 'Financial', needAmount: '', needDetails: '', notes: '', spouse: '', kids: '', depositPaid: false, needsMet: false });
    setIsPersonDialogOpen(false);
    setSelectedCampusId(null);
  };

  // Handle add campus
  const handleAddCampus = () => {
    if (!campusForm.name || !district) return;
    createCampus.mutate({
      name: campusForm.name,
      districtId: district.id,
    });
    setCampusForm({ name: '' });
    setIsCampusDialogOpen(false);
  };

  // Handle edit person
  const handleEditPerson = (campusId: number | string, person: Person) => {
    setEditingPerson({ campusId, person });
    const figmaStatus = reverseStatusMap[person.status] || 'not-invited';
    setPersonForm({ 
      name: person.name, 
      role: person.primaryRole || 'Staff', 
      status: figmaStatus,
      needType: 'Financial', // Would need to fetch from needs API
      needAmount: '', // Would need to fetch from needs API
      needDetails: '', // Would need to fetch from needs API
      notes: person.notes || '', 
      spouse: '', // Would need to parse from notes
      kids: '', // Would need to parse from notes
      depositPaid: person.depositPaid || false,
      needsMet: false // Would need to check needs table
    });
    setIsEditPersonDialogOpen(true);
  };

  // Handle update person
  const handleUpdatePerson = () => {
    if (!editingPerson || !personForm.name || !personForm.role) return;
    
    // Update person with all fields
    updatePerson.mutate({ 
      personId: editingPerson.person.personId,
      name: personForm.name,
      primaryRole: personForm.role,
      status: statusMap[personForm.status],
      depositPaid: personForm.depositPaid,
      notes: personForm.notes,
    });
    
    setPersonForm({ name: '', role: 'Staff', status: 'not-invited', needType: 'Financial', needAmount: '', needDetails: '', notes: '', spouse: '', kids: '', depositPaid: false, needsMet: false });
    setIsEditPersonDialogOpen(false);
    setEditingPerson(null);
  };

  // Handle person click - cycle status
  const handlePersonClick = (campusId: number | string, person: Person) => {
    const statusCycle: Person['status'][] = ['Not Invited', 'Yes', 'Maybe', 'No'];
    const currentIndex = statusCycle.indexOf(person.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    onPersonStatusChange(person.personId, nextStatus);
  };

  // Handle edit campus
  const handleEditCampus = (campusId: number) => {
    const campus = campuses.find(c => c.id === campusId);
    if (campus) {
      setCampusForm({ name: campus.name });
      setSelectedCampusId(campusId);
      setIsEditCampusDialogOpen(true);
    }
  };

  // Handle update campus
  const handleUpdateCampus = () => {
    if (!selectedCampusId || typeof selectedCampusId !== 'number' || !campusForm.name) return;
    
    updateCampusName.mutate({ id: selectedCampusId, name: campusForm.name });
    setCampusForm({ name: '' });
    setIsEditCampusDialogOpen(false);
    setSelectedCampusId(null);
  };

  // Handle campus sort change
  const handleCampusSortChange = (campusId: number, sortBy: 'status' | 'name' | 'role') => {
    setCampusSorts(prev => ({ ...prev, [campusId]: sortBy }));
  };

  // Handle drag and drop - person move
  const handlePersonMove = (draggedId: string, draggedCampusId: number | string, targetCampusId: number | string, targetIndex: number) => {
    // Find the person
    const person = peopleWithNeeds.find(p => p.personId === draggedId);
    if (!person) return;

    // Handle moving to district director (not implemented in current API)
    if (targetCampusId === 'district') {
      console.warn('Moving to district director not yet implemented');
      return;
    }

    // Handle moving to unassigned
    if (targetCampusId === 'unassigned') {
      // Update person to remove campus
      updatePerson.mutate({
        personId: person.personId,
        primaryCampusId: null,
      });
      return;
    }

    // Handle moving to a campus
    if (typeof targetCampusId === 'number') {
      // Update person's campus
      updatePerson.mutate({
        personId: person.personId,
        primaryCampusId: targetCampusId,
      });
    }
  };

  // Handle drop on campus row
  const handleCampusRowDrop = (personId: string, fromCampusId: number | string, toCampusId: number | string) => {
    if (fromCampusId === toCampusId) return;
    handlePersonMove(personId, fromCampusId, toCampusId, 0);
  };

  // Handle drop on campus name
  const handleCampusNameDrop = (personId: string, fromCampusId: number | string, toCampusId: number | string) => {
    if (fromCampusId === toCampusId) return;
    handlePersonMove(personId, fromCampusId, toCampusId, 0);
  };

  // Handle drop on district director
  const handleDistrictDirectorDrop = (personId: string, fromCampusId: number | string) => {
    const person = districtPeople.find(p => p.personId === personId);
    if (!person) return;
    
    // Update person to be district director (set role and remove campus)
    updatePerson.mutate({
      personId: person.personId,
      primaryRole: 'District Director',
      primaryCampusId: null,
    });
  };

  // Get person for drag layer
  const getPerson = (personId: string, campusId: number | string): Person | undefined => {
    return districtPeople.find(p => p.personId === personId);
  };

  // Open add person dialog
  const openAddPersonDialog = (campusId: number | string) => {
    setSelectedCampusId(campusId);
    
    let defaultRole = 'Staff';
    if (campusId === 'unassigned') {
      if (peopleWithoutCampus.length === 0) {
        defaultRole = 'Campus Director';
      }
    } else if (campusId === 'district') {
      defaultRole = 'District Director';
    } else if (typeof campusId === 'number') {
      const campus = campusesWithPeople.find(c => c.id === campusId);
      if (campus && campus.people.length === 0) {
        defaultRole = 'Campus Director';
      }
    }
    
    setPersonForm({ name: '', role: defaultRole, status: 'director', needType: 'Financial', needAmount: '', needDetails: '', notes: '', spouse: '', kids: '', depositPaid: false, needsMet: false });
    setIsPersonDialogOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50 overflow-auto scroll-smooth">
        <div className="max-w-2xl w-full mx-auto px-6 py-6">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3 transition-shadow hover:shadow-md">
            {/* Title Section */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
              <EditableText
                value={district.name}
                onSave={(newName) => {
                  updateDistrictName.mutate({ id: district.id, name: newName });
                }}
                      className="text-2xl font-semibold text-gray-900"
                      inputClassName="text-2xl font-semibold text-gray-900"
              />
                  </h1>
                  <span className="text-gray-500 text-sm">
              <EditableText
                value={district.region}
                onSave={(newRegion) => {
                  updateDistrictRegion.mutate({ id: district.id, region: newRegion });
                }}
                      className="text-gray-500 text-sm"
                      inputClassName="text-gray-500 text-sm"
                    />
                  </span>
          </div>
                <div className="w-px h-8 bg-gray-300"></div>
                
                {/* District Director */}
                <DistrictDirectorDropZone
                  person={districtDirector}
                  onDrop={handleDistrictDirectorDrop}
                  onEdit={handleEditPerson}
                  onClick={() => {
                    if (!districtDirector) return;
                    const statusCycle: Person['status'][] = ['Not Invited', 'Yes', 'Maybe', 'No'];
                    const currentIndex = statusCycle.indexOf(districtDirector.status);
                    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
                    onPersonStatusChange(districtDirector.personId, nextStatus);
                  }}
                  onAddClick={() => openAddPersonDialog('district')}
                />
          </div>
          
              {/* Right side: Needs Summary - aligned above Maybe metric */}
              <div className="flex items-center gap-2 mr-[60px]">
                <Hand className="w-5 h-5 text-orange-500" />
                <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">Needs:</span>
                    <span className="font-semibold text-gray-900 text-sm tabular-nums">{needsSummary.totalNeeds}</span>
                </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">Total:</span>
                    <span className="font-semibold text-gray-900 text-sm tabular-nums">
                      ${(needsSummary.totalFinancial / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
              </div>
                </div>
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="flex items-center gap-8">
              {/* Pie Chart */}
              <svg width="90" height="90" viewBox="0 0 120 120" className="flex-shrink-0">
                <circle cx="60" cy="60" r="55" fill="#e5e7eb" />
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
          <div className="bg-white rounded-lg shadow-sm p-3 transition-shadow hover:shadow-md overflow-x-auto">
            <div className="space-y-3 min-w-max">
              {campusesWithPeople.map((campus) => {
                const sortedPeople = getSortedPeople(campus.people, campus.id);
                return (
                  <div key={campus.id} className="flex items-center gap-3 py-1 border-b last:border-b-0 group relative">
                    {/* Campus Name */}
                    <CampusNameDropZone campusId={campus.id} onDrop={handleCampusNameDrop}>
                      <div className="w-60 flex-shrink-0 flex items-center gap-2">
                        {/* Kebab Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === campus.id ? null : campus.id)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-all opacity-0 group-hover:opacity-100 hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openMenuId === campus.id && (
                            <>
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
                                  {(!campusSorts[campus.id] || campusSorts[campus.id] === 'status') && <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => {
                                    handleCampusSortChange(campus.id, 'name');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                >
                                  <span>Name</span>
                                  {campusSorts[campus.id] === 'name' && <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => {
                                    handleCampusSortChange(campus.id, 'role');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                >
                                  <span>Role</span>
                                  {campusSorts[campus.id] === 'role' && <Check className="w-4 h-4" />}
                                </button>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => {
                                    const campusPeople = sortedPeople;
                                    if (campusPeople.length > 0) {
                                      alert(`Cannot archive campus "${campus.name}" because it has ${campusPeople.length} person(s) assigned. Please move or remove all people first.`);
                                      setOpenMenuId(null);
                                      return;
                                    }
                                    if (confirm(`Are you sure you want to archive "${campus.name}"?`)) {
                                      archiveCampus.mutate({ id: campus.id });
                                      setOpenMenuId(null);
                                    }
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                    sortedPeople.length > 0
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-red-600 hover:bg-gray-100 cursor-pointer'
                                  }`}
                                  disabled={sortedPeople.length > 0}
                                >
                                  <Archive className="w-4 h-4" />
                                  Archive
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-gray-900 break-words">{campus.name}</h3>
                      </div>
                    </CampusNameDropZone>
                    
                    {/* Person Figures */}
                    <div className="flex-1 min-w-0">
                      <CampusDropZone campusId={campus.id} onDrop={handleCampusRowDrop}>
                        <div className="flex items-center gap-2 min-h-[60px] min-w-max">
                      {sortedPeople.map((person, index) => (
                        <PersonDropZone
                          key={`dropzone-${person.personId}`}
                          campusId={campus.id}
                          index={index}
                          onDrop={handlePersonMove}
                        >
                          <DroppablePerson
                            key={person.personId}
                            person={person}
                            campusId={campus.id}
                            index={index}
                            onEdit={handleEditPerson}
                            onClick={handlePersonClick}
                            onMove={handlePersonMove}
                            hasNeeds={person.hasNeeds}
                          />
                        </PersonDropZone>
                      ))}
                          
                          {/* Add Person Button */}
                          <button 
                            onClick={() => openAddPersonDialog(campus.id)}
                            className="flex flex-col items-center w-[50px] flex-shrink-0 group/add"
                            title="Add person"
                          >
                            {/* Plus sign in name position */}
                            <div className="relative flex items-center justify-center mb-1">
                              <Plus className="w-3 h-3 text-gray-400 opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110" strokeWidth={2.5} />
                            </div>
                            {/* Icon */}
                            <div className="relative">
                              <User className="w-10 h-10 text-gray-200 group-hover/add:text-gray-400 transition-all group-hover/add:scale-110 active:scale-95" strokeWidth={1.5} fill="none" stroke="currentColor" />
                            </div>
                          </button>
                        </div>
                      </CampusDropZone>
                    </div>
                  </div>
                );
              })}
              
              {/* Unassigned Row - Only show if there are unassigned people */}
              {peopleWithoutCampus.length > 0 && (
                 <div className="flex items-center gap-3 py-2 border-b last:border-b-0 group relative">
                  {/* Unassigned Label */}
                  <div className="w-60 flex-shrink-0 flex items-center gap-2">
                    <div className="w-6"></div> {/* Spacer for kebab menu alignment */}
                    <h3 className="font-medium text-gray-500 italic">Unassigned</h3>
                  </div>
                  
                  {/* Person Figures */}
                  <div className="flex-1 min-w-0">
                    <CampusDropZone campusId="unassigned" onDrop={handleCampusRowDrop}>
                      <div className="flex items-center gap-2 min-h-[60px] min-w-max">
                    {getSortedPeople(peopleWithoutCampus, -1).map((person, index) => (
                      <PersonDropZone
                        key={`dropzone-${person.personId}`}
                        campusId="unassigned"
                        index={index}
                        onDrop={handlePersonMove}
                      >
                        <DroppablePerson
                          key={person.personId}
                          person={person}
                          campusId="unassigned"
                          index={index}
                          onEdit={handleEditPerson}
                          onClick={handlePersonClick}
                          onMove={handlePersonMove}
                          hasNeeds={person.hasNeeds}
                        />
                      </PersonDropZone>
                    ))}
                        
                        {/* Add Person Button */}
                        <button 
                          onClick={() => openAddPersonDialog('unassigned')}
                          className="flex flex-col items-center w-[50px] flex-shrink-0 group/add"
                          title="Add person"
                        >
                          {/* Plus sign in name position */}
                          <div className="relative flex items-center justify-center mb-1">
                            <Plus className="w-3 h-3 text-gray-400 opacity-0 group-hover/add:opacity-100 transition-all group-hover/add:scale-110" strokeWidth={2.5} />
                          </div>
                          {/* Icon */}
                          <div className="relative">
                            <User className="w-10 h-10 text-gray-200 group-hover/add:text-gray-400 transition-all group-hover/add:scale-110 active:scale-95" strokeWidth={1.5} fill="none" stroke="currentColor" />
                          </div>
                        </button>
                      </div>
                    </CampusDropZone>
                  </div>
                </div>
              )}
              
              {/* Add Campus Button */}
              <button 
                onClick={() => setIsCampusDialogOpen(true)}
                className="w-60 py-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:border-gray-900 hover:text-gray-900 hover:shadow-md transition-all"
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
                  disabled={selectedCampusId === 'district'}
                  className={selectedCampusId === 'district' ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-status">Status</Label>
                <Select
                  value={personForm.status}
                  onValueChange={(value) => setPersonForm({ ...personForm, status: value as keyof typeof statusMap })}
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
                <Label htmlFor="person-need-type">Need Type</Label>
                <Select
                  value={personForm.needType}
                  onValueChange={(value) => setPersonForm({ ...personForm, needType: value as 'Financial' | 'Transportation' | 'Housing' | 'Other', needAmount: '' })}
                >
                  <SelectTrigger id="person-need-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {personForm.needType === 'Financial' && (
                <div className="space-y-2">
                  <Label htmlFor="person-need-amount">Amount ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="person-need-amount"
                      type="number"
                      value={personForm.needAmount}
                      onChange={(e) => setPersonForm({ ...personForm, needAmount: e.target.value })}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
              )}
              {(personForm.needType === 'Transportation' || personForm.needType === 'Housing' || personForm.needType === 'Other') && (
                <div className="space-y-2">
                  <Label htmlFor="person-need-details">Details</Label>
                  <Input
                    id="person-need-details"
                    value={personForm.needDetails}
                    onChange={(e) => setPersonForm({ ...personForm, needDetails: e.target.value })}
                    placeholder={`Enter ${personForm.needType.toLowerCase()} need details`}
                  />
                </div>
              )}
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
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="person-deposit-paid"
                    checked={personForm.depositPaid}
                    onCheckedChange={(checked) => setPersonForm({ ...personForm, depositPaid: checked === true })}
                  />
                  <Label htmlFor="person-deposit-paid" className="cursor-pointer">
                    Deposit Paid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="person-needs-met"
                    checked={personForm.needsMet}
                    onCheckedChange={(checked) => setPersonForm({ ...personForm, needsMet: checked === true })}
                  />
                  <Label htmlFor="person-needs-met" className="cursor-pointer">
                    Needs Met
                  </Label>
                </div>
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
                  onValueChange={(value) => setPersonForm({ ...personForm, status: value as keyof typeof statusMap })}
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
                <Label htmlFor="edit-person-need-type">Need Type</Label>
                <Select
                  value={personForm.needType}
                  onValueChange={(value) => setPersonForm({ ...personForm, needType: value as 'Financial' | 'Transportation' | 'Housing' | 'Other', needAmount: '' })}
                >
                  <SelectTrigger id="edit-person-need-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {personForm.needType === 'Financial' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-person-need-amount">Amount ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="edit-person-need-amount"
                      type="number"
                      value={personForm.needAmount}
                      onChange={(e) => setPersonForm({ ...personForm, needAmount: e.target.value })}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
              )}
              {(personForm.needType === 'Transportation' || personForm.needType === 'Housing' || personForm.needType === 'Other') && (
                <div className="space-y-2">
                  <Label htmlFor="edit-person-need-details">Details</Label>
                  <Input
                    id="edit-person-need-details"
                    value={personForm.needDetails}
                    onChange={(e) => setPersonForm({ ...personForm, needDetails: e.target.value })}
                    placeholder={`Enter ${personForm.needType.toLowerCase()} need details`}
                  />
                </div>
              )}
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
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-person-deposit-paid"
                    checked={personForm.depositPaid}
                    onCheckedChange={(checked) => setPersonForm({ ...personForm, depositPaid: checked === true })}
                  />
                  <Label htmlFor="edit-person-deposit-paid" className="cursor-pointer">
                    Deposit Paid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-person-needs-met"
                    checked={personForm.needsMet}
                    onCheckedChange={(checked) => setPersonForm({ ...personForm, needsMet: checked === true })}
                  />
                  <Label htmlFor="edit-person-needs-met" className="cursor-pointer">
                    Needs Met
                  </Label>
                </div>
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
              <Button onClick={handleAddCampus} disabled={!campusForm.name.trim() || createCampus.isPending}>
                {createCampus.isPending ? 'Adding...' : 'Add Campus'}
              </Button>
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
              <Button type="button" onClick={handleUpdateCampus} disabled={!campusForm.name.trim() || updateCampusName.isPending}>
                {updateCampusName.isPending ? 'Updating...' : 'Update Campus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Custom Drag Layer */}
        <CustomDragLayer getPerson={getPerson} />
      </div>
    </DndProvider>
  );
}
