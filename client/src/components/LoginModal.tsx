/**
 * Login/Registration Modal - PR 2
 * Handles self-registration with email verification
 */

import { useMemo, useState } from "react";
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
  const [step, setStep] = useState<"start" | "verify">("start");
  const [startStep, setStartStep] = useState<"region" | "district" | "campus" | "role" | "name">("region");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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
    const order = ["region", "district", "campus", "role", "name"] as const;
    if (order.indexOf(nextStep) <= order.indexOf(startStep)) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setStartStep(nextStep);
      setTimeout(() => setIsTransitioning(false), 200);
    }, 200);
  };
  
  const startMutation = trpc.auth.start.useMutation({
    onSuccess: (data) => {
      setStep("verify");
      // In development, show the code
      if (import.meta.env.DEV && (data as any).code) {
        alert(`Verification code: ${(data as any).code}`);
      }
    },
  });
  
  const verifyMutation = trpc.auth.verify.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onOpenChange(false);
      // Reset form
      setStep("start");
      setStartStep("region");
      setEmail("");
      setCode("");
      setFullName("");
      setRole("STAFF");
      setRegion(null);
      setRegionInput("");
      setDistrictId(null);
      setDistrictInput("");
      setCampusId(null);
      setCampusInput("");
    },
  });

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
  
  const handleVerify = () => {
    if (!email || !code) {
      return;
    }
    verifyMutation.mutate({
      email,
      code,
      // Include registration data if this is a new user
      ...(step === "verify" && fullName && role && campusId ? {
        fullName,
        role,
        campusId,
      } : {}),
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="relative max-w-md overflow-hidden border border-black/10 bg-white text-black shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-red-500/15 blur-3xl" />
          <div className="absolute -top-8 right-6 h-28 w-28 rounded-full bg-red-600/20 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-black/15 blur-3xl" />
          <div className="absolute bottom-10 left-6 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="select-none text-[84px] font-extrabold uppercase tracking-[0.22em] text-black/10 sm:text-[112px]">
              CMC GO
            </span>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08),_transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(120deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.05)_100%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(0,0,0,0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>
        <DialogHeader>
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
              CMC Go Access
              <span className="h-1 w-1 rounded-full bg-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold text-black">
              {step === "start" ? "Sign Up / Login" : "Verify Email"}
            </DialogTitle>
            {step === "start" && (
              <div className="flex items-center gap-2 text-xs text-black/50">
                <span className={cn("h-1.5 w-6 rounded-full", startStep === "region" ? "bg-red-500" : "bg-black/10")} />
                <span className={cn("h-1.5 w-6 rounded-full", startStep === "district" ? "bg-red-500" : "bg-black/10")} />
                <span className={cn("h-1.5 w-6 rounded-full", startStep === "campus" ? "bg-red-500" : "bg-black/10")} />
                <span className={cn("h-1.5 w-6 rounded-full", startStep === "role" ? "bg-red-500" : "bg-black/10")} />
                <span className={cn("h-1.5 w-6 rounded-full", startStep === "name" ? "bg-red-500" : "bg-black/10")} />
              </div>
            )}
          </div>
        </DialogHeader>
        
        {step === "start" ? (
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            {startStep === "region" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="region" className="text-black">
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
                    className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
                  />
                  {regionSuggestionsOpen && filteredRegions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-md border border-black/15 bg-white shadow-lg">
                      {filteredRegions.map((regionName) => (
                        <button
                          key={regionName}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-black hover:bg-black/5"
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
                  className="w-full bg-black text-white hover:bg-red-600"
                >
                  Next
                </Button>
              </div>
            )}

            {startStep === "district" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="district" className="text-black">
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
                    className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
                  />
                  {districtSuggestionsOpen && filteredDistricts.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-md border border-black/15 bg-white shadow-lg">
                      {filteredDistricts.map((district) => (
                        <button
                          key={district.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-black hover:bg-black/5"
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
                          <span className="text-xs text-black/50">{district.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => goToStartStep("campus")}
                  disabled={!districtId}
                  className="w-full bg-black text-white hover:bg-red-600"
                >
                  Next
                </Button>
              </div>
            )}

            {startStep === "campus" && (
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="campus" className="text-black">
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
                    className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
                  />
                  {campusSuggestionsOpen && (
                    <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-md border border-black/15 bg-white shadow-lg">
                      {filteredCampuses.map((campus) => (
                        <button
                          key={campus.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-black hover:bg-black/5"
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
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-black hover:bg-red-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={handleCreateCampus}
                          disabled={createCampusMutation.isPending}
                        >
                          <Plus className="h-4 w-4 text-red-500" />
                          Add "{campusInput.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => goToStartStep("role")}
                  disabled={!campusId}
                  className="w-full bg-black text-white hover:bg-red-600"
                >
                  Next
                </Button>
              </div>
            )}

            {startStep === "role" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role" className="text-black">
                    Role *
                  </Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger className="border-black/20 text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="CO_DIRECTOR">Co-Director</SelectItem>
                      <SelectItem value="CAMPUS_DIRECTOR">Campus Director</SelectItem>
                      <SelectItem value="DISTRICT_DIRECTOR">District Director</SelectItem>
                      <SelectItem value="REGION_DIRECTOR">Region Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => goToStartStep("name")} className="w-full bg-black text-white hover:bg-red-600">
                  Next
                </Button>
              </div>
            )}

            {startStep === "name" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-black">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-black">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
                  />
                </div>

                <Button
                  onClick={handleStart}
                  disabled={!fullName || !email || !role || !campusId || startMutation.isPending}
                  className="w-full bg-red-600 text-white hover:bg-red-500"
                >
                  {startMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>

                {startMutation.error && (
                  <p className="text-sm text-red-600">{startMutation.error.message}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-black/60">
              We've sent a verification code to {email}. Please check your email and enter the code below.
            </p>
            
            <div>
              <Label htmlFor="code" className="text-black">
                Verification Code *
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="border-black/20 text-black placeholder:text-black/40 focus-visible:ring-red-500"
              />
            </div>
            
            <Button 
              onClick={handleVerify} 
              disabled={!code || verifyMutation.isPending}
              className="w-full bg-red-600 text-white hover:bg-red-500"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>
            
            {verifyMutation.error && (
              <p className="text-sm text-red-600">{verifyMutation.error.message}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

