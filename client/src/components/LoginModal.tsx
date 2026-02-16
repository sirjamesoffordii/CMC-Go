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
 */

import { useEffect, useMemo, useState } from "react";
import { TRPCClientError } from "@trpc/client";
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
  X,
  Plus,
} from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful login/register with the user's districtId (if any) */
  onAuthSuccess?: (districtId: string | null) => void;
  /** Show the close (X) button. Default false — the /login page hides it. */
  showClose?: boolean;
}

// Role configuration based on scope level
// NATIONAL_DIRECTOR and FIELD_DIRECTOR are pre-seeded and not self-registerable
const NATIONAL_ROLES = [
  {
    value: "NATIONAL_STAFF",
    label: "National Staff",
    description: "National map view · View all details · Edit XAN panel only",
  },
] as const;

const REGIONAL_ROLES = [
  {
    value: "REGION_DIRECTOR",
    label: "Regional Director",
    description: "National map view · View all details · Edit your region",
  },
  {
    value: "REGIONAL_STAFF",
    label: "Regional Staff",
    description: "National map view · View all details · Edit your region",
  },
] as const;

const DISTRICT_ROLES = [
  {
    value: "DISTRICT_DIRECTOR",
    label: "District Director",
    description: "Regional map view · View region details · Edit your district",
  },
  {
    value: "DISTRICT_STAFF",
    label: "District Staff",
    description: "Regional map view · View region details · Edit your district",
  },
] as const;

const CAMPUS_ROLES = [
  {
    value: "CAMPUS_DIRECTOR",
    label: "Campus Director",
    description: "Regional map view · View district details · Edit your campus",
  },
  {
    value: "CO_DIRECTOR",
    label: "Campus Co-Director",
    description: "Regional map view · View district details · Edit your campus",
  },
  {
    value: "STAFF",
    label: "Campus Staff",
    description: "Regional map view · View your campus · Edit your campus",
  },
  {
    value: "CAMPUS_INTERN",
    label: "Campus Intern",
    description: "Regional map view · View your campus · Edit your campus",
  },
  {
    value: "CAMPUS_VOLUNTEER",
    label: "Campus Volunteer",
    description: "Regional map view · View your campus · Edit your campus",
  },
] as const;

const OTHER_ROLE = {
  value: "OTHER" as const,
  label: "Other",
  description:
    "Full map view · No personal details visible · No editing access",
};

type RegistrationStep =
  | "credentials" // Email + Password
  | "region" // Select region or "National Team"
  | "district" // Select district or "Regional level"
  | "campus" // Select campus or "District level"
  | "role" // Select role based on scope
  | "category" // Select XAN category (National Staff only)
  | "confirm"; // Final confirmation

type ScopeLevel = "national" | "regional" | "district" | "campus";

type AuthMode = "login" | "register" | "forgotPassword";

