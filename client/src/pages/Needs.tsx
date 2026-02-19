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

  const filteredNeeds =
    activeTab === "all"
      ? visibleNeeds
      : visibleNeeds.filter(
          n => n.type.toLowerCase() === activeTab.toLowerCase()
        );

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
            <Hand className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === "all"
                ? "No active requests"
                : `No ${activeTab} requests`}
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
