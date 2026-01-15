import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFlowProps = {
  onSuccess?: () => void;
};

type Candidate = {
  personId: string;
  name: string;
  primaryCampusId: number | null;
  primaryDistrictId: string | null;
  primaryRegion: string | null;
  primaryRole: string | null;
  nationalCategory: string | null;
  score: number;
};

type CreateStep = "name" | "campus" | "role" | "district" | "region" | "review";

type RoleChoice = {
  label: string;
  internalRole: string;
  roleTitle: string;
};

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

function deriveRoleFromPersonText(text: string | null | undefined): RoleChoice | null {
  if (!text) return null;
  const v = text.toLowerCase();
  if (v.includes("region") && v.includes("director")) {
    return { label: "Regional Director", internalRole: "REGION_DIRECTOR", roleTitle: text };
  }
  if (v.includes("district") && v.includes("director")) {
    return { label: "District Director", internalRole: "DISTRICT_DIRECTOR", roleTitle: text };
  }
  if (v.includes("co") && v.includes("director")) {
    return { label: "Co Director", internalRole: "CO_DIRECTOR", roleTitle: text };
  }
  if (v.includes("director")) {
    return { label: "Director", internalRole: "CAMPUS_DIRECTOR", roleTitle: text };
  }
  if (v.includes("intern")) {
    return { label: "Intern", internalRole: "STAFF", roleTitle: text };
  }
  if (v.includes("volunteer")) {
    return { label: "Volunteer", internalRole: "STAFF", roleTitle: text };
  }
  return { label: "Staff", internalRole: "STAFF", roleTitle: text };
}

