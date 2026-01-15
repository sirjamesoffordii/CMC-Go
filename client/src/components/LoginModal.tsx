/**
 * Login/Registration Modal
 * Doctrine-compliant: email + password sign-in, optional onboarding wizard.
 */

import { Dialog, DialogContent } from "./ui/dialog";
import { AuthFlow } from "./auth/AuthFlow";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen max-h-screen w-screen max-w-none overflow-hidden border-none bg-gradient-to-br from-black via-red-950 to-black p-0 shadow-none">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-red-500/20 blur-3xl" />
          <div className="absolute -right-40 top-1/4 h-96 w-96 animate-pulse rounded-full bg-red-600/15 blur-3xl animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 animate-pulse rounded-full bg-red-700/10 blur-3xl animation-delay-4000" />

          <div className="absolute left-10 top-20 h-32 w-32 rotate-45 border-2 border-red-500/20" />
          <div className="absolute bottom-20 right-20 h-40 w-40 rotate-12 border-2 border-white/10" />
          <div className="absolute right-1/4 top-1/3 h-24 w-24 -rotate-12 border border-red-400/30" />

          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:50px_50px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />

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

        <div className="relative flex h-full items-center justify-center p-4">
          <AuthFlow onSuccess={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

