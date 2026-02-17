import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Mail,
  Search,
  Download,
  AlertTriangle,
  Users,
  MessageSquare,
  Loader2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ContactFilter =
  | "all"
  | "has-phone"
  | "has-email"
  | "missing-phone"
  | "missing-email"
  | "missing-any";

interface ContactRow {
  personId: string;
  name: string;
  phone: string | null;
  email: string | null;
  primaryRole: string | null;
  status: string;
  campusName: string | null;
  districtId: string | null;
  districtName: string | null;
  region: string | null;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function ContactsSheet() {
  const utils = trpc.useUtils();
  const { data: contacts = [], isLoading } = trpc.contacts.list.useQuery();
  const updateContact = trpc.contacts.updateContact.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      toast.success("Contact updated");
    },
    onError: err => toast.error(`Failed: ${err.message}`),
  });

  // Filters & search
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ContactFilter>("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [campusFilter, setCampusFilter] = useState("all");

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Unique filter options
  const regions = useMemo(
    () =>
      [
        ...new Set(contacts.map(c => c.region).filter(Boolean)),
      ].sort() as string[],
    [contacts]
  );
  const districtsForRegion = useMemo(
    () =>
      [
        ...new Set(
          contacts
            .filter(c => regionFilter === "all" || c.region === regionFilter)
            .map(c => c.districtName)
            .filter(Boolean)
        ),
      ].sort() as string[],
    [contacts, regionFilter]
  );
  const campusesForDistrict = useMemo(
    () =>
      [
        ...new Set(
          contacts
            .filter(c => {
              if (regionFilter !== "all" && c.region !== regionFilter)
                return false;
              if (districtFilter !== "all" && c.districtName !== districtFilter)
                return false;
              return true;
            })
            .map(c => c.campusName)
            .filter(Boolean)
        ),
      ].sort() as string[],
    [contacts, regionFilter, districtFilter]
  );

  // Apply filters
  const filtered = useMemo(() => {
    let result = contacts;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.campusName?.toLowerCase().includes(q) ||
          c.districtName?.toLowerCase().includes(q)
      );
    }

    // Contact filters
    switch (filterType) {
      case "has-phone":
        result = result.filter(c => c.phone);
        break;
      case "has-email":
        result = result.filter(c => c.email);
        break;
      case "missing-phone":
        result = result.filter(c => !c.phone);
        break;
      case "missing-email":
        result = result.filter(c => !c.email);
        break;
      case "missing-any":
        result = result.filter(c => !c.phone || !c.email);
        break;
    }

    // Hierarchy filters
    if (regionFilter !== "all")
      result = result.filter(c => c.region === regionFilter);
    if (districtFilter !== "all")
      result = result.filter(c => c.districtName === districtFilter);
    if (campusFilter !== "all")
      result = result.filter(c => c.campusName === campusFilter);

    return result;
  }, [
    contacts,
    search,
    filterType,
    regionFilter,
    districtFilter,
    campusFilter,
  ]);

  // Group by region → district → campus for the table
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, ContactRow[]>>>();
    for (const c of filtered) {
      const r = c.region ?? "Unassigned";
      const d = c.districtName ?? "Unassigned";
      const camp = c.campusName ?? "Unassigned";
      if (!map.has(r)) map.set(r, new Map());
      const rMap = map.get(r)!;
      if (!rMap.has(d)) rMap.set(d, new Map());
      const dMap = rMap.get(d)!;
      if (!dMap.has(camp)) dMap.set(camp, []);
      dMap.get(camp)!.push(c);
    }
    return map;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const total = contacts.length;
    const withPhone = contacts.filter(c => c.phone).length;
    const withEmail = contacts.filter(c => c.email).length;
    return {
      total,
      withPhone,
      withEmail,
      missingPhone: total - withPhone,
      missingEmail: total - withEmail,
    };
  }, [contacts]);

  // Selection helpers
  const toggleSelect = useCallback((personId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(filtered.map(c => c.personId)));
  }, [filtered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Inline edit handlers
  const startEdit = useCallback((contact: ContactRow) => {
    setEditingId(contact.personId);
    setEditPhone(contact.phone ?? "");
    setEditEmail(contact.email ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditPhone("");
    setEditEmail("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    updateContact.mutate({
      personId: editingId,
      phone: editPhone || null,
      email: editEmail || null,
    });
    setEditingId(null);
  }, [editingId, editPhone, editEmail, updateContact]);

  // Bulk actions
  const selectedContacts = useMemo(
    () => contacts.filter(c => selected.has(c.personId)),
    [contacts, selected]
  );

  const handleBulkEmail = useCallback(() => {
    const emails = selectedContacts
      .map(c => c.email)
      .filter(Boolean) as string[];
    if (emails.length === 0) {
      toast.error("No email addresses in selection");
      return;
    }
    // Open mailto with BCC (to avoid showing all addresses)
    const mailto = `mailto:?bcc=${emails.join(",")}`;
    window.open(mailto, "_blank", "noopener");
    toast.success(`Opening email to ${emails.length} contacts`);
  }, [selectedContacts]);

  const handleBulkText = useCallback(() => {
    const phones = selectedContacts
      .map(c => c.phone)
      .filter(Boolean) as string[];
    if (phones.length === 0) {
      toast.error("No phone numbers in selection");
      return;
    }
    // Copy phone numbers to clipboard for pasting into a messaging app
    navigator.clipboard
      .writeText(phones.join(", "))
      .then(() =>
        toast.success(
          `Copied ${phones.length} phone numbers to clipboard — paste into your messaging app`
        )
      )
      .catch(() => toast.error("Failed to copy phone numbers"));
  }, [selectedContacts]);

  const handleExportCSV = useCallback(() => {
    const header = "Name,Phone,Email,Role,Status,Campus,District,Region";
    const rows = filtered.map(c =>
      [
        c.name,
        c.phone,
        c.email,
        c.primaryRole,
        c.status,
        c.campusName,
        c.districtName,
        c.region,
      ]
        .map(csvEscape)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success(`Exported ${filtered.length} contacts`);
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Has Phone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">
              {stats.withPhone}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Has Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">
              {stats.withEmail}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Missing Phone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">
              {stats.missingPhone}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Missing Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">
              {stats.missingEmail}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, phone, email, campus..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Contact filter */}
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Filter
              </label>
              <Select
                value={filterType}
                onValueChange={v => setFilterType(v as ContactFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="has-phone">Has Phone</SelectItem>
                  <SelectItem value="has-email">Has Email</SelectItem>
                  <SelectItem value="missing-phone">Missing Phone</SelectItem>
                  <SelectItem value="missing-email">Missing Email</SelectItem>
                  <SelectItem value="missing-any">Missing Any</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Region
              </label>
              <Select
                value={regionFilter}
                onValueChange={v => {
                  setRegionFilter(v);
                  setDistrictFilter("all");
                  setCampusFilter("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                District
              </label>
              <Select
                value={districtFilter}
                onValueChange={v => {
                  setDistrictFilter(v);
                  setCampusFilter("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districtsForRegion.map(d => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campus filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Campus
              </label>
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campusesForDistrict.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={selectAllVisible}>
          Select All ({filtered.length})
        </Button>
        {selected.size > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear ({selected.size})
            </Button>
            <Button size="sm" onClick={handleBulkEmail} className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email Selected ({selectedContacts.filter(c => c.email).length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkText}
              className="gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Copy Phones ({selectedContacts.filter(c => c.phone).length})
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Contact table grouped by region → district → campus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Contacts
            <Badge variant="secondary" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Organized by region, district, and campus. Click the edit icon to
            add or update contact info.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-10 px-3 py-2">
                    <Checkbox
                      checked={
                        selected.size === filtered.length && filtered.length > 0
                      }
                      onCheckedChange={checked =>
                        checked ? selectAllVisible() : clearSelection()
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Phone</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="w-16 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...grouped.entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([region, districtMap]) => (
                    <>
                      {/* Region header */}
                      <tr key={`r-${region}`} className="bg-slate-100">
                        <td
                          colSpan={7}
                          className="px-3 py-1.5 font-semibold text-slate-700 text-xs uppercase tracking-wide"
                        >
                          {region}
                        </td>
                      </tr>

                      {[...districtMap.entries()]
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([district, campusMap]) => (
                          <>
                            {/* District header */}
                            <tr
                              key={`d-${region}-${district}`}
                              className="bg-slate-50"
                            >
                              <td
                                colSpan={7}
                                className="pl-6 px-3 py-1 font-medium text-slate-600 text-xs"
                              >
                                {district}
                              </td>
                            </tr>

                            {[...campusMap.entries()]
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([campus, people]) => (
                                <>
                                  {/* Campus header */}
                                  <tr
                                    key={`c-${region}-${district}-${campus}`}
                                    className="bg-white"
                                  >
                                    <td
                                      colSpan={7}
                                      className="pl-10 px-3 py-1 text-xs text-muted-foreground italic"
                                    >
                                      {campus}
                                    </td>
                                  </tr>

                                  {people
                                    .sort((a, b) =>
                                      a.name.localeCompare(b.name)
                                    )
                                    .map(contact => (
                                      <tr
                                        key={contact.personId}
                                        className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${
                                          !contact.phone || !contact.email
                                            ? "bg-amber-50/30"
                                            : ""
                                        }`}
                                      >
                                        <td className="px-3 py-1.5">
                                          <Checkbox
                                            checked={selected.has(
                                              contact.personId
                                            )}
                                            onCheckedChange={() =>
                                              toggleSelect(contact.personId)
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-1.5 font-medium">
                                          {contact.name}
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground text-xs">
                                          {contact.primaryRole ?? "—"}
                                        </td>

                                        {/* Phone & Email — inline editable */}
                                        {editingId === contact.personId ? (
                                          <>
                                            <td className="px-3 py-1">
                                              <Input
                                                value={editPhone}
                                                onChange={e =>
                                                  setEditPhone(e.target.value)
                                                }
                                                placeholder="Phone"
                                                className="h-7 text-xs"
                                              />
                                            </td>
                                            <td className="px-3 py-1">
                                              <Input
                                                value={editEmail}
                                                onChange={e =>
                                                  setEditEmail(e.target.value)
                                                }
                                                placeholder="Email"
                                                className="h-7 text-xs"
                                              />
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="px-3 py-1.5">
                                              {contact.phone ? (
                                                <a
                                                  href={`tel:${contact.phone}`}
                                                  className="text-blue-600 hover:underline text-xs"
                                                >
                                                  {contact.phone}
                                                </a>
                                              ) : (
                                                <span className="text-amber-500/70 text-xs flex items-center gap-1">
                                                  <AlertTriangle className="h-3 w-3" />{" "}
                                                  missing
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-1.5">
                                              {contact.email ? (
                                                <a
                                                  href={`mailto:${contact.email}`}
                                                  className="text-blue-600 hover:underline text-xs"
                                                >
                                                  {contact.email}
                                                </a>
                                              ) : (
                                                <span className="text-amber-500/70 text-xs flex items-center gap-1">
                                                  <AlertTriangle className="h-3 w-3" />{" "}
                                                  missing
                                                </span>
                                              )}
                                            </td>
                                          </>
                                        )}

                                        <td className="px-3 py-1.5">
                                          <Badge
                                            variant={
                                              contact.status === "Yes"
                                                ? "default"
                                                : contact.status === "Maybe"
                                                  ? "secondary"
                                                  : "outline"
                                            }
                                            className="text-[10px]"
                                          >
                                            {contact.status}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {editingId === contact.personId ? (
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={saveEdit}
                                                disabled={
                                                  updateContact.isPending
                                                }
                                              >
                                                <Check className="h-3.5 w-3.5 text-green-600" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={cancelEdit}
                                              >
                                                <X className="h-3.5 w-3.5 text-red-500" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => startEdit(contact)}
                                            >
                                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                </>
                              ))}
                          </>
                        ))}
                    </>
                  ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No contacts match filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
