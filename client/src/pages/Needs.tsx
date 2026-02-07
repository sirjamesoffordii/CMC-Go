import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hand, DollarSign, MapPin, User, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { PersonDetailsDialog } from "@/components/PersonDetailsDialog";
import { Person } from "../../../drizzle/schema";

export default function Needs() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [resolvingNeedId, setResolvingNeedId] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if user is a leader
  const isLeader =
    user &&
    [
      "CO_DIRECTOR",
      "CAMPUS_DIRECTOR",
      "DISTRICT_DIRECTOR",
      "REGION_DIRECTOR",
      "ADMIN",
    ].includes(user.role);

  // Fetch DISTRICT_VISIBLE needs
  const { data: allNeeds = [], isLoading: needsLoading } =
    trpc.needs.listActive.useQuery();
  const { data: allPeople = [] } = trpc.people.list.useQuery();
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery();

  // Filter to DISTRICT_VISIBLE needs only
  const districtVisibleNeeds = allNeeds.filter(
    need => need.visibility === "DISTRICT_VISIBLE"
  );

  // Enrich needs with person and campus info
  const enrichedNeeds = districtVisibleNeeds
    .map(need => {
      const person = allPeople.find(p => p.personId === need.personId);
      const campus = person?.primaryCampusId
        ? allCampuses.find(c => c.id === person.primaryCampusId)
        : null;
      return {
        ...need,
        person,
        campus,
      };
    })
    .filter(item => item.person); // Only show needs for people we can see

  const toggleNeedActive = trpc.needs.toggleActive.useMutation({
    onSuccess: () => {
      setResolvingNeedId(null);
      utils.needs.listActive.invalidate();
      utils.followUp.list.invalidate();
      utils.people.list.invalidate();
    },
  });

  const handleResolveNeed = async (needId: number) => {
    setResolvingNeedId(needId);
    toggleNeedActive.mutate({ needId, isActive: false });
  };

  if (loading || needsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication disabled - allow all users to view needs
  if (false) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view requests.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">District Needs</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Requests that can be mobilized by the community
          </p>
        </div>
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          size="sm"
          className="text-black hover:bg-red-600 hover:text-white self-start sm:self-auto flex-shrink-0"
        >
          Back to Map
        </Button>
      </div>

      {enrichedNeeds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Hand className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              No district-visible requests
            </p>
            <p className="text-sm text-gray-500">
              {isLeader
                ? "Create requests and set them to 'District Visible' to mobilize the community."
                : "Check back later for requests that need community support."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enrichedNeeds.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                    {/* Person & Campus Info */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-semibold text-base sm:text-lg">
                          {item.person?.name}
                        </span>
                      </div>
                      {item.campus && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{item.campus.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Need Details */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {item.type}
                        </Badge>
                        {item.amount && (
                          <div className="flex items-center gap-1 text-sm font-medium text-green-700">
                            <DollarSign className="h-4 w-4" />
                            <span>${(item.amount / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-gray-700">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    {isLeader && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveNeed(item.id)}
                        disabled={resolvingNeedId === item.id}
                        className="touch-target flex-1 sm:flex-auto"
                      >
                        {resolvingNeedId === item.id ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (item.person) {
                          setSelectedPerson(item.person);
                          setDialogOpen(true);
                        }
                      }}
                      className="touch-target flex-1 sm:flex-auto"
                    >
                      View Person
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PersonDetailsDialog
        person={selectedPerson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
