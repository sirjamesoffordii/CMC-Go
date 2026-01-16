// @ts-nocheck
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";

export function Login() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"STAFF" | "CO_DIRECTOR" | "CAMPUS_DIRECTOR" | "DISTRICT_DIRECTOR" | "REGION_DIRECTOR" | "ADMIN">("STAFF");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [showNewCampus, setShowNewCampus] = useState(false);
  const [newCampusName, setNewCampusName] = useState("");

  // Fetch dropdown options
  const { data: regions = [] } = trpc.meta.regions.useQuery();
  const { data: districts = [] } = trpc.meta.districtsByRegion.useQuery({ regionId });
  const { data: campuses = [] } = trpc.meta.campusesByDistrict.useQuery({ districtId });

  const loginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: () => {
      setLocation("/");
    },
    onError: (error) => {
      alert(`Login failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    loginMutation.mutate({
      fullName,
      role,
      regionId,
      districtId,
      campusId: showNewCampus ? null : campusId,
      newCampusName: showNewCampus ? newCampusName : null,
      newCampusDistrictId: showNewCampus ? districtId : null,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">CMC Go Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="CO_DIRECTOR">Co-Director</SelectItem>
                <SelectItem value="CAMPUS_DIRECTOR">Campus Director</SelectItem>
                <SelectItem value="DISTRICT_DIRECTOR">District Director</SelectItem>
                <SelectItem value="REGION_DIRECTOR">Region Director</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="region">Region</Label>
            <Select value={regionId || "none"} onValueChange={(value) => {
              setRegionId(value === "none" ? null : value);
              setDistrictId(null);
              setCampusId(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No region</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="district">District</Label>
            <Select
              value={districtId || "none"}
              onValueChange={(value) => {
                setDistrictId(value === "none" ? null : value);
                setCampusId(null);
                setShowNewCampus(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No district</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="campus">Campus</Label>
            <Select
              value={showNewCampus ? "new" : (campusId?.toString() || "none")}
              onValueChange={(value) => {
                if (value === "new") {
                  setShowNewCampus(true);
                  setCampusId(null);
                } else if (value === "none") {
                  setShowNewCampus(false);
                  setCampusId(null);
                } else {
                  setShowNewCampus(false);
                  setCampusId(parseInt(value));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No campus</SelectItem>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id.toString()}>
                    {campus.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Add new campus...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showNewCampus && (
            <div>
              <Label htmlFor="newCampusName">New Campus Name</Label>
              <Input
                id="newCampusName"
                value={newCampusName}
                onChange={(e) => setNewCampusName(e.target.value)}
                required
                placeholder="Enter campus name"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
