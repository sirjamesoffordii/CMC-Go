import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.start.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: err => {
      setError(err.message || "Login failed. Please try again.");
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    // Let server handle validation and user existence check
    loginMutation.mutate({ email: trimmedEmail });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-96 w-96 animate-pulse rounded-full bg-red-600/15 blur-3xl animation-delay-2000" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Login form */}
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-red-400 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            CMC Go Access
          </div>
          <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-white">
            Login
          </h1>
          <p className="text-sm text-white/60">Enter your email to continue</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-medium uppercase tracking-wide text-white/80"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                disabled={loginMutation.isPending}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-red-600 py-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
