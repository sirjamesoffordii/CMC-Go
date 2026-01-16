/**
 * Login/Registration Modal - PR 2
 * Handles self-registration with email verification
 */

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"email" | "register">("email");
  const [emailStepError, setEmailStepError] = useState<string | null>(null);
  const [startStep, setStartStep] = useState<"region" | "district" | "campus" | "role" | "name">("region");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"STAFF" | "CO_DIRECTOR" | "CAMPUS_DIRECTOR" | "DISTRICT_DIRECTOR" | "REGION_DIRECTOR">("STAFF");
  const [region, setRegion] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [regionInput, setRegionInput] = useState("");
  const [districtInput, setDistrictInput] = useState("");
  const [campusInput, setCampusInput] = useState("");
  const [regionSuggestionsOpen, setRegionSuggestionsOpen] = useState(false);
  const [districtSuggestionsOpen, setDistrictSuggestionsOpen] = useState(false);
  const [campusSuggestionsOpen, setCampusSuggestionsOpen] = useState(false);
  
  const { data: districts = [] } = trpc.districts.publicList.useQuery();
  const { data: campuses = [] } = trpc.campuses.byDistrict.useQuery(
    { districtId: districtId ?? "" },
    { enabled: !!districtId }
  );
  const createCampusMutation = trpc.campuses.createPublic.useMutation();

  const regions = useMemo(() => {
    const regionSet = new Set(districts.map((district) => district.region).filter(Boolean));
    return Array.from(regionSet).sort();
  }, [districts]);

  const filteredRegions = useMemo(() => {
    const query = regionInput.trim().toLowerCase();
    return regions.filter((regionName) => regionName.toLowerCase().includes(query));
  }, [regions, regionInput]);

  const filteredDistricts = useMemo(() => {
    const query = districtInput.trim().toLowerCase();
    return districts.filter((district) =>
      region ? district.region === region && district.name.toLowerCase().includes(query) : false
    );
  }, [districts, region, districtInput]);

  const filteredCampuses = useMemo(() => {
    const query = campusInput.trim().toLowerCase();
    return campuses.filter((campus) => campus.name.toLowerCase().includes(query));
  }, [campuses, campusInput]);

  const selectedDistrict = districts.find((district) => district.id === districtId) || null;
  const selectedCampus = campuses.find((campus) => campus.id === campusId) || null;

  const goToStartStep = (nextStep: "region" | "district" | "campus" | "role" | "name") => {
    if (isTransitioning || nextStep === startStep) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setStartStep(nextStep);
      setTimeout(() => setIsTransitioning(false), 200);
    }, 200);
  };
  
  const startMutation = trpc.auth.start.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onOpenChange(false);
      // Reset form
      setMode("email");
      setStartStep("region");
      setEmail("");
      setFullName("");
      setRole("STAFF");
      setRegion(null);
      setRegionInput("");
      setDistrictId(null);
      setDistrictInput("");
      setCampusId(null);
      setCampusInput("");
      setEmailStepError(null);
    },
  });

  useEffect(() => {
    if (open) return;
    // Reset when modal closes (even if user cancels)
    setMode("email");
    setStartStep("region");
    setIsTransitioning(false);
    setEmail("");
    setFullName("");
    setRole("STAFF");
    setRegion(null);
    setRegionInput("");
    setDistrictId(null);
    setDistrictInput("");
    setCampusId(null);
    setCampusInput("");
    setEmailStepError(null);
  }, [open]);

  const handleCreateCampus = async () => {
    if (!districtId || !campusInput.trim()) return;
    const result = await createCampusMutation.mutateAsync({
      name: campusInput.trim(),
      districtId,
    });
    setCampusId(result.id);
    setCampusInput(result.name);
    setCampusSuggestionsOpen(false);
  };
  
  const handleStart = () => {
    if (!email || !fullName || !role || !campusId) {
      return;
    }
    startMutation.mutate({
      fullName,
      email,
      role,
      campusId,
    });
  };

  const handleEmailContinue = async () => {
    const trimmedEmail = email.trim();
    setEmailStepError(null);
    if (!trimmedEmail) {
      setEmailStepError("Please enter your email.");
      return;
    }

    try {
      const { exists } = await utils.auth.emailExists.fetch({ email: trimmedEmail });
      if (exists) {
        await startMutation.mutateAsync({ email: trimmedEmail });
        return;
      }

      setMode("register");
      setStartStep("region");
    } catch {
      // If lookup fails (network/etc), still allow the user to proceed.
      setMode("register");
      setStartStep("region");
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen max-h-screen w-screen max-w-none overflow-hidden border-none bg-gradient-to-br from-black via-red-950 to-black p-0 shadow-none">
        {/* Full-screen background layers */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute -left-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-red-500/20 blur-3xl" />
          <div className="absolute -right-40 top-1/4 h-96 w-96 animate-pulse rounded-full bg-red-600/15 blur-3xl animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 animate-pulse rounded-full bg-red-700/10 blur-3xl animation-delay-4000" />
          
          {/* Geometric shapes */}
          <div className="absolute left-10 top-20 h-32 w-32 rotate-45 border-2 border-red-500/20" />
          <div className="absolute bottom-20 right-20 h-40 w-40 rotate-12 border-2 border-white/10" />
          <div className="absolute right-1/4 top-1/3 h-24 w-24 -rotate-12 border border-red-400/30" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:50px_50px]" />
          
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
          
          {/* Large CMC GO text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="select-none text-center">
              <div className="text-[120px] font-black uppercase leading-none tracking-wider text-white/5 sm:text-[180px] lg:text-[240px]">
                CMC
              </div>
              <div className="text-[120px] font-black uppercase leading-none tracking-wider text-white/5 sm:text-[180px] lg:text-[240px]">
                GO
              </div>
            </div>
          </div>
        </div>

        {/* Content container */}
        <div className="relative flex h-full items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-red-400 backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                CMC Go Access
              </div>
              <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-white">
                Welcome
              </h1>
              <p className="text-sm text-white/60">
                Let's get you connected
              </p>

              {mode === "register" && (
                <div className="mt-6 flex justify-center gap-2">
                  <span className={cn("h-2 w-8 rounded-full transition-all", startStep === "region" ? "bg-red-500" : "bg-white/20")} />
                  <span className={cn("h-2 w-8 rounded-full transition-all", startStep === "district" ? "bg-red-500" : "bg-white/20")} />
                  <span className={cn("h-2 w-8 rounded-full transition-all", startStep === "campus" ? "bg-red-500" : "bg-white/20")} />
                  <span className={cn("h-2 w-8 rounded-full transition-all", startStep === "role" ? "bg-red-500" : "bg-white/20")} />
                  <span className={cn("h-2 w-8 rounded-full transition-all", startStep === "name" ? "bg-red-500" : "bg-white/20")} />
                </div>
              )}
            </div>

            {/* Form container */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl">
              <div
                className={cn(
                  "space-y-6 transition-all duration-300",
                  isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
                )}
              >
            {mode === "email" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEmailContinue();
                      }
                    }}
                  />
                </div>

                {emailStepError && <p className="text-sm text-red-400">{emailStepError}</p>}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMode("register");
                      setStartStep("region");
                      setEmailStepError(null);
                    }}
                    className="flex-1 border border-white/20 bg-white/5 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    I'm new
                  </Button>
                  <Button
                    type="button"
                    onClick={handleEmailContinue}
                    disabled={startMutation.isPending}
                    className="flex-1 bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {startMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Continue...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>

                {startMutation.error && (
                  <p className="text-sm text-red-400">{startMutation.error.message}</p>
                )}
              </div>
            )}

            {mode === "register" && startStep === "region" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="region" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Region *
                  </Label>
                  <Input
                    id="region"
                    value={regionInput}
                    onChange={(e) => {
                      setRegionInput(e.target.value);
                      setRegionSuggestionsOpen(true);
                      setRegion(null);
                    }}
                    onFocus={() => setRegionSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setRegionSuggestionsOpen(false), 150)}
                    placeholder="Type your region"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                  />
                  {regionSuggestionsOpen && filteredRegions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-white/20 bg-black/90 shadow-2xl backdrop-blur-xl">
                      {filteredRegions.map((regionName) => (
                        <button
                          key={regionName}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white transition-colors hover:bg-red-500/20"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setRegion(regionName);
                            setRegionInput(regionName);
                            setDistrictId(null);
                            setDistrictInput("");
                            setCampusId(null);
                            setCampusInput("");
                            setRegionSuggestionsOpen(false);
                          }}
                        >
                          {regionName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => goToStartStep("district")}
                  disabled={!region}
                  className="w-full bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            )}

            {mode === "register" && startStep === "district" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="district" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    District *
                  </Label>
                  <Input
                    id="district"
                    value={districtInput}
                    onChange={(e) => {
                      setDistrictInput(e.target.value);
                      setDistrictSuggestionsOpen(true);
                      setDistrictId(null);
                    }}
                    onFocus={() => setDistrictSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setDistrictSuggestionsOpen(false), 150)}
                    placeholder="Type your district"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                  />
                  {districtSuggestionsOpen && filteredDistricts.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-white/20 bg-black/90 shadow-2xl backdrop-blur-xl">
                      {filteredDistricts.map((district) => (
                        <button
                          key={district.id}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white transition-colors hover:bg-red-500/20"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setDistrictId(district.id);
                            setDistrictInput(district.name);
                            setCampusId(null);
                            setCampusInput("");
                            setDistrictSuggestionsOpen(false);
                          }}
                        >
                          <span>{district.name}</span>
                          <span className="text-xs text-white/40">{district.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => goToStartStep("region")}
                    className="flex-1 border border-white/20 bg-white/5 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => goToStartStep("campus")}
                    disabled={!districtId}
                    className="flex-1 bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {mode === "register" && startStep === "campus" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="campus" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Campus *
                  </Label>
                  <Input
                    id="campus"
                    value={campusInput}
                    onChange={(e) => {
                      setCampusInput(e.target.value);
                      setCampusSuggestionsOpen(true);
                      setCampusId(null);
                    }}
                    onFocus={() => setCampusSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setCampusSuggestionsOpen(false), 150)}
                    placeholder="Type your campus"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                  />
                  {campusSuggestionsOpen && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-white/20 bg-black/90 shadow-2xl backdrop-blur-xl">
                      {filteredCampuses.map((campus) => (
                        <button
                          key={campus.id}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white transition-colors hover:bg-red-500/20"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setCampusId(campus.id);
                            setCampusInput(campus.name);
                            setCampusSuggestionsOpen(false);
                          }}
                        >
                          {campus.name}
                        </button>
                      ))}
                      {campusInput.trim().length > 1 && filteredCampuses.length === 0 && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-red-500/30"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={handleCreateCampus}
                          disabled={createCampusMutation.isPending}
                        >
                          <Plus className="h-4 w-4 text-red-400" />
                          <span>Add "{campusInput.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => goToStartStep("district")}
                    className="flex-1 border border-white/20 bg-white/5 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => goToStartStep("role")}
                    disabled={!campusId}
                    className="flex-1 bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {mode === "register" && startStep === "role" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Role *
                  </Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger className="mt-2 border-white/20 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/20 bg-black/95 text-white backdrop-blur-xl">
                      <SelectItem value="STAFF" className="hover:bg-red-500/20">Staff</SelectItem>
                      <SelectItem value="CO_DIRECTOR" className="hover:bg-red-500/20">Co-Director</SelectItem>
                      <SelectItem value="CAMPUS_DIRECTOR" className="hover:bg-red-500/20">Campus Director</SelectItem>
                      <SelectItem value="DISTRICT_DIRECTOR" className="hover:bg-red-500/20">District Director</SelectItem>
                      <SelectItem value="REGION_DIRECTOR" className="hover:bg-red-500/20">Region Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => goToStartStep("campus")}
                    className="flex-1 border border-white/20 bg-white/5 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => goToStartStep("name")}
                    className="flex-1 bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {mode === "register" && startStep === "name" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium uppercase tracking-wide text-white/80">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                  />
                </div>

                <Button
                  onClick={handleStart}
                  disabled={!fullName || !email || !role || !campusId || startMutation.isPending}
                  className="w-full bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {startMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => goToStartStep("role")}
                    className="flex-1 border border-white/20 bg-white/5 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMode("email");
                      setEmailStepError(null);
                    }}
                    className="flex-1 border border-white/20 bg-white/5 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                  >
                    Different email
                  </Button>
                </div>

                {startMutation.error && (
                  <p className="text-sm text-red-400">{startMutation.error.message}</p>
                )}
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

