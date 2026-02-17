import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Send, ChevronDown, ChevronUp } from "lucide-react";

const ROLES = [
  "Campus Director",
  "Campus Co-Director",
  "Campus Intern",
  "Campus Staff",
  "Campus Volunteer",
  "District Director",
  "District Staff",
  "Region Director",
  "Regional Staff",
  "National Staff",
  "Other",
] as const;

const NEED_TYPES = [
  "Registration",
  "Transportation",
  "Housing",
  "Other",
] as const;

export default function Invite() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [needType, setNeedType] = useState<string>("");
  const [needAmount, setNeedAmount] = useState("");
  const [needDescription, setNeedDescription] = useState("");

  // Fetch campuses (public endpoint)
  const campusesQuery = trpc.invite.campuses.useQuery();

  // Group campuses by district
  const groupedCampuses = useMemo(() => {
    if (!campusesQuery.data) return [];
    const groups = new Map<
      string,
      Array<{
        id: number;
        name: string;
        districtId: string;
        districtName: string;
        region: string;
      }>
    >();
    for (const c of campusesQuery.data) {
      const key = c.districtName || c.districtId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([district, items]) => ({
        district,
        campuses: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [campusesQuery.data]);

  const respondMutation = trpc.invite.respond.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: err => {
      toast.error(err.message || "Failed to submit. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !campusId || !role || !response) {
      toast.error("Please fill in all required fields.");
      return;
    }

    respondMutation.mutate({
      name: name.trim(),
      campusId: parseInt(campusId, 10),
      role,
      response: response as "Yes" | "Maybe" | "No",
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      needType: needType
        ? (needType as "Registration" | "Transportation" | "Housing" | "Other")
        : undefined,
      needAmount: needAmount
        ? Math.round(parseFloat(needAmount) * 100)
        : undefined,
      needDescription: needDescription.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Thank You!
            </h2>
            <p className="text-gray-600">
              Your response has been recorded. We&apos;ll be in touch with more
              details about CMC Go.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <img
              src="/logo.svg"
              alt="CMC Go"
              className="h-16 w-16"
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <CardTitle className="text-2xl">CMC Go Invite</CardTitle>
          <CardDescription>
            You've been invited to CMC Go! Please fill out your details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Campus */}
            <div className="space-y-1.5">
              <Label htmlFor="campus">
                Campus <span className="text-red-500">*</span>
              </Label>
              <Select value={campusId} onValueChange={setCampusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your campus" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {campusesQuery.isLoading && (
                    <SelectItem value="_loading" disabled>
                      Loading campuses...
                    </SelectItem>
                  )}
                  {groupedCampuses.map(group => (
                    <div key={group.district}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                        {group.district}
                      </div>
                      {group.campuses.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Response */}
            <div className="space-y-1.5">
              <Label>
                Will you attend CMC Go? <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["Yes", "Maybe", "No"] as const).map(r => (
                  <Button
                    key={r}
                    type="button"
                    variant={response === r ? "default" : "outline"}
                    className={
                      response === r
                        ? r === "Yes"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : r === "Maybe"
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        : ""
                    }
                    onClick={() => setResponse(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            {/* Optional fields toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              {showOptional ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide optional fields
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Add contact info &amp; needs (optional)
                </>
              )}
            </button>

            {showOptional && (
              <div className="space-y-4 border-t pt-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                {/* Need */}
                <div className="space-y-1.5">
                  <Label>Do you have a financial need?</Label>
                  <Select value={needType} onValueChange={setNeedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="No need" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No need</SelectItem>
                      {NEED_TYPES.map(t => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needType && needType !== "_none" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="needAmount">Amount Needed ($)</Label>
                      <Input
                        id="needAmount"
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={needAmount}
                        onChange={e => setNeedAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="needDesc">Description</Label>
                      <Input
                        id="needDesc"
                        placeholder="Brief description"
                        value={needDescription}
                        onChange={e => setNeedDescription(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={
                respondMutation.isPending ||
                !name ||
                !campusId ||
                !role ||
                !response
              }
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base"
            >
              {respondMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Response
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
