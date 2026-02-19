import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Hand,
  DollarSign,
  MapPin,
  CheckCircle,
  Car,
  Home,
  CreditCard,
  Plus,
  ArrowLeft,
  HelpCircle,
  Search,
  ChevronDown,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useLocation } from "wouter";
import { MakeRequestDialog } from "@/components/MakeRequestDialog";
import { GiveDialog } from "@/components/GiveDialog";

type NeedType = "Registration" | "Transportation" | "Housing" | "Other";

const NEED_TYPE_CONFIG: Record<
  NeedType,
  { icon: typeof Hand; color: string; bgColor: string }
> = {
  Registration: {
    icon: CreditCard,
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
  Transportation: {
    icon: Car,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  Housing: { icon: Home, color: "text-purple-700", bgColor: "bg-purple-50" },
  Other: {
    icon: HelpCircle,
    color: "text-gray-700",
    bgColor: "bg-gray-50",
  },
};

export default function Needs() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [resolvingNeedId, setResolvingNeedId] = useState<number | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);
  const [giveTarget, setGiveTarget] = useState<{
    personId: string;
    personName: string;
    needId: number;
    needAmount?: number | null;
    fundsReceived?: number | null;
    cashapp?: string | null;
    zelle?: string | null;
    venmo?: string | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fundingFilter, setFundingFilter] = useState<
    "all" | "unfunded" | "partial" | "funded"
  >("all");
  const [sortOrder, setSortOrder] = useState<
    "newest" | "amountDesc" | "amountAsc" | "mostFunded" | "leastFunded"
  >("newest");
  const [fundingOpen, setFundingOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const isLeader =
    user &&
    [
      "CO_DIRECTOR",
      "CAMPUS_DIRECTOR",
      "DISTRICT_DIRECTOR",
      "REGION_DIRECTOR",
      "NATIONAL_DIRECTOR",
      "NATIONAL_STAFF",
      "FIELD_DIRECTOR",
      "CMC_GO_ADMIN",
      "ADMIN",
    ].includes(user.role);

  // Single enriched query — no separate people/campuses fetch needed
  const { data: enrichedNeeds = [], isLoading: needsLoading } =
    trpc.needs.listActiveEnriched.useQuery();

  // Group by type for board view
  const visibleNeeds = enrichedNeeds.filter(
    n => n.visibility === "DISTRICT_VISIBLE"
  );

  const needsByType: Record<NeedType, typeof visibleNeeds> = {
    Registration: visibleNeeds.filter(n => n.type === "Registration"),
    Transportation: visibleNeeds.filter(n => n.type === "Transportation"),
    Housing: visibleNeeds.filter(n => n.type === "Housing"),
    Other: visibleNeeds.filter(n => n.type === "Other"),
  };

  // Summary stats
  const totalNeeded = visibleNeeds.reduce(
    (sum, n) => sum + (n.amount ?? 0),
    0
  );
  const totalFunded = visibleNeeds.reduce(
    (sum, n) => sum + (n.fundsReceived ?? 0),
    0
  );
  const fundingPercent =
    totalNeeded > 0 ? Math.min((totalFunded / totalNeeded) * 100, 100) : 0;

  const toggleNeedActive = trpc.needs.toggleActive.useMutation({
    onSuccess: () => {
      setResolvingNeedId(null);
      utils.needs.listActiveEnriched.invalidate();
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
    },
    onError: error => {
      setResolvingNeedId(null);
      toast.error(error.message || "Failed to update need status");
    },
  });

  const handleResolveNeed = (needId: number) => {
    setResolvingNeedId(needId);
    toggleNeedActive.mutate({ needId, isActive: false });
  };

  const handleGive = (item: (typeof visibleNeeds)[number]) => {
    setGiveTarget({
      personId: item.personId,
      personName: item.personName,
      needId: item.id,
      needAmount: item.amount,
      fundsReceived: item.fundsReceived,
      cashapp: item.cashapp,
      zelle: item.zelle,
      venmo: item.venmo,
    });
    setGiveDialogOpen(true);
  };

  if (loading || needsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading needs...</p>
        </div>
      </div>
    );
  }

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (activeTab !== "all" ? 1 : 0) +
    (fundingFilter !== "all" ? 1 : 0) +
    (sortOrder !== "newest" ? 1 : 0);

  const filteredNeeds = (() => {
    let result = visibleNeeds;

    // Type filter (from summary cards or dropdown)
    if (activeTab !== "all") {
      result = result.filter(
        n => n.type.toLowerCase() === activeTab.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        n =>
          n.personName.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q) ||
          (n.campusName ?? "").toLowerCase().includes(q)
      );
    }

    // Funding status filter
    if (fundingFilter === "unfunded") {
      result = result.filter(n => !n.fundsReceived || n.fundsReceived === 0);
    } else if (fundingFilter === "partial") {
      result = result.filter(
        n =>
          (n.fundsReceived ?? 0) > 0 &&
          n.amount != null &&
          (n.fundsReceived ?? 0) < n.amount
      );
    } else if (fundingFilter === "funded") {
      result = result.filter(
        n => n.amount != null && (n.fundsReceived ?? 0) >= n.amount
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case "amountDesc":
          return (b.amount ?? 0) - (a.amount ?? 0);
        case "amountAsc":
          return (a.amount ?? 0) - (b.amount ?? 0);
        case "mostFunded": {
          const pctA =
            a.amount && a.amount > 0 ? (a.fundsReceived ?? 0) / a.amount : 0;
          const pctB =
            b.amount && b.amount > 0 ? (b.fundsReceived ?? 0) / b.amount : 0;
          return pctB - pctA;
        }
        case "leastFunded": {
          const pctA2 =
            a.amount && a.amount > 0 ? (a.fundsReceived ?? 0) / a.amount : 0;
          const pctB2 =
            b.amount && b.amount > 0 ? (b.fundsReceived ?? 0) / b.amount : 0;
          return pctA2 - pctB2;
        }
        case "newest":
        default:
          return b.id - a.id;
      }
    });

    return result;
  })();

  const renderNeedCard = (item: (typeof visibleNeeds)[number]) => {
    const config =
      NEED_TYPE_CONFIG[item.type as NeedType] ?? NEED_TYPE_CONFIG.Other;
    const Icon = config.icon;
    const fundedPercent =
      item.amount && item.amount > 0
        ? Math.min(((item.fundsReceived ?? 0) / item.amount) * 100, 100)
        : 0;
    const isFunded = item.amount && (item.fundsReceived ?? 0) >= item.amount;

    return (
      <Card
        key={item.id}
        className={`hover:shadow-md transition-shadow ${isFunded ? "opacity-60" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}
            >
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate">
                    {item.personName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs capitalize shrink-0"
                  >
                    {item.type}
                  </Badge>
                </div>
                {isFunded && (
                  <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                    Funded
                  </Badge>
                )}
              </div>

              {/* Campus */}
              {item.campusName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  {item.campusName}
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {item.description}
              </p>

              {/* Funding progress */}
              {item.amount != null && item.amount > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      ${((item.fundsReceived ?? 0) / 100).toFixed(0)} of $
                      {(item.amount / 100).toFixed(0)}
                    </span>
                    <span className="font-medium">
                      {Math.round(fundedPercent)}%
                    </span>
                  </div>
                  <Progress value={fundedPercent} className="h-2" />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!isFunded && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs"
                    onClick={() => handleGive(item)}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Give
                  </Button>
                )}
                {isLeader && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleResolveNeed(item.id)}
                    disabled={resolvingNeedId === item.id}
                  >
                    {resolvingNeedId === item.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Sticky top bar matching Home toolbar style */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-tight">Needs Board</h1>
              <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                Coordinate registration, transportation, housing & more
              </p>
            </div>
          </div>
          <Button
            onClick={() => setRequestDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white h-9 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Make Request
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-4 px-4 sm:px-6">

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        {/* Search row */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, campus, or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[40px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Funding Status dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFundingOpen(!fundingOpen);
                setSortOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium min-h-[40px] ${
                fundingFilter !== "all"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {fundingFilter === "all"
                ? "Funding"
                : fundingFilter === "unfunded"
                  ? "Needs Funding"
                  : fundingFilter === "partial"
                    ? "Partially Funded"
                    : "Fully Funded"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {fundingOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFundingOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {(
                    [
                      ["all", "All"],
                      ["unfunded", "Needs Funding"],
                      ["partial", "Partially Funded"],
                      ["funded", "Fully Funded"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setFundingFilter(
                          value as "all" | "unfunded" | "partial" | "funded"
                        );
                        setFundingOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                        fundingFilter === value
                          ? "bg-red-50 text-red-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                      {fundingFilter === value && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortOpen(!sortOpen);
                setFundingOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium min-h-[40px] ${
                sortOrder !== "newest"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {sortOrder === "newest"
                ? "Sort"
                : sortOrder === "amountDesc"
                  ? "Amount ↓"
                  : sortOrder === "amountAsc"
                    ? "Amount ↑"
                    : sortOrder === "mostFunded"
                      ? "Most Funded"
                      : "Least Funded"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {(
                    [
                      ["newest", "Newest First"],
                      ["amountDesc", "Amount (High → Low)"],
                      ["amountAsc", "Amount (Low → High)"],
                      ["mostFunded", "Most Funded"],
                      ["leastFunded", "Least Funded"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSortOrder(
                          value as
                            | "newest"
                            | "amountDesc"
                            | "amountAsc"
                            | "mostFunded"
                            | "leastFunded"
                        );
                        setSortOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                        sortOrder === value
                          ? "bg-red-50 text-red-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                      {sortOrder === value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Active filter count + clear */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
                setFundingFilter("all");
                setSortOrder("newest");
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg min-h-[40px]"
            >
              <X className="w-4 h-4" />
              Clear {activeFilterCount} filter
              {activeFilterCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.keys(needsByType) as NeedType[]).map(type => {
          const config = NEED_TYPE_CONFIG[type];
          const Icon = config.icon;
          const count = needsByType[type].length;
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                activeTab === type.toLowerCase() ? "ring-2 ring-red-500" : ""
              }`}
              onClick={() =>
                setActiveTab(
                  activeTab === type.toLowerCase() ? "all" : type.toLowerCase()
                )
              }
            >
              <CardContent className="p-3 sm:p-4 text-center">
                <Icon className={`h-6 w-6 ${config.color} mx-auto mb-1`} />
                <div className="text-lg sm:text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{type}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Funding overview */}
      {totalNeeded > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">
                Total Funding Progress
              </span>
              <span className="text-sm text-muted-foreground">
                ${(totalFunded / 100).toFixed(0)} of $
                {(totalNeeded / 100).toFixed(0)}
              </span>
            </div>
            <Progress value={fundingPercent} className="h-3" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {enrichedNeeds.length} active request
                {enrichedNeeds.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs font-medium">
                {Math.round(fundingPercent)}% funded
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs List / Board View */}
      {filteredNeeds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {searchQuery.trim() || fundingFilter !== "all" || activeTab !== "all" ? (
              <>
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No matching requests
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Try adjusting your search or filters.
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                    setFundingFilter("all");
                    setSortOrder("newest");
                  }}
                  variant="outline"
                  className="min-h-[44px]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <Hand className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No active requests
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {isLeader
                    ? "Click 'Make Request' to create one, or set visibility to 'District Visible'."
                    : "Check back later for community requests."}
                </p>
                <Button
                  onClick={() => setRequestDialogOpen(true)}
                  variant="outline"
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Make Request
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredNeeds.map(renderNeedCard)}
        </div>
      )}

      {/* Dialogs */}
      <MakeRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
      />
      {giveTarget && (
        <GiveDialog
          open={giveDialogOpen}
          onOpenChange={setGiveDialogOpen}
          personId={giveTarget.personId}
          personName={giveTarget.personName}
          needId={giveTarget.needId}
          needAmount={giveTarget.needAmount}
          fundsReceived={giveTarget.fundsReceived}
          cashapp={giveTarget.cashapp}
          zelle={giveTarget.zelle}
          venmo={giveTarget.venmo}
        />
      )}
      </main>
    </div>
  );
}
