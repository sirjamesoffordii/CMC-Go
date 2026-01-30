/**
 * Login/Registration Flow
 *
 * Registration Flow:
 * 1. Gate 1: Email + Password (credentials)
 * 2. Gate 2: Region → District → Campus sequence
 *    - No Region = National Team
 *    - Region but No District = Regional level
 *    - District but No Campus = District level
 *    - Campus = Campus level
 *    - "Other" = External affiliate (view-only aggregate access)
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  Globe,
  MapPin,
  Building2,
  Users,
  Check,
} from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role configuration based on scope level
const NATIONAL_ROLES = [
  { value: "NATIONAL_DIRECTOR", label: "National Director" },
  { value: "FIELD_DIRECTOR", label: "Field Director" },
  { value: "NATIONAL_STAFF", label: "National Staff" },
] as const;

const REGIONAL_ROLES = [
  { value: "REGION_DIRECTOR", label: "Regional Director" },
  { value: "REGIONAL_STAFF", label: "Regional Staff" },
] as const;

const DISTRICT_ROLES = [
  { value: "DISTRICT_DIRECTOR", label: "District Director" },
  { value: "DISTRICT_STAFF", label: "District Staff" },
] as const;

const CAMPUS_ROLES = [
  { value: "CAMPUS_DIRECTOR", label: "Campus Director" },
  { value: "CO_DIRECTOR", label: "Co-Director" },
  { value: "STAFF", label: "Staff" },
] as const;

type RegistrationStep =
  | "credentials" // Email + Password
  | "region" // Select region or "National Team"
  | "district" // Select district or "Regional level"
  | "campus" // Select campus or "District level"
  | "role" // Select role based on scope
  | "affiliation" // For "Other" - external affiliates
  | "confirm"; // Final confirmation

type ScopeLevel = "national" | "regional" | "district" | "campus" | "other";

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const utils = trpc.useUtils();

  // Mode
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<RegistrationStep>("credentials");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  // Scope selection
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  );
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [affiliation, setAffiliation] = useState("");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Data queries
  const { data: districts = [] } = trpc.districts.publicList.useQuery();
  const { data: campuses = [] } = trpc.campuses.byDistrict.useQuery(
    { districtId: selectedDistrictId ?? "" },
    { enabled: !!selectedDistrictId }
  );

  // Compute unique regions
  const regions = useMemo(() => {
    const regionSet = new Set(districts.map(d => d.region).filter(Boolean));
    return Array.from(regionSet).sort();
  }, [districts]);

  // Filter districts by region
  const filteredDistricts = useMemo(() => {
    if (!selectedRegion) return [];
    return districts
      .filter(d => d.region === selectedRegion)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [districts, selectedRegion]);

  // Mutations
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: err => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: err => setError(err.message),
  });

  const resetForm = () => {
    setMode("login");
    setStep("credentials");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFullName("");
    setScopeLevel(null);
    setSelectedRegion(null);
    setSelectedDistrictId(null);
    setSelectedCampusId(null);
    setSelectedRole(null);
    setAffiliation("");
    setError(null);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // Step navigation with animation
  const goToStep = (newStep: RegistrationStep) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setError(null);
    setTimeout(() => {
      setStep(newStep);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  // Handlers
  const handleLogin = () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError(null);
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleCredentialsNext = () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    setError(null);
    goToStep("region");
  };

  const handleRegionSelect = (region: string | null) => {
    if (region === null) {
      // National Team
      setScopeLevel("national");
      setSelectedRegion(null);
      goToStep("role");
    } else {
      setSelectedRegion(region);
      goToStep("district");
    }
  };

  const handleDistrictSelect = (districtId: string | null) => {
    if (districtId === null) {
      // Regional level
      setScopeLevel("regional");
      setSelectedDistrictId(null);
      goToStep("role");
    } else {
      setSelectedDistrictId(districtId);
      goToStep("campus");
    }
  };

  const handleCampusSelect = (
    campusId: number | null,
    isOther: boolean = false
  ) => {
    if (isOther) {
      // External affiliate
      setScopeLevel("other");
      setSelectedCampusId(null);
      goToStep("affiliation");
    } else if (campusId === null) {
      // District level
      setScopeLevel("district");
      setSelectedCampusId(null);
      goToStep("role");
    } else {
      setScopeLevel("campus");
      setSelectedCampusId(campusId);
      goToStep("role");
    }
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    goToStep("confirm");
  };

  const handleRegister = () => {
    if (!email.trim() || !password || !fullName.trim()) {
      setError("Missing required fields");
      return;
    }

    // For "other" scope, affiliation is required
    if (scopeLevel === "other" && !affiliation.trim()) {
      setError("Please enter your affiliation");
      return;
    }

    // For all other scopes, role is required
    if (scopeLevel !== "other" && !selectedRole) {
      setError("Please select a role");
      return;
    }

    setError(null);

    registerMutation.mutate({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: (scopeLevel === "other" ? "STAFF" : selectedRole!) as any,
      campusId: selectedCampusId ?? undefined,
      overseeRegionId:
        scopeLevel === "regional" ? (selectedRegion ?? undefined) : undefined,
    });
  };

  // Get available roles based on scope
  const getAvailableRoles = () => {
    switch (scopeLevel) {
      case "national":
        return NATIONAL_ROLES;
      case "regional":
        return REGIONAL_ROLES;
      case "district":
        return DISTRICT_ROLES;
      case "campus":
        return CAMPUS_ROLES;
      default:
        return [];
    }
  };

  // Get scope description
  const getScopeDescription = () => {
    switch (scopeLevel) {
      case "national":
        return "You'll have national-level access to view and manage Chi Alpha across all regions.";
      case "regional":
        return `You'll have regional access to ${selectedRegion}.`;
      case "district": {
        const district = districts.find(d => d.id === selectedDistrictId);
        return `You'll have district-level access to ${district?.name || "your district"}.`;
      }
      case "campus": {
        const campus = campuses.find(c => c.id === selectedCampusId);
        return `You'll have access to ${campus?.name || "your campus"}.`;
      }
      case "other":
        return "You'll have view-only access to aggregate statistics.";
      default:
        return "";
    }
  };

  // Progress calculation
  const getProgress = () => {
    const steps = ["credentials", "region"];
    if (scopeLevel === "national") steps.push("role", "confirm");
    else if (scopeLevel === "regional")
      steps.push("district", "role", "confirm");
    else if (scopeLevel === "district")
      steps.push("district", "campus", "role", "confirm");
    else if (scopeLevel === "campus")
      steps.push("district", "campus", "role", "confirm");
    else if (scopeLevel === "other")
      steps.push("district", "campus", "affiliation", "confirm");
    else steps.push("district", "campus", "role", "confirm");

    const currentIndex = steps.indexOf(step);
    return { current: currentIndex + 1, total: steps.length };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
      {/* Dynamic background layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Animated glowing orbs */}
        <div className="absolute -left-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-96 w-96 animate-pulse rounded-full bg-sky-400/25 blur-3xl [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 animate-pulse rounded-full bg-indigo-400/20 blur-3xl [animation-delay:4s]" />

        {/* Geometric shapes */}
        <div className="absolute left-10 top-20 h-32 w-32 rotate-45 border-2 border-sky-500/20" />
        <div className="absolute bottom-20 right-20 h-40 w-40 rotate-12 border-2 border-slate-900/10" />
        <div className="absolute right-1/4 top-1/3 h-24 w-24 -rotate-12 border border-indigo-500/20" />
        <div className="absolute bottom-1/3 left-1/4 h-20 w-20 rotate-45 border border-slate-900/5" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:50px_50px]" />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(2,6,23,0.06)_100%)]" />

        {/* Large watermark text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="select-none text-center">
            <div className="text-[120px] font-black uppercase leading-none tracking-wider text-slate-900/[0.04] sm:text-[180px] lg:text-[240px]">
              CMC
            </div>
            <div className="text-[120px] font-black uppercase leading-none tracking-wider text-slate-900/[0.04] sm:text-[180px] lg:text-[240px]">
              GO
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => onOpenChange(false)}
        className="absolute right-6 top-6 z-10 rounded-full p-2 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Content */}
      <div className="relative w-full max-w-md px-6">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-4 py-2 backdrop-blur-sm shadow-sm shadow-slate-900/5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-700">
              CMC Go Access
            </span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "login"
              ? "Sign in to continue"
              : step === "credentials"
                ? "Let's start with your credentials"
                : "Tell us about your role"}
          </p>

          {/* Progress indicator for registration */}
          {mode === "register" && step !== "credentials" && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: getProgress().total }).map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-2 w-8 rounded-full transition-all",
                    idx < getProgress().current
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500"
                      : "bg-slate-200/70"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Form container */}
        <div
          className={cn(
            "rounded-2xl border border-slate-200/60 bg-white/70 p-8 backdrop-blur-xl shadow-xl shadow-slate-900/5 transition-all duration-150",
            isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"
          )}
        >
          {/* LOGIN MODE */}
          {mode === "login" && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="border-slate-200 bg-white/80 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-sky-700">{error}</p>}

              <Button
                onClick={handleLogin}
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setStep("credentials");
                  }}
                  className="font-medium text-indigo-700 hover:text-indigo-600"
                >
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* REGISTER: CREDENTIALS */}
          {mode === "register" && step === "credentials" && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Full Name
                </Label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="border-slate-200 bg-white/80 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum 8 characters
                </p>
              </div>

              {error && <p className="text-sm text-sky-700">{error}</p>}

              <Button
                onClick={handleCredentialsNext}
                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30"
              >
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    resetForm();
                  }}
                  className="font-medium text-indigo-700 hover:text-indigo-600"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* REGISTER: REGION SELECTION */}
          {mode === "register" && step === "region" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your region
                </h2>
                <p className="text-sm text-slate-600">
                  What region are you part of?
                </p>
              </div>

              {/* National Team option */}
              <button
                onClick={() => handleRegionSelect(null)}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">National Team</p>
                  <p className="text-sm text-slate-600">
                    I'm part of the national Chi Alpha team
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </button>

              {/* Region list */}
              <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/80">
                {regions.map(region => (
                  <button
                    key={region}
                    onClick={() => handleRegionSelect(region)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{region}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToStep("credentials")}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: DISTRICT SELECTION */}
          {mode === "register" && step === "district" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your district
                </h2>
                <p className="text-sm text-slate-600">
                  What district in {selectedRegion} are you part of?
                </p>
              </div>

              {/* Regional level option */}
              <button
                onClick={() => handleDistrictSelect(null)}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Regional Level</p>
                  <p className="text-sm text-slate-600">
                    I work at the regional level, not a specific district
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </button>

              {/* District list */}
              <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/80">
                {filteredDistricts.map(district => (
                  <button
                    key={district.id}
                    onClick={() => handleDistrictSelect(district.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {district.name}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToStep("region")}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: CAMPUS SELECTION */}
          {mode === "register" && step === "campus" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your campus
                </h2>
                <p className="text-sm text-slate-600">
                  What campus are you part of?
                </p>
              </div>

              {/* District level option */}
              <button
                onClick={() => handleCampusSelect(null)}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">District Level</p>
                  <p className="text-sm text-slate-600">
                    I work at the district level, not a specific campus
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </button>

              {/* Campus list */}
              <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/80">
                {campuses.map(campus => (
                  <button
                    key={campus.id}
                    onClick={() => handleCampusSelect(campus.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {campus.name}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>

              {/* Other/External option */}
              <button
                onClick={() => handleCampusSelect(null, true)}
                className="group flex w-full items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900/5 text-slate-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-700">
                    Other / Not Chi Alpha Staff
                  </p>
                  <p className="text-sm text-slate-600">
                    I'm an external affiliate or partner
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => goToStep("district")}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: ROLE SELECTION */}
          {mode === "register" && step === "role" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  What's your role?
                </h2>
                <p className="text-sm text-slate-600">
                  {getScopeDescription()}
                </p>
              </div>

              <div className="space-y-2">
                {getAvailableRoles().map(role => (
                  <button
                    key={role.value}
                    onClick={() => handleRoleSelect(role.value)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-left shadow-sm shadow-slate-900/5 transition-all hover:border-sky-300 hover:bg-white"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{role.label}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (scopeLevel === "national") goToStep("region");
                  else if (scopeLevel === "regional") goToStep("district");
                  else if (scopeLevel === "district") goToStep("campus");
                  else if (scopeLevel === "campus") goToStep("campus");
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: AFFILIATION (for Other) */}
          {mode === "register" && step === "affiliation" && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Your Affiliation
                </h2>
                <p className="text-sm text-slate-600">
                  How are you connected to Chi Alpha?
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Affiliation / Organization
                </Label>
                <Input
                  type="text"
                  value={affiliation}
                  onChange={e => setAffiliation(e.target.value)}
                  placeholder="e.g., Partner church, Donor, Assemblies of God"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500/60 focus-visible:ring-sky-500/20"
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> As an external affiliate, you'll have
                  view-only access to aggregate statistics. You won't be able to
                  see or edit individual records.
                </p>
              </div>

              {error && <p className="text-sm text-sky-700">{error}</p>}

              <Button
                onClick={() => goToStep("confirm")}
                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30"
              >
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <button
                onClick={() => goToStep("campus")}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: CONFIRMATION */}
          {mode === "register" && step === "confirm" && (
            <div className="space-y-5">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Confirm your details
                </h2>
                <p className="text-sm text-slate-600">
                  Please review your information
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200/70 bg-white/70 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Name</span>
                  <span className="text-sm font-medium text-slate-900">
                    {fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Email</span>
                  <span className="text-sm font-medium text-slate-900">
                    {email}
                  </span>
                </div>
                {selectedRegion && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Region</span>
                    <span className="text-sm font-medium text-slate-900">
                      {selectedRegion}
                    </span>
                  </div>
                )}
                {selectedDistrictId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">District</span>
                    <span className="text-sm font-medium text-slate-900">
                      {districts.find(d => d.id === selectedDistrictId)?.name}
                    </span>
                  </div>
                )}
                {selectedCampusId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Campus</span>
                    <span className="text-sm font-medium text-slate-900">
                      {campuses.find(c => c.id === selectedCampusId)?.name}
                    </span>
                  </div>
                )}
                {scopeLevel === "other" ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Affiliation</span>
                    <span className="text-sm font-medium text-slate-900">
                      {affiliation}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Role</span>
                    <span className="text-sm font-medium text-slate-900">
                      {
                        getAvailableRoles().find(r => r.value === selectedRole)
                          ?.label
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Access Level</span>
                  <span className="text-sm font-medium capitalize text-indigo-700">
                    {scopeLevel}
                  </span>
                </div>
              </div>

              {error && <p className="text-sm text-sky-700">{error}</p>}

              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>

              <button
                onClick={() => goToStep("role")}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