export function AuthFlow({ onSuccess }: AuthFlowProps) {
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"signIn" | "create">("signIn");

  // Shared credentials (no gating before credentials on entry screen)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Create account onboarding state
  const [fullName, setFullName] = useState("");
  const [matchedPersonId, setMatchedPersonId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [campusId, setCampusId] = useState<number | null | undefined>(undefined);
  const [campusLabel, setCampusLabel] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null | undefined>(undefined);
  const [regionId, setRegionId] = useState<string | null | undefined>(undefined);

  const [role, setRole] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState<string | null>(null);

  const [createStep, setCreateStep] = useState<CreateStep>("name");
  const [stepHistory, setStepHistory] = useState<CreateStep[]>([]);

  const [campusQuery, setCampusQuery] = useState("");

  const districtsQuery = trpc.districts.publicList.useQuery();
  const campusesSearchQuery = trpc.campuses.searchPublic.useQuery(
    { query: campusQuery },
    { enabled: campusQuery.trim().length >= 2 }
  );

  const campusById = useMemo(() => {
    const map = new Map<number, { id: number; name: string; districtId: string }>();
    for (const c of (campusesSearchQuery.data ?? []) as any[]) {
      map.set(c.id, c);
    }
    return map;
  }, [campusesSearchQuery.data]);

  const campusOptions = useMemo(() => {
    return ((campusesSearchQuery.data ?? []) as any[]).map((c) => ({
      value: String(c.id),
      label: String(c.name),
      description: String(c.districtId),
    }));
  }, [campusesSearchQuery.data]);

  const matchesQuery = trpc.auth.findPersonMatches.useQuery(
    { fullName },
    { enabled: false }
  );

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      onSuccess?.();
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      onSuccess?.();
    },
  });

  const districtById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; region: string }>();
    for (const d of districtsQuery.data ?? []) {
      map.set(d.id, d);
    }
    return map;
  }, [districtsQuery.data]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const d of districtsQuery.data ?? []) {
      if (d.region) set.add(d.region);
    }
    return Array.from(set).sort();
  }, [districtsQuery.data]);

  const derivedRegionFromDistrict = useMemo(() => {
    if (!districtId) return null;
    return districtById.get(districtId)?.region ?? null;
  }, [districtId, districtById]);

  const districtOptions = useMemo(() => {
    return (districtsQuery.data ?? []).map((d) => ({
      value: d.id,
      label: d.name,
      description: d.region,
    }));
  }, [districtsQuery.data]);

  const regionOptions = useMemo(() => {
    return regions.map((r) => ({ value: r, label: r }));
  }, [regions]);

  const effectiveRegionId = useMemo(() => {
    if (campusId != null) {
      // When campus is selected we still store districtId; region is derived from that.
      if (districtId) return derivedRegionFromDistrict;
      return regionId;
    }
    if (districtId) return derivedRegionFromDistrict;
    return regionId;
  }, [campusId, districtId, derivedRegionFromDistrict, regionId]);

  const roleChoices: RoleChoice[] = useMemo(() => {
    if (campusId != null) {
      return [
        { label: "Volunteer", internalRole: "STAFF", roleTitle: "Volunteer" },
        { label: "Intern", internalRole: "STAFF", roleTitle: "Intern" },
        { label: "Staff", internalRole: "STAFF", roleTitle: "Staff" },
        { label: "Co Director", internalRole: "CO_DIRECTOR", roleTitle: "Co Director" },
        { label: "Director", internalRole: "CAMPUS_DIRECTOR", roleTitle: "Director" },
      ];
    }

    if (districtId) {
      return [
        { label: "District Staff", internalRole: "CAMPUS_DIRECTOR", roleTitle: "District Staff" },
        { label: "District Director", internalRole: "DISTRICT_DIRECTOR", roleTitle: "District Director" },
      ];
    }

    if (effectiveRegionId) {
      return [
        { label: "Regional Staff", internalRole: "DISTRICT_DIRECTOR", roleTitle: "Regional Staff" },
        { label: "Regional Director", internalRole: "REGION_DIRECTOR", roleTitle: "Regional Director" },
      ];
    }

    return [
      { label: "Field Director", internalRole: "FIELD_DIRECTOR", roleTitle: "Field Director" },
      { label: "National Staff", internalRole: "NATIONAL_STAFF", roleTitle: "National Staff" },
      { label: "National Director", internalRole: "NATIONAL_DIRECTOR", roleTitle: "National Director" },
      { label: "CMC Go Admin", internalRole: "CMC_GO_ADMIN", roleTitle: "CMC Go Admin" },
      { label: "Other (General scope)", internalRole: "NATIONAL_STAFF", roleTitle: "Other" },
    ];
  }, [campusId, districtId, effectiveRegionId]);

  const steps: CreateStep[] = useMemo(() => {
    const out: CreateStep[] = ["name"];

    const campusKnown = campusId != null;
    const campusExplicitlyUnknown = campusId === null;

    // Campus is only asked if not derivable from match.
    if (!campusKnown && !campusExplicitlyUnknown) {
      out.push("campus");
    }

    // Role is optional when we can derive it confidently.
    const roleKnown = !!role;
    if (!roleKnown) {
      out.push("role");
    }

    // If campus is known, district/region are derived and never asked.
    if (campusKnown) {
      out.push("review");
      return out;
    }

    // No-campus path: District required unless user wants region-only/national.
    if (!districtId) {
      out.push("district");
    }

    // Ask region only when there is no district anchor.
    if (!districtId) {
      out.push("region");
    }

    out.push("review");
    return out;
  }, [campusId, districtId, role]);

  const stepIndex = steps.indexOf(createStep);
  const progressText = useMemo(() => {
    if (mode !== "create") return null;
    const idx = Math.max(0, stepIndex);
    return `Step ${idx + 1} of ${steps.length}`;
  }, [mode, stepIndex, steps.length]);

  const goToStep = (next: CreateStep) => {
    if (next === createStep) return;
    setStepHistory((h) => [...h, createStep]);
    setCreateStep(next);
  };

  const goBack = () => {
    setStepHistory((h) => {
      const prev = h[h.length - 1];
      if (!prev) {
        setMode("signIn");
        return [];
      }
      setCreateStep(prev);
      return h.slice(0, -1);
    });
  };

  const goNext = () => {
    const idx = steps.indexOf(createStep);
    const next = steps[idx + 1];
    if (!next) return;
    goToStep(next);
  };

  const handlePickCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setMatchedPersonId(c.personId);
    setFullName(c.name);

    if (c.primaryCampusId != null) {
      setCampusId(c.primaryCampusId);
      setCampusLabel(null);
    }
    if (c.primaryDistrictId) {
      setDistrictId(c.primaryDistrictId);
    }
    if (c.primaryRegion) {
      setRegionId(c.primaryRegion);
    }

    const derived = deriveRoleFromPersonText(c.primaryRole ?? c.nationalCategory);
    if (derived) {
      setRole(derived.internalRole);
      setRoleTitle(derived.roleTitle);
    }
  };

  const handleSearchMatches = async () => {
    if (!fullName.trim()) return;
    await matchesQuery.refetch();
  };

  const canSubmitRegister = useMemo(() => {
    if (!email.trim()) return false;
    if (!password) return false;
    if (password.length < 8) return false;
    if (!fullName.trim()) return false;
    if (!role) return false;

    // Anchors are fail-closed server-side; client prevents obvious misses.
    if (["STAFF", "CO_DIRECTOR"].includes(role) && campusId == null) return false;
    if (role === "CAMPUS_DIRECTOR" && campusId == null && !districtId) return false;
    if (role === "DISTRICT_DIRECTOR" && !districtId && !effectiveRegionId) return false;
    if (role === "REGION_DIRECTOR" && !effectiveRegionId) return false;

    return true;
  }, [email, password, fullName, role, campusId, districtId, effectiveRegionId]);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{mode === "signIn" ? "Sign in" : "Create account"}</h1>
            {mode === "create" && progressText ? (
              <div className="text-xs text-muted-foreground">{progressText}</div>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signIn"
              ? "Use your email and password."
              : "We’ll auto-fill when we can — you can always go back."}
          </p>
        </div>

        {/* Entry Screen: credentials first (no multi-step gating) */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
            {mode === "create" && password.length > 0 && password.length < 8 ? (
              <div className="mt-1 text-xs text-muted-foreground">Password must be at least 8 characters.</div>
            ) : null}
          </div>

          {mode === "signIn" ? (
            <div className="pt-2">
              <Button
                className="w-full"
                onClick={() => signInMutation.mutate({ email, password })}
                disabled={signInMutation.isPending || !email.trim() || !password}
              >
                {signInMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                className="mt-2 w-full"
                variant="outline"
                onClick={() => {
                  setMode("create");
                  setCreateStep("name");
                  setStepHistory([]);
                }}
              >
                Create account
              </Button>
              {signInMutation.error ? (
                <div className="mt-2 text-sm text-red-600">{signInMutation.error.message}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {mode === "create" ? (
          <div className="mt-6 border-t pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium">Onboarding</div>
              <Button variant="ghost" size="sm" onClick={goBack}>
                Back
              </Button>
            </div>

            {createStep === "name" ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullName">Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setSelectedCandidate(null);
                      setMatchedPersonId(null);
                    }}
                    placeholder="First Last"
                    autoComplete="name"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchMatches}
                    disabled={matchesQuery.isFetching || fullName.trim().length < 2}
                  >
                    {matchesQuery.isFetching ? "Searching…" : "Find matches"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!fullName.trim()) return;
                      goNext();
                    }}
                    disabled={!fullName.trim()}
                  >
                    Next
                  </Button>
                </div>

                {matchesQuery.data?.candidates?.length ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Possible matches
                    </div>
                    <div className="space-y-2">
                      {matchesQuery.data.candidates.map((c: Candidate) => (
                        <button
                          key={c.personId}
                          type="button"
                          className={cn(
                            "w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent",
                            selectedCandidate?.personId === c.personId && "border-primary"
                          )}
                          onClick={() => handlePickCandidate(c)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{formatScore(c.score)}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {c.primaryCampusId != null ? `Campus #${c.primaryCampusId}` : "No campus"}
                            {c.primaryDistrictId ? ` • ${c.primaryDistrictId}` : ""}
                            {c.primaryRegion ? ` • ${c.primaryRegion}` : ""}
                            {c.primaryRole ? ` • ${c.primaryRole}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {createStep === "campus" ? (
              <div className="space-y-3">
                <div>
                  <Label>Campus</Label>
                  <div className="mt-2">
                    <SearchableCombobox
                      value={
                        campusId === undefined
                          ? undefined
                          : campusId === null
                            ? null
                            : String(campusId)
                      }
                      valueLabel={campusLabel ?? (campusId != null ? `Campus #${campusId}` : undefined)}
                      options={campusOptions}
                      searchValue={campusQuery}
                      onSearchValueChange={setCampusQuery}
                      placeholder="Select campus…"
                      searchPlaceholder="Search campus name…"
                      noneLabel="No campus"
                      emptyText={
                        campusQuery.trim().length < 2
                          ? "Type at least 2 characters"
                          : campusesSearchQuery.isFetching
                            ? "Searching…"
                            : "No campus found"
                      }
                      onChange={(next) => {
                        if (next === null) {
                          setCampusId(null);
                          setCampusLabel(null);
                          setDistrictId(null);
                          setRegionId(null);
                          setCampusQuery("");
                          return;
                        }

                        const id = Number(next);
                        const campus = campusById.get(id);
                        setCampusId(id);
                        setCampusLabel(campus?.name ?? null);
                        setDistrictId(campus?.districtId ?? null);
                        setRegionId(null);
                        if (campus?.name) {
                          setCampusQuery(campus.name);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={goNext} disabled={campusId === undefined}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {createStep === "role" ? (
              <div className="space-y-3">
                <div>
                  <Label>Role</Label>
                  <div className="mt-2 space-y-2">
                    {roleChoices.map((choice) => (
                      <button
                        key={choice.label}
                        type="button"
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent",
                          role === choice.internalRole && roleTitle === choice.roleTitle && "border-primary"
                        )}
                        onClick={() => {
                          setRole(choice.internalRole);
                          setRoleTitle(choice.roleTitle);
                        }}
                      >
                        <div className="font-medium">{choice.label}</div>
                        <div className="text-xs text-muted-foreground">Scope: {choice.internalRole}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={goNext} disabled={!role}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {createStep === "district" ? (
              <div className="space-y-3">
                <div>
                  <Label>District</Label>
                  <div className="mt-2">
                    <SearchableCombobox
                      value={districtId}
                      valueLabel={districtId && districtById.get(districtId)?.name ? districtById.get(districtId)!.name : undefined}
                      options={districtOptions}
                      placeholder="Select district…"
                      searchPlaceholder="Search districts…"
                      noneLabel="No district"
                      emptyText={districtsQuery.isLoading ? "Loading…" : "No district found"}
                      onChange={(next) => {
                        setDistrictId(next);
                        setRegionId(null);
                      }}
                      disabled={districtsQuery.isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={goNext}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {createStep === "region" ? (
              <div className="space-y-3">
                <div>
                  <Label>Region</Label>
                  <div className="mt-2">
                    <SearchableCombobox
                      value={regionId}
                      options={regionOptions}
                      placeholder="Select region…"
                      searchPlaceholder="Search regions…"
                      noneLabel="No region"
                      emptyText={regionOptions.length === 0 ? "No regions available" : "No region found"}
                      onChange={setRegionId}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={goNext}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {createStep === "review" ? (
              <div className="space-y-4">
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">Review</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>Name: {fullName || "—"}</div>
                    <div>Email: {email || "—"}</div>
                    <div>Role: {roleTitle || role || "—"}</div>
                    <div>
                      Campus:{" "}
                      {campusId === undefined ? "—" : campusId === null ? "None" : `#${campusId}`}
                    </div>
                    <div>District: {districtId === undefined ? "—" : districtId ?? "None"}</div>
                    <div>Region: {effectiveRegionId === undefined ? "—" : effectiveRegionId ?? "None"}</div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() =>
                    registerMutation.mutate({
                      email,
                      password,
                      fullName,
                      role: role!,
                      roleTitle: roleTitle ?? undefined,
                      campusId: campusId ?? null,
                      districtId,
                      regionId: effectiveRegionId,
                      matchedPersonId,
                    })
                  }
                  disabled={!canSubmitRegister || registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account…" : "Create account"}
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setMode("signIn");
                    setCreateStep("name");
                    setStepHistory([]);
                  }}
                >
                  Back to sign in
                </Button>

                {registerMutation.error ? (
                  <div className="text-sm text-red-600">{registerMutation.error.message}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "create" ? (
          <div className="mt-4">
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => {
                setMode("signIn");
                setCreateStep("name");
                setStepHistory([]);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
