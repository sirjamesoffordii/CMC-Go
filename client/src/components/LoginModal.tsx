/**
 * Login/Registration Modal - PR 2
 * Handles self-registration with email verification
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<"start" | "verify">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"STAFF" | "CO_DIRECTOR" | "CAMPUS_DIRECTOR" | "DISTRICT_DIRECTOR" | "REGION_DIRECTOR">("STAFF");
  const [campusId, setCampusId] = useState<number | null>(null);
  
  const { data: campuses = [] } = trpc.campuses.list.useQuery();
  
  const startMutation = trpc.auth.start.useMutation({
    onSuccess: (data) => {
      setStep("verify");
      // In development, show the code
      if (process.env.NODE_ENV === "development" && (data as any).code) {
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
      setEmail("");
      setCode("");
      setFullName("");
      setRole("STAFF");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "start" ? "Sign Up / Login" : "Verify Email"}</DialogTitle>
        </DialogHeader>
        
        {step === "start" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role *</Label>
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
            
            <div>
              <Label htmlFor="campus">Campus *</Label>
              <Select 
                value={campusId?.toString() || ""} 
                onValueChange={(v) => setCampusId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id.toString()}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleStart} 
              disabled={!fullName || !email || !role || !campusId || startMutation.isPending}
              className="w-full"
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
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              We've sent a verification code to {email}. Please check your email and enter the code below.
            </p>
            
            <div>
              <Label htmlFor="code">Verification Code *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setStep("start")}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={!code || verifyMutation.isPending}
                className="flex-1"
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
            </div>
            
            {verifyMutation.error && (
              <p className="text-sm text-red-600">{verifyMutation.error.message}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

