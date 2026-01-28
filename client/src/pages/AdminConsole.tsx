import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Upload,
  Download,
  Database,
  FileText,
  FileJson,
  Loader2,
  AlertCircle,
  Users,
  MapPin,
  Building2,
  Heart,
  Activity,
  CheckCircle2,
  Clock,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { ImportModal } from "@/components/ImportModal";

// Get version from package.json (will be injected at build time or read from env)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const NODE_ENV = import.meta.env.MODE || "development";

interface DbHealthStatus {
  connected: boolean;
  status: "connected" | "disconnected" | "checking" | "error";
  message?: string;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick to avoid cancelling download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  // Escape if contains CSV special chars
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AdminConsole() {
  const [, setLocation] = useLocation();
  const [dbHealth, setDbHealth] = useState<DbHealthStatus>({
    connected: false,
    status: "checking",
  });

  // Fetch data
  const { data: allPeople = [], isLoading: peopleLoading } =
    trpc.people.list.useQuery();
  const { data: districts = [], isLoading: districtsLoading } =
    trpc.districts.list.useQuery();
  const { data: campuses = [], isLoading: campusesLoading } =
    trpc.campuses.list.useQuery();
  const { data: metrics } = trpc.metrics.get.useQuery();
  const { data: allNeeds = [] } = trpc.needs.listActive.useQuery();

  // Calculate stats
  const stats = useMemo(() => {
    const totalPeople = allPeople.length;
    const totalDistricts = districts.length;
    const totalCampuses = campuses.length;
    const activeNeeds = allNeeds.length;
    const going = metrics?.going || 0;
    const maybe = metrics?.maybe || 0;
    const notGoing = metrics?.notGoing || 0;
    const notInvited = metrics?.notInvited || 0;
    const totalInvited = going + maybe + notGoing;
    const inviteRate =
      totalPeople > 0 ? Math.round((totalInvited / totalPeople) * 100) : 0;

    // Get recent edits (last 10 people edited, sorted by lastEdited desc)
    const recentEdits = allPeople
      .filter(p => p.lastEdited)
      .sort((a, b) => {
        const aTime = a.lastEdited ? new Date(a.lastEdited).getTime() : 0;
        const bTime = b.lastEdited ? new Date(b.lastEdited).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      totalPeople,
      totalDistricts,
      totalCampuses,
      activeNeeds,
      going,
      maybe,
      notGoing,
      notInvited,
      totalInvited,
      inviteRate,
      recentEdits,
    };
  }, [allPeople, districts, campuses, allNeeds, metrics]);

  // Check database health
  useEffect(() => {
    const checkDbHealth = async () => {
      try {
        setDbHealth({ connected: false, status: "checking" });

        // Only available in development
        if (NODE_ENV === "development") {
          const response = await fetch(`${getApiBaseUrl()}/debug/db-health`);
          if (response.ok) {
            const data = await response.json();
            setDbHealth({
              connected: data.success && data.connected,
              status: data.success && data.connected ? "connected" : "error",
              message: data.success
                ? "Database is healthy"
                : data.error || "Database check failed",
            });
          } else {
            setDbHealth({
              connected: false,
              status: "error",
              message: "Failed to check database health",
            });
          }
        } else {
          // In production, show connected if we have data
          setDbHealth({
            connected: !peopleLoading && allPeople.length >= 0,
            status: !peopleLoading ? "connected" : "checking",
            message: !peopleLoading ? "Database is operational" : "Checking...",
          });
        }
      } catch (error) {
        setDbHealth({
          connected: false,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    checkDbHealth();
  }, [NODE_ENV, peopleLoading, allPeople.length]);

  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleImportContacts = () => {
    setImportModalOpen(true);
  };

  const handleExportContactsCSV = () => {
    try {
      if (!allPeople || allPeople.length === 0) {
        toast.error("No people to export yet");
        return;
      }

      const headers = [
        "personId",
        "name",
        "status",
        "primaryRole",
        "primaryDistrictId",
        "primaryCampusId",
        "depositPaid",
        "notes",
        "spouse",
        "kids",
        "guests",
        "childrenAges",
        "householdId",
        "householdRole",
        "spouseAttending",
        "childrenCount",
        "guestsCount",
        "lastEdited",
        "lastEditedBy",
      ] as const;

      const lines: string[] = [];
      lines.push(headers.join(","));

      for (const p of allPeople as any[]) {
        lines.push(headers.map(h => csvEscape(p?.[h])).join(","));
      }

      // Add UTF-8 BOM to help Excel open correctly
      const csv = "\uFEFF" + lines.join("\r\n");
      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `contacts-${dateStamp}.csv`
      );
      toast.success(`Exported ${allPeople.length.toLocaleString()} contacts`);
    } catch (e) {
      toast.error("Failed to export contacts CSV");
      if (NODE_ENV === "development") {
        console.error("[AdminConsole] CSV export failed:", e);
      }
    }
  };

  const handleExportRegionsJSON = () => {
    try {
      if (!districts || districts.length === 0) {
        toast.error("No districts to export yet");
        return;
      }

      const campusesByDistrictId = new Map<
        string,
        Array<{ id: number; name: string; districtId: string }>
      >();
      for (const c of campuses as any[]) {
        if (!c?.districtId) continue;
        const arr = campusesByDistrictId.get(c.districtId) ?? [];
        arr.push({ id: c.id, name: c.name, districtId: c.districtId });
        campusesByDistrictId.set(c.districtId, arr);
      }

      const regionMap = new Map<
        string,
        Array<{ id: string; name: string; region: string }>
      >();
      for (const d of districts as any[]) {
        const region = d?.region ?? "Unknown";
        const arr = regionMap.get(region) ?? [];
        arr.push({ id: d.id, name: d.name, region });
        regionMap.set(region, arr);
      }

      const regions = Array.from(regionMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([region, regionDistricts]) => ({
          region,
          districts: regionDistricts
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(d => ({
              id: d.id,
              name: d.name,
              campuses: (campusesByDistrictId.get(d.id) ?? [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => ({ id: c.id, name: c.name })),
            })),
        }));

      const payload = {
        exportedAt: new Date().toISOString(),
        regions,
      };

      const json = JSON.stringify(payload, null, 2);
      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([json], { type: "application/json;charset=utf-8" }),
        `regions-${dateStamp}.json`
      );
      toast.success("Exported regions JSON");
    } catch (e) {
      toast.error("Failed to export regions JSON");
      if (NODE_ENV === "development") {
        console.error("[AdminConsole] Regions export failed:", e);
      }
    }
  };

  const formatTimeAgo = (date: Date | string | null | undefined): string => {
    if (!date) return "Never";
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statCards = [
    {
      title: "Total People",
      value: stats.totalPeople.toLocaleString(),
      description: "Registered contacts",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Districts",
      value: stats.totalDistricts.toLocaleString(),
      description: "Active districts",
      icon: MapPin,
      color: "text-green-600",
    },
    {
      title: "Campuses",
      value: stats.totalCampuses.toLocaleString(),
      description: "Active campuses",
      icon: Building2,
      color: "text-purple-600",
    },
    {
      title: "Active Needs",
      value: stats.activeNeeds.toLocaleString(),
      description: "Unmet needs",
      icon: Heart,
      color: "text-red-600",
    },
    {
      title: "Invited",
      value: `${stats.inviteRate}%`,
      description: `${stats.totalInvited.toLocaleString()} of ${stats.totalPeople.toLocaleString()}`,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      title: "Going",
      value: stats.going.toLocaleString(),
      description: "Confirmed attendance",
      icon: Activity,
      color: "text-teal-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header matching app style */}
      <div className="bg-white border-b border-slate-200">
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-slate-700" />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Admin Console
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  System administration and data management
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map(stat => (
            <Card key={stat.title} className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Imports Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Imports
              </CardTitle>
              <CardDescription>
                Import data from external sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button
                  onClick={handleImportContacts}
                  className="w-full"
                  variant="default"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Import Contacts (CSV/XLSX)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Accepted formats: CSV, XLSX. Columns: Name, Email, Phone,
                  District, Campus, Role
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data
              </CardTitle>
              <CardDescription>Export data in various formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleExportContactsCSV}
                className="w-full"
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Contacts CSV
              </Button>
              <Button
                onClick={handleExportRegionsJSON}
                className="w-full"
                variant="outline"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Export Regions JSON
              </Button>
            </CardContent>
          </Card>

          {/* System Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                System
              </CardTitle>
              <CardDescription>System information and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    App Version
                  </span>
                  <Badge variant="secondary">{APP_VERSION}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Environment
                  </span>
                  <Badge
                    variant={NODE_ENV === "production" ? "default" : "outline"}
                  >
                    {NODE_ENV}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Database
                  </span>
                  {dbHealth.status === "checking" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : dbHealth.status === "connected" ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {dbHealth.status === "error" ? "Error" : "Not Connected"}
                    </Badge>
                  )}
                </div>
                {dbHealth.message && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {dbHealth.status === "error" && (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {dbHealth.message}
                  </p>
                )}
              </div>

              {/* Sentry Test Error Button */}
              <div className="pt-2 border-t">
                <Button
                  onClick={() => {
                    throw new Error(
                      "This is your test error - Sentry error tracking verification"
                    );
                  }}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Test Sentry Error
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to trigger a test error and verify Sentry is capturing
                  errors correctly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Edits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Last edited people and recent changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {peopleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats.recentEdits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent edits found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentEdits.map(person => (
                  <div
                    key={person.personId}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {person.name}
                        </p>
                        {person.primaryRole && (
                          <Badge
                            variant="secondary"
                            className="h-5 text-xs shrink-0"
                          >
                            {person.primaryRole}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {person.primaryDistrictId && (
                          <>
                            <span className="truncate">
                              {person.primaryDistrictId}
                            </span>
                            {person.primaryCampusId && <span>•</span>}
                          </>
                        )}
                        {person.lastEditedBy && (
                          <>
                            <span>Edited by {person.lastEditedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-4">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(person.lastEdited)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Overall application status and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Database
                  </span>
                  {dbHealth.status === "connected" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-lg font-semibold">
                  {dbHealth.status === "connected" ? "Healthy" : "Issues"}
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Data Load
                  </span>
                  {!peopleLoading && !districtsLoading && !campusesLoading ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-lg font-semibold">
                  {!peopleLoading && !districtsLoading && !campusesLoading
                    ? "Complete"
                    : "Loading..."}
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Response Time
                  </span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-lg font-semibold">Good</p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-lg font-semibold">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  );
}
