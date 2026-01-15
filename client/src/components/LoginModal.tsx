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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

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
  const [campusOpen, setCampusOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  
  const { data: districts = [] } = trpc.districts.publicList.useQuery();
  const { data: campuses = [] } = trpc.campuses.byDistrict.useQuery(
    { districtId: districtId ?? "" },
    { enabled: !!districtId }
  );

  const regions = useMemo(() => {
    const regionSet = new Set(districts.map((district) => district.region).filter(Boolean));
    return Array.from(regionSet).sort();
  }, [districts]);

  const filteredDistricts = useMemo(
    () => districts.filter((district) => (region ? district.region === region : false)),
    [districts, region]
  );

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
      setDistrictId(null);
      setCampusId(null);
    },
  });
  
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
          <div className="absolute -top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute -top-8 right-10 h-24 w-24 rounded-full bg-red-600/15 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-black/10 blur-3xl" />
          <div className="absolute bottom-6 left-6 h-28 w-28 rounded-full bg-black/5 blur-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="select-none text-[72px] font-extrabold uppercase tracking-[0.2em] text-black/5 sm:text-[96px]">
              CMC GO
            </span>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_55%)]" />
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
                <div>
                  <Label htmlFor="region" className="text-black">
                    Region *
                  </Label>
                  <Popover open={regionOpen} onOpenChange={setRegionOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={regionOpen}
                        className="w-full justify-between border-black/20 bg-white text-black hover:bg-black/5"
                      >
                        {region || "Select region"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] border-black/15 bg-white p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type a region..." />
                        <CommandList>
                          <CommandEmpty>No regions found.</CommandEmpty>
                          {regions.map((regionName) => (
                            <CommandItem
                              key={regionName}
                              value={regionName}
                              onSelect={() => {
                                setRegion(regionName);
                                setDistrictId(null);
                                setCampusId(null);
                                setRegionOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  region === regionName ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {regionName}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  onClick={() => goToStartStep("district")}
                  disabled={!region}
                  className="w-full bg-black text-white hover:bg-black/90"
                >
                  Next
                </Button>
              </div>
            )}

            {startStep === "district" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="district" className="text-black">
                    District *
                  </Label>
                  <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={districtOpen}
                        className="w-full justify-between border-black/20 bg-white text-black hover:bg-black/5"
                      >
                        {selectedDistrict ? selectedDistrict.name : "Select district"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] border-black/15 bg-white p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type a district..." />
                        <CommandList>
                          <CommandEmpty>No districts found.</CommandEmpty>
                          {filteredDistricts.map((district) => (
                            <CommandItem
                              key={district.id}
                              value={district.name}
                              onSelect={() => {
                                setDistrictId(district.id);
                                setCampusId(null);
                                setDistrictOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  districtId === district.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {district.name}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  onClick={() => goToStartStep("campus")}
                  disabled={!districtId}
                  className="w-full bg-black text-white hover:bg-black/90"
                >
                  Next
                </Button>
              </div>
            )}

            {startStep === "campus" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campus" className="text-black">
                    Campus *
                  </Label>
                  <Popover open={campusOpen} onOpenChange={setCampusOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={campusOpen}
                        className="w-full justify-between border-black/20 bg-white text-black hover:bg-black/5"
                      >
                        {selectedCampus ? selectedCampus.name : "Select campus"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] border-black/15 bg-white p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type a campus..." />
                        <CommandList>
                          <CommandEmpty>No campuses found.</CommandEmpty>
                          {campuses.map((campus) => (
                            <CommandItem
                              key={campus.id}
                              value={campus.name}
                              onSelect={() => {
                                setCampusId(campus.id);
                                setCampusOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  campusId === campus.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {campus.name}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  onClick={() => goToStartStep("role")}
                  disabled={!campusId}
                  className="w-full bg-black text-white hover:bg-black/90"
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
                    <SelectTrigger>
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
                <Button onClick={() => goToStartStep("name")} className="w-full bg-black text-white hover:bg-black/90">
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