export function LoginModal({
  open,
  onOpenChange,
  onAuthSuccess,
  showClose = false,
}: LoginModalProps) {
  const utils = trpc.useUtils();

  // Mode
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<RegistrationStep>("credentials");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  // Password reset state
  const [resetSuccess, setResetSuccess] = useState(false);

  // Scope selection
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  );
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);
  const [newlyCreatedCampusName, setNewlyCreatedCampusName] = useState<
    string | null
  >(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [selectedNationalCategory, setSelectedNationalCategory] = useState<
    string | null
  >(null);
  const [isNewNationalCategory, setIsNewNationalCategory] = useState(false);
  const [newNationalCategoryName, setNewNationalCategoryName] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"user" | "system" | null>(null);
  const [highlightCreateUser, setHighlightCreateUser] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const clearError = () => {
    setError(null);
    setErrorType(null);
    setHighlightCreateUser(false);
  };

  const setUserError = (message: string) => {
    setError(message);
    setErrorType("user");
  };

  const setSystemError = (message: string) => {
    setError(message);
    setErrorType("system");
  };

  const handleLoginError = (err: unknown) => {
    setHighlightCreateUser(false);
    if (err instanceof TRPCClientError) {
      const code = err.data?.code;
      if (code === "NOT_FOUND") {
        setUserError("User doesn't exist. Create a new user.");
        setHighlightCreateUser(true);
        return;
      }
      if (code === "UNAUTHORIZED") {
        setUserError("Wrong password.");
        return;
      }
      if (code === "FORBIDDEN") {
        setUserError(err.message);
        return;
      }
      if (code === "BAD_REQUEST") {
        setUserError("Please enter a valid email address.");
        return;
      }
    }

    setSystemError("Something went wrong on our side. Please try again.");
  };

  const handleMutationError = (err: unknown) => {
    if (err instanceof TRPCClientError) {
      const code = err.data?.code;
      if (code === "INTERNAL_SERVER_ERROR") {
        setSystemError("Something went wrong on our side. Please try again.");
        return;
      }
      if (code === "BAD_REQUEST") {
        setUserError("Please check your input and try again.");
        return;
      }
      setUserError(err.message);
      return;
    }

    setSystemError("Something went wrong on our side. Please try again.");
  };

  const renderError = () => {
    if (!error) return null;
    const isSystem = errorType === "system";
    return (
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-sm",
          isSystem
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-red-200 bg-red-50 text-red-700"
        )}
      >
        <p>{error}</p>
      </div>
    );
  };

  // Typeahead search state
  const [regionQuery, setRegionQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");
  const [campusQuery, setCampusQuery] = useState("");

  // Data queries
  const { data: districts = [] } = trpc.districts.publicList.useQuery();
  const { data: campuses = [] } = trpc.campuses.byDistrict.useQuery(
    { districtId: selectedDistrictId ?? "" },
    { enabled: !!selectedDistrictId }
  );
  const { data: nationalCategories = [] } =
    trpc.people.getNationalCategories.useQuery(undefined, {
      enabled: mode === "register" && selectedRole === "NATIONAL_STAFF",
    });

  // Compute unique regions (exclude National Team — handled by "No region" option)
  const regions = useMemo(() => {
    const excludedRegions = new Set(["National Team", "NATIONAL"]);
    const regionSet = new Set(
      districts
        .map(d => d.region)
        .filter((r): r is string => Boolean(r) && !excludedRegions.has(r))
    );
    return Array.from(regionSet).sort();
  }, [districts]);

  // Filtered regions by search query
  const filteredRegions = useMemo(() => {
    if (!regionQuery.trim()) return regions;
    const q = regionQuery.toLowerCase();
    return regions.filter(r => r.toLowerCase().includes(q));
  }, [regions, regionQuery]);

  // Filter districts by region
  const filteredDistricts = useMemo(() => {
    if (!selectedRegion) return [];
    return districts
      .filter(d => d.region === selectedRegion)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [districts, selectedRegion]);

  // Filtered districts by search query
  const searchFilteredDistricts = useMemo(() => {
    if (!districtQuery.trim()) return filteredDistricts;
    const q = districtQuery.toLowerCase();
    return filteredDistricts.filter(d => d.name.toLowerCase().includes(q));
  }, [filteredDistricts, districtQuery]);

  // Filtered campuses by search query
  const filteredCampuses = useMemo(() => {
    if (!campusQuery.trim()) return campuses;
    const q = campusQuery.toLowerCase();
    return campuses.filter(c => c.name.toLowerCase().includes(q));
  }, [campuses, campusQuery]);

  // State for "Add Campus" flow
  const [isCreatingCampus, setIsCreatingCampus] = useState(false);

  // Mutation: create campus during registration
  const createCampusMutation = trpc.campuses.createPublic.useMutation({
    onSuccess: data => {
      // Select the newly created campus and proceed
      setScopeLevel("campus");
      setSelectedCampusId(data.id);
      setNewlyCreatedCampusName(data.name);
      setIsCreatingCampus(false);
      goToStep("role");
    },
    onError: err => {
      handleMutationError(err);
      setIsCreatingCampus(false);
    },
  });

  const handleAddCampus = () => {
    if (!campusQuery.trim() || !selectedDistrictId) return;
    setIsCreatingCampus(true);
    createCampusMutation.mutate({
      name: campusQuery.trim(),
      districtId: selectedDistrictId,
    });
  };

  // Mutations
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async data => {
      // Clear scope preferences so user starts with role-appropriate defaults
      localStorage.removeItem("cmc-scope-filter");
      localStorage.removeItem("cmc-scope-region");
      localStorage.removeItem("cmc-scope-district");

      if (data.user) {
        utils.auth.me.setData(undefined, data.user);
      }
      await utils.auth.me.invalidate();
      onOpenChange(false);
      const districtId = data.user?.districtId ?? null;
      resetForm();
      onAuthSuccess?.(districtId);
    },
    onError: err => handleLoginError(err),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async data => {
      // Clear scope preferences so user starts with role-appropriate defaults
      localStorage.removeItem("cmc-scope-filter");
      localStorage.removeItem("cmc-scope-region");
      localStorage.removeItem("cmc-scope-district");

      if (data.user) {
        utils.auth.me.setData(undefined, data.user);
      }
      await utils.auth.me.invalidate();
      onOpenChange(false);
      const districtId = data.user?.districtId ?? null;
      resetForm();
      onAuthSuccess?.(districtId);
    },
    onError: err => handleMutationError(err),
  });

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      clearError();
      setResetSuccess(true);
    },
    onError: err => handleMutationError(err),
  });

  const resetForm = () => {
    setMode("login");
    setStep("credentials");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFullName("");
    setResetSuccess(false);
    setScopeLevel(null);
    setSelectedRegion(null);
    setSelectedDistrictId(null);
    setSelectedCampusId(null);
    setNewlyCreatedCampusName(null);
    setSelectedRole(null);
    setCustomRoleTitle("");
    setSelectedNationalCategory(null);
    setIsNewNationalCategory(false);
    setNewNationalCategoryName("");
    setIsCheckingEmail(false);
    clearError();
    setRegionQuery("");
    setDistrictQuery("");
    setCampusQuery("");
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // Step navigation with animation
  const goToStep = (newStep: RegistrationStep) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    clearError();
    setTimeout(() => {
      setStep(newStep);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (highlightCreateUser) {
      setHighlightCreateUser(false);
    }
  };

  // Handlers
  const handleLogin = () => {
    if (!email.trim() || !password) {
      setUserError("Please enter your email and password");
      return;
    }
    clearError();
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleCredentialsNext = async () => {
    if (!email.trim()) {
      setUserError("Please enter your email");
      return;
    }
    if (!password) {
      setUserError("Please enter a password");
      return;
    }
    if (!fullName.trim()) {
      setUserError("Please enter your full name");
      return;
    }
    clearError();

    // Check email availability before proceeding
    setIsCheckingEmail(true);
    try {
      const result = await utils.client.auth.emailExists.query({
        email: email.trim(),
      });
      if (result.exists) {
        setUserError(
          "An account with this email already exists. Try signing in instead."
        );
        setIsCheckingEmail(false);
        return;
      }
    } catch {
      // If check fails, let registration attempt handle it
    }
    setIsCheckingEmail(false);
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

  const handleCampusSelect = (campusId: number | null) => {
    if (campusId === null) {
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
    if (role === "NATIONAL_STAFF") {
      goToStep("category");
    } else {
      goToStep("confirm");
    }
  };

  const handleRegister = () => {
    if (!email.trim() || !password || !fullName.trim()) {
      setUserError("Missing required fields");
      return;
    }

    if (!selectedRole) {
      setUserError("Please select a role");
      return;
    }

    clearError();

    // OTHER role is view-only: never send campus/district/region
    const isOther = selectedRole === "OTHER";

    registerMutation.mutate({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: selectedRole as any,
      campusId: isOther ? undefined : (selectedCampusId ?? undefined),
      districtId:
        isOther
          ? undefined
          : scopeLevel === "district"
            ? (selectedDistrictId ?? undefined)
            : undefined,
      overseeRegionId:
        isOther
          ? undefined
          : scopeLevel === "regional"
            ? (selectedRegion ?? undefined)
            : undefined,
      customRoleTitle: isOther
        ? customRoleTitle.trim() || undefined
        : undefined,
      nationalCategory:
        selectedRole === "NATIONAL_STAFF" && selectedNationalCategory
          ? selectedNationalCategory
          : undefined,
    });
  };

  // Get available roles based on scope
  const getAvailableRoles = () => {
    const baseRoles = (() => {
      switch (scopeLevel) {
        case "national":
          return [...NATIONAL_ROLES];
        case "regional":
          return [...REGIONAL_ROLES];
        case "district":
          return [...DISTRICT_ROLES];
        case "campus":
          return [...CAMPUS_ROLES];
        default:
          return [];
      }
    })();
    return [...baseRoles, OTHER_ROLE];
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
      default:
        return "";
    }
  };

  // Progress calculation
  const getProgress = () => {
    const steps = ["credentials", "region"];
    if (scopeLevel === "national") {
      steps.push("role");
      if (selectedRole === "NATIONAL_STAFF") steps.push("category");
      steps.push("confirm");
    } else if (scopeLevel === "regional")
      steps.push("district", "role", "confirm");
    else if (scopeLevel === "district")
      steps.push("district", "campus", "role", "confirm");
    else if (scopeLevel === "campus")
      steps.push("district", "campus", "role", "confirm");
    else steps.push("district", "campus", "role", "confirm");

    const currentIndex = steps.indexOf(step);
    return { current: currentIndex + 1, total: steps.length };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-white to-slate-50" />

      {/* Subtle animated clouds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-40 w-80 rounded-full bg-white/60 blur-3xl animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute top-1/4 -right-20 h-60 w-96 rounded-full bg-white/50 blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-1/4 -left-20 h-48 w-72 rounded-full bg-red-50/40 blur-3xl animate-[drift_22s_ease-in-out_infinite]" />
      </div>

      {/* Connection lines SVG */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <g className="animate-pulse">
          <line
            x1="15%"
            y1="25%"
            x2="35%"
            y2="45%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="35%"
            y1="45%"
            x2="55%"
            y2="35%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="55%"
            y1="35%"
            x2="75%"
            y2="55%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="75%"
            y1="55%"
            x2="90%"
            y2="40%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="65%"
            x2="45%"
            y2="55%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="45%"
            y1="55%"
            x2="65%"
            y2="70%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <line
            x1="65%"
            y1="70%"
            x2="85%"
            y2="60%"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
          />
          <circle cx="15%" cy="25%" r="4" fill="#dc2626" fillOpacity="0.5" />
          <circle cx="35%" cy="45%" r="5" fill="#dc2626" fillOpacity="0.6" />
          <circle cx="55%" cy="35%" r="6" fill="#dc2626" fillOpacity="0.7" />
          <circle cx="75%" cy="55%" r="5" fill="#dc2626" fillOpacity="0.6" />
          <circle cx="90%" cy="40%" r="4" fill="#dc2626" fillOpacity="0.5" />
          <circle cx="20%" cy="65%" r="4" fill="#dc2626" fillOpacity="0.5" />
          <circle cx="45%" cy="55%" r="5" fill="#dc2626" fillOpacity="0.6" />
          <circle cx="65%" cy="70%" r="5" fill="#dc2626" fillOpacity="0.6" />
          <circle cx="85%" cy="60%" r="4" fill="#dc2626" fillOpacity="0.5" />
        </g>
      </svg>

      {/* ===== GIANT CENTERED CMC GO WATERMARK ===== */}
      <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center select-none">
        <div className="text-center animate-[float_20s_ease-in-out_infinite]">
          <div
            className="font-black uppercase leading-[0.85] tracking-tighter text-slate-300/70"
            style={{ fontSize: "clamp(120px, 30vw, 400px)" }}
          >
            CMC
          </div>
          <div
            className="font-black uppercase leading-[0.85] tracking-tighter bg-gradient-to-r from-red-400/60 via-red-500/70 to-red-400/60 bg-clip-text text-transparent"
            style={{ fontSize: "clamp(120px, 30vw, 400px)" }}
          >
            GO
          </div>
        </div>
      </div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.4)_60%,rgba(248,250,252,0.8)_100%)]" />

      {/* Top-left branding */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6 z-10 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-11 w-11 rotate-12 rounded-full border-2 border-white bg-black shadow-lg flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-white font-bold leading-none">
              <span className="text-[11px] tracking-wide">CMC</span>
              <span className="-mt-0.5 text-[12px] font-semibold tracking-wide">
                Go
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Close */}
      {showClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-lg backdrop-blur transition-all hover:bg-red-50 hover:text-red-600"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes drift {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(30px) translateY(-20px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 py-6 sm:py-0">
        {/* Header */}
        <div className="mb-4 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900">
            {mode === "login" && "Go Together"}
            {mode === "register" && "Create Account"}
            {mode === "forgotPassword" && "Reset Password"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "login" && "Sign in to continue"}
            {mode === "forgotPassword" && "Enter your email to reset your password"}
            {mode === "register" &&
              (step === "credentials"
                ? "Let's start with your credentials"
                : "Tell us about your role")}
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
                      ? "bg-gradient-to-r from-red-500 to-rose-500"
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
            "rounded-2xl border border-slate-200/60 bg-white/70 p-5 sm:p-8 backdrop-blur-xl shadow-xl shadow-slate-900/5 transition-all duration-150",
            isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"
          )}
        >
          {/* LOGIN MODE */}
          {mode === "login" && (
            <div className="space-y-5">
              <div>
                <Label
                  htmlFor="login-email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </Label>
                <Input
                  id="login-email"
                  name="login-email"
                  type="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>

              <div>
                <Label
                  htmlFor="login-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="login-password"
                    name="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="border-slate-200 bg-white/80 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
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

              {renderError()}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode("forgotPassword");
                  }}
                  className="text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                onClick={handleLogin}
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
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
                  className={cn(
                    "font-medium text-red-700 hover:text-red-600 transition-all duration-200",
                    highlightCreateUser &&
                      "text-base font-bold text-red-800 underline underline-offset-2 decoration-2"
                  )}
                >
                  Create New User
                </button>
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {mode === "forgotPassword" && (
            <div className="space-y-5">
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Check Your Email
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    We've sent a password reset link to your email. Click the
                    link to set a new password.
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    The link expires in 1 hour. Check your spam folder if you
                    don't see it.
                  </p>
                  <Button
                    onClick={() => {
                      setResetSuccess(false);
                      setMode("login");
                    }}
                    className="mt-4 w-full bg-gradient-to-r from-red-600 to-rose-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <>
              <div className="text-center mb-4">
                <p className="text-sm text-slate-600">
                  Enter your email address and we'll send you a reset link.
                </p>
              </div>

              <div>
                <Label
                  htmlFor="forgot-email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  onKeyDown={e => {
                    if (e.key === "Enter" && email.trim()) {
                      forgotPasswordMutation.mutate({ email: email.trim() });
                    }
                  }}
                />
              </div>

              {renderError()}

              <Button
                onClick={() => {
                  if (email.trim()) {
                    forgotPasswordMutation.mutate({ email: email.trim() });
                  }
                }}
                disabled={forgotPasswordMutation.isPending || !email.trim()}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                <button
                  onClick={() => {
                    clearError();
                    setMode("login");
                  }}
                  className="font-medium text-red-700 hover:text-red-600"
                >
                  ← Back to login
                </button>
              </p>
                </>
              )}
            </div>
          )}

          {/* REGISTER: CREDENTIALS */}
          {mode === "register" && step === "credentials" && (
            <div className="space-y-5">
              <div>
                <Label
                  htmlFor="register-full-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Full Name
                </Label>
                <Input
                  id="register-full-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                />
              </div>

              <div>
                <Label
                  htmlFor="register-email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                />
              </div>

              <div>
                <Label
                  htmlFor="register-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="border-slate-200 bg-white/80 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
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

              {renderError()}

              <Button
                onClick={handleCredentialsNext}
                disabled={isCheckingEmail}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
              >
                {isCheckingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    resetForm();
                  }}
                  className="font-medium text-red-700 hover:text-red-600"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* REGISTER: REGION SELECTION */}
          {mode === "register" && step === "region" && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your region
                </h2>
                <p className="text-sm text-slate-600">
                  What region are you part of?
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Input
                  type="text"
                  value={regionQuery}
                  onChange={e => setRegionQuery(e.target.value)}
                  placeholder="Type to search regions..."
                  className="border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  autoFocus
                />
                {regionQuery && (
                  <button
                    onClick={() => setRegionQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Region dropdown list */}
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200/60 bg-white/60 p-2">
                {filteredRegions.length > 0 ? (
                  filteredRegions.map(region => (
                    <button
                      key={region}
                      onClick={() => handleRegionSelect(region)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-red-50"
                    >
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {region}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-3 py-4 text-slate-500">
                    <MapPin className="h-4 w-4 text-slate-300" />
                    <span className="text-sm">No regions found</span>
                  </div>
                )}
                {/* National Team option at bottom */}
                <button
                  onClick={() => handleRegionSelect(null)}
                  className="flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left transition-all hover:bg-slate-50 mt-1 pt-3"
                >
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    No specific region
                  </span>
                </button>
              </div>

              <button
                onClick={() => {
                  setRegionQuery("");
                  goToStep("credentials");
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: DISTRICT SELECTION */}
          {mode === "register" && step === "district" && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your district
                </h2>
                <p className="text-sm text-slate-600">
                  What district in {selectedRegion} are you part of?
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Input
                  type="text"
                  value={districtQuery}
                  onChange={e => setDistrictQuery(e.target.value)}
                  placeholder="Type to search districts..."
                  className="border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  autoFocus
                />
                {districtQuery && (
                  <button
                    onClick={() => setDistrictQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* District dropdown list */}
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200/60 bg-white/60 p-2">
                {searchFilteredDistricts.length > 0 ? (
                  searchFilteredDistricts.map(district => (
                    <button
                      key={district.id}
                      onClick={() => handleDistrictSelect(district.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-red-50"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {district.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-3 py-4 text-slate-500">
                    <Building2 className="h-4 w-4 text-slate-300" />
                    <span className="text-sm">No districts found</span>
                  </div>
                )}
                {/* No district option at bottom */}
                <button
                  onClick={() => handleDistrictSelect(null)}
                  className="flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left transition-all hover:bg-slate-50 mt-1 pt-3"
                >
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">No district</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setDistrictQuery("");
                  goToStep("region");
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          )}

          {/* REGISTER: CAMPUS SELECTION */}
          {mode === "register" && step === "campus" && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your campus
                </h2>
                <p className="text-sm text-slate-600">
                  What campus are you part of?
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Input
                  type="text"
                  value={campusQuery}
                  onChange={e => setCampusQuery(e.target.value)}
                  placeholder="Type to search or add new campus..."
                  className="border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  autoFocus
                />
                {campusQuery && (
                  <button
                    onClick={() => setCampusQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Campus dropdown list */}
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200/60 bg-white/60 p-2">
                {filteredCampuses.length > 0 ? (
                  filteredCampuses.map(campus => (
                    <button
                      key={campus.id}
                      onClick={() => handleCampusSelect(campus.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-red-50"
                    >
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {campus.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-3 px-3 py-4 text-slate-500">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-slate-300" />
                      <span className="text-sm">No campuses found</span>
                    </div>
                    {campusQuery.trim() && selectedDistrictId && (
                      <button
                        onClick={handleAddCampus}
                        disabled={isCreatingCampus}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                      >
                        {isCreatingCampus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add &ldquo;{campusQuery.trim()}&rdquo; as new campus
                      </button>
                    )}
                  </div>
                )}
                {/* Add campus button when searching (even with results) */}
                {filteredCampuses.length > 0 &&
                  campusQuery.trim() &&
                  selectedDistrictId &&
                  !filteredCampuses.some(
                    c =>
                      c.name.toLowerCase() === campusQuery.trim().toLowerCase()
                  ) && (
                    <button
                      onClick={handleAddCampus}
                      disabled={isCreatingCampus}
                      className="flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left transition-all hover:bg-red-50 mt-1 pt-3"
                    >
                      {isCreatingCampus ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Plus className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-red-700">
                        Add &ldquo;{campusQuery.trim()}&rdquo; as new campus
                      </span>
                    </button>
                  )}
                {/* No campus option at bottom */}
                <button
                  onClick={() => handleCampusSelect(null)}
                  className="flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left transition-all hover:bg-slate-50 mt-1 pt-3"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">No campus</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setCampusQuery("");
                  goToStep("district");
                }}
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
                    onClick={() => {
                      if (role.value === "OTHER") {
                        setSelectedRole("OTHER");
                      } else {
                        handleRoleSelect(role.value);
                      }
                    }}
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-xl border p-4 text-left shadow-sm shadow-slate-900/5 transition-all",
                      selectedRole === role.value && role.value === "OTHER"
                        ? "border-red-300 bg-white"
                        : "border-slate-200/70 bg-white/70 hover:border-red-300 hover:bg-white"
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{role.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {role.description}
                      </p>
                    </div>
                    {role.value !== "OTHER" && (
                      <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom role input for "Other" */}
              {selectedRole === "OTHER" && (
                <div className="space-y-3 rounded-lg border border-slate-200/70 bg-white/70 p-4">
                  <div>
                    <Label
                      htmlFor="custom-role"
                      className="text-sm font-medium text-slate-700"
                    >
                      What is your role?
                    </Label>
                    <Input
                      id="custom-role"
                      type="text"
                      value={customRoleTitle}
                      onChange={e => setCustomRoleTitle(e.target.value)}
                      placeholder="e.g., Pastor, Supporter, Parent..."
                      className="mt-1.5 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-2.5 py-1.5 border border-amber-200">
                    You'll be able to view the full map, but you won't be able
                    to see any personal details or edit anything.
                  </p>
                  <Button
                    onClick={() => goToStep("confirm")}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 py-4 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
                  >
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedRole(null);
                  setCustomRoleTitle("");
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

          {/* REGISTER: CATEGORY SELECTION (National Staff only) */}
          {mode === "register" && step === "category" && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Select your category
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose which group you belong to on the National Team.
                </p>
              </div>

              <div className="space-y-2">
                {nationalCategories.length > 0 ? (
                  <>
                    {nationalCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedNationalCategory(cat);
                          setIsNewNationalCategory(false);
                          setNewNationalCategoryName("");
                          goToStep("confirm");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:border-red-200 hover:bg-red-50/30",
                          selectedNationalCategory === cat &&
                            !isNewNationalCategory
                            ? "border-red-300 bg-red-50/50 ring-1 ring-red-200"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                          {cat.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {cat}
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 py-2">
                    No categories exist yet. Create a new one below.
                  </p>
                )}

                {/* Create new category */}
                {!isNewNationalCategory ? (
                  <button
                    onClick={() => setIsNewNationalCategory(true)}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-left transition-all hover:border-red-300 hover:bg-red-50/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">
                      Create new category
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 space-y-3">
                    <Input
                      value={newNationalCategoryName}
                      onChange={e => setNewNationalCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      autoFocus
                      onKeyDown={e => {
                        if (
                          e.key === "Enter" &&
                          newNationalCategoryName.trim()
                        ) {
                          setSelectedNationalCategory(
                            newNationalCategoryName.trim()
                          );
                          goToStep("confirm");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (newNationalCategoryName.trim()) {
                            setSelectedNationalCategory(
                              newNationalCategoryName.trim()
                            );
                            goToStep("confirm");
                          }
                        }}
                        disabled={!newNationalCategoryName.trim()}
                        className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white"
                        size="sm"
                      >
                        Continue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsNewNationalCategory(false);
                          setNewNationalCategoryName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Back button */}
              <button
                onClick={() => goToStep("role")}
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
                      {campuses.find(c => c.id === selectedCampusId)?.name ??
                        newlyCreatedCampusName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Role</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedRole === "OTHER"
                      ? customRoleTitle
                        ? `Other (${customRoleTitle})`
                        : "Other"
                      : getAvailableRoles().find(r => r.value === selectedRole)
                          ?.label}
                  </span>
                </div>
                {selectedNationalCategory && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Category</span>
                    <span className="text-sm font-medium text-slate-900">
                      {selectedNationalCategory}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Access</span>
                  <span className="text-sm font-medium text-slate-900 text-right">
                    {selectedRole === "OTHER"
                      ? "Map view only"
                      : getAvailableRoles().find(r => r.value === selectedRole)
                          ?.description}
                  </span>
                </div>
              </div>

              {renderError()}

              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 py-5 font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-red-500/30"
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
                onClick={() =>
                  goToStep(
                    selectedRole === "NATIONAL_STAFF" ? "category" : "role"
                  )
                }
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
