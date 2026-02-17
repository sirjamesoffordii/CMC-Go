import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Heart, Share2, Check, X, Mail, MessageCircle, Facebook } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";

const GOAL_CENTS = 100_000_00; // $100,000
const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function Donate() {
  const [, setLocation] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Check URL params for success/cancel
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get("success") === "true";
  const isCanceled = urlParams.get("canceled") === "true";

  // Fetch campaign progress
  const { data: progress } = trpc.donations.progress.useQuery(undefined, {
    refetchInterval: 30_000, // refresh every 30s
  });

  const createCheckout = trpc.donations.createCheckoutSession.useMutation();

  const amountCents =
    selectedAmount !== null
      ? selectedAmount * 100
      : customAmount
        ? Math.round(parseFloat(customAmount) * 100)
        : 0;

  const totalRaised = progress?.totalRaisedCents ?? 0;
  const donorCount = progress?.donorCount ?? 0;
  const progressPercent = Math.min(
    (totalRaised / GOAL_CENTS) * 100,
    100
  );

  const donateUrl = typeof window !== "undefined" ? window.location.origin + "/donate" : "";

  async function handleDonate() {
    if (amountCents < 100) return;
    setIsProcessing(true);
    try {
      const result = await createCheckout.mutateAsync({
        amountCents,
        donorName: donorName || undefined,
        donorEmail: donorEmail || undefined,
      });
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setIsProcessing(false);
    }
  }

  async function handleShare() {
    const shareData = {
      title: "Help Missionaries Attend CMC 2026",
      text: "Support missionaries who can't afford to attend Campus Missions Conference. Every dollar counts!",
      url: donateUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(donateUrl);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDocModalOpen) {
          setIsDocModalOpen(false);
          e.preventDefault();
          return;
        }
        if (showQR) {
          setShowQR(false);
          e.preventDefault();
          return;
        }
        setLocation("/");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDocModalOpen, showQR, setLocation]);

  // Success/Cancel overlay
  if (isSuccess || isCanceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center">
          {isSuccess ? (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-emerald-600 fill-emerald-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Thank You!
              </h1>
              <p className="text-slate-600 text-lg mb-8">
                Your generous donation will help missionaries attend CMC 2026.
                God bless you!
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-8 h-8 text-slate-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Donation Canceled
              </h1>
              <p className="text-slate-600 text-lg mb-8">
                No worries! You can come back anytime to support missionaries.
              </p>
            </>
          )}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/donate")}
              className="bg-red-600 hover:bg-red-700 text-white h-12 text-base"
            >
              {isSuccess ? "Make Another Donation" : "Try Again"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-slate-600 h-12"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-4 text-slate-600 hover:text-slate-900 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Button>

        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 px-6 sm:px-10 py-8 sm:py-12 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-8 h-8 fill-white" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Send a Missionary to CMC
              </h1>
            </div>
            <p className="text-red-100 text-lg sm:text-xl max-w-2xl leading-relaxed">
              Help missionaries who can't afford to attend Campus Missions
              Conference 2026. Every dollar makes a difference.
            </p>
          </div>

          {/* Campaign Goal */}
          <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                $1,000 Goal
              </h2>
              <span className="text-sm text-slate-500 font-medium">
                100 people at $1,000 each
              </span>
            </div>
            <div className="mb-3">
              <Progress
                value={progressPercent}
                className="h-4 bg-slate-100"
              />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-bold text-red-600">
                  {formatDollars(totalRaised)}
                </span>
                <span className="text-slate-500 text-base ml-2">
                  of {formatDollars(GOAL_CENTS)} goal
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-slate-700">
                  {donorCount}
                </span>
                <span className="text-slate-500 text-sm ml-1">
                  {donorCount === 1 ? "donor" : "donors"}
                </span>
              </div>
            </div>
          </div>

          {/* Donation Form — directly under progress bar */}
          <div className="px-6 sm:px-10 py-8 sm:py-10 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-6">
              Make a Donation
            </h2>

            {/* Preset Amounts */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                  className={`
                    py-3 px-2 rounded-xl font-semibold text-base transition-all border-2
                    ${
                      selectedAmount === amount
                        ? "bg-black text-white border-black shadow-md scale-105"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }
                  `}
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Or enter a custom amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">
                  $
                </span>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  placeholder="Enter amount"
                  className="pl-8 h-12 text-lg border-slate-200 focus:border-red-400 focus:ring-red-400"
                />
              </div>
            </div>

            {/* Donor Info */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Name (optional)
                </label>
                <Input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Email (optional)
                </label>
                <Input
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-11 border-slate-200"
                />
              </div>
            </div>

            {/* Donate Button */}
            <Button
              onClick={handleDonate}
              disabled={amountCents < 100 || isProcessing}
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Processing...
                </span>
              ) : amountCents >= 100 ? (
                <>
                  <Heart className="w-5 h-5 mr-2 fill-white" />
                  Donate {formatDollars(amountCents)}
                </>
              ) : (
                "Select an Amount"
              )}
            </Button>

            <p className="text-center text-sm text-slate-400 mt-3">
              Secure payment processed by Stripe
            </p>
          </div>

          {/* What is CMC */}
          <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              What is CMC?
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed">
              Campus Missions Conference is Chi Alpha's largest
              gathering! Every four years, Chi Alpha Missionaries get to gather
              together for fellowship and training. It's a transformative
              experience that renews vision, deepens community, and equips
              missionaries for the work God has called them to.
            </p>
          </div>

          {/* Why This Matters */}
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              Why Your Gift Matters
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
                <p className="text-lg text-slate-700 leading-relaxed">
                  Many Chi Alpha missionaries serve sacrificially on college campuses,
                  often on tight budgets. The cost of travel, registration, and
                  lodging can prevent them from attending this once-every-four-years
                  gathering.
                </p>
              </div>
              <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
                <p className="text-lg text-slate-700 leading-relaxed">
                  <strong>Your donation goes directly</strong> to helping
                  missionaries who can't afford to attend CMC 2026. Whether it's
                  covering a registration fee, helping with travel costs, or
                  providing full sponsorship — every dollar makes it possible for
                  another missionary to be there.
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-red-600 hover:text-red-700 underline font-medium text-lg cursor-pointer"
                >
                  The Word God Gave Sir James for CMC
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-4 text-center">
            Help Spread the Word
          </h2>
          <p className="text-slate-600 text-center mb-6">
            Share this page so others can support missionaries too!
          </p>

          {/* Share Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {/* Native Share (mobile) / Copy Link (desktop) */}
            <Button
              onClick={handleShare}
              variant="outline"
              className="h-12 text-base border-slate-200 hover:bg-slate-50 gap-2"
            >
              {showShareSuccess ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  Share
                </>
              )}
            </Button>

            {/* Facebook */}
            <Button
              asChild
              variant="outline"
              className="h-12 text-base border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 gap-2"
            >
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(donateUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-5 h-5" />
                Facebook
              </a>
            </Button>

            {/* Email */}
            <Button
              asChild
              variant="outline"
              className="h-12 text-base border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 gap-2"
            >
              <a
                href={`mailto:?subject=${encodeURIComponent("Help Send a Missionary to CMC 2026")}&body=${encodeURIComponent(`Support missionaries who can't afford to attend Campus Missions Conference. Every dollar counts!\n\n${donateUrl}`)}`}
              >
                <Mail className="w-5 h-5" />
                Email
              </a>
            </Button>

            {/* SMS / Text Message */}
            <Button
              asChild
              variant="outline"
              className="h-12 text-base border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 gap-2"
            >
              <a
                href={`sms:${/iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(`Help send a missionary to CMC 2026! Every dollar counts. ${donateUrl}`)}`}
              >
                <MessageCircle className="w-5 h-5" />
                Text
              </a>
            </Button>
          </div>

          {/* Copy Link + QR Code row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(donateUrl);
                setShowShareSuccess(true);
                setTimeout(() => setShowShareSuccess(false), 2000);
              }}
              variant="outline"
              className="h-11 px-6 text-sm border-slate-200 hover:bg-slate-50 gap-2 w-full sm:w-auto"
            >
              {showShareSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Link Copied!
                </>
              ) : (
                "Copy Link"
              )}
            </Button>
            <Button
              onClick={() => setShowQR(!showQR)}
              variant="outline"
              className="h-11 px-6 text-sm border-slate-200 hover:bg-slate-50 gap-2 w-full sm:w-auto"
            >
              {showQR ? "Hide QR Code" : "Show QR Code"}
            </Button>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="mt-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <QRCodeSVG
                  value={donateUrl}
                  size={200}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Scan to open the donation page
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-sm text-slate-400">
            CMC Go · Campus Missions Conference 2026
          </p>
        </div>
      </div>

      {/* Google Doc Modal — same as WhyInvitationsMatter page */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85dvh] sm:h-[90vh] flex flex-col max-h-[calc(100dvh-16px)]">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
              <h2 className="text-base sm:text-xl font-semibold text-slate-900 truncate">
                The Word God Gave Sir James for CMC
              </h2>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <iframe
                src="https://docs.google.com/document/d/1vo23ldjIphJSz7tvj8h3FQoAtREvzUh31A5zJ__M81I/preview?usp=sharing&embedded=true"
                className="w-full h-full border-0"
                title="The Word God Gave Sir James for CMC"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
