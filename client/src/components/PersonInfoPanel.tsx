import { useState, useRef, useEffect, useMemo } from "react";
import { Person, Campus, District } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { BottomSheet } from "./ui/bottom-sheet";
import { GiveDialog } from "./GiveDialog";
import { toast } from "sonner";
import {
  ExternalLink,
  Phone,
  Mail,
  Heart,
  Send,
  DollarSign,
  User,
  MapPin,
  Copy,
  Clock,
  MessageSquare,
  Smartphone,
  Globe,
} from "lucide-react";

interface PersonInfoPanelProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allCampuses?: Campus[];
  allDistricts?: District[];
}

export function PersonInfoPanel({
  person,
  open,
  onOpenChange,
  allCampuses = [],
  allDistricts = [],
}: PersonInfoPanelProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState("");
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);
  const [giveNeed, setGiveNeed] = useState<{
    needId: number;
    amount: number | null;
    fundsReceived: number | null;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // ── Data fetching ──
  const { data: personNeeds = [] } = trpc.needs.byPerson.useQuery(
    { personId: person?.personId ?? "" },
    { enabled: !!person && open }
  );

  const { data: personNotes = [] } = trpc.notes.byPerson.useQuery(
    { personId: person?.personId ?? "" },
    { enabled: !!person && open }
  );

  // ── Derived data ──
  const activeNeeds = useMemo(
    () => personNeeds.filter(n => n.isActive),
    [personNeeds]
  );

  const messages = useMemo(
    () =>
      [...personNotes]
        .filter(n => n.noteType === "MESSAGE")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [personNotes]
  );

  const campus = useMemo(
    () =>
      person?.primaryCampusId
        ? allCampuses.find(c => c.id === person.primaryCampusId)
        : undefined,
    [person, allCampuses]
  );

  const district = useMemo(
    () =>
      person?.primaryDistrictId
        ? allDistricts.find(d => d.id === person.primaryDistrictId)
        : undefined,
    [person, allDistricts]
  );

  // ── Funding totals ──
  const fundingTotals = useMemo(() => {
    const totalAmount = activeNeeds.reduce((s, n) => s + (n.amount ?? 0), 0);
    const totalReceived = activeNeeds.reduce(
      (s, n) => s + (n.fundsReceived ?? 0),
      0
    );
    const pct =
      totalAmount > 0
        ? Math.min(Math.round((totalReceived / totalAmount) * 100), 100)
        : 0;
    return { totalAmount, totalReceived, pct };
  }, [activeNeeds]);

  // ── Mutations ──
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setNewMessage("");
      utils.notes.byPerson.invalidate({ personId: person?.personId ?? "" });
      toast.success("Message sent");
    },
    onError: error => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // ── Effects ──
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, open]);

  // ── Early return ──
  if (!person) return null;

  // ── Handlers ──
  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    createNote.mutate({
      personId: person.personId,
      content: trimmed,
      noteType: "MESSAGE",
      category: "INTERNAL",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openGiveDialog = (need: (typeof activeNeeds)[0]) => {
    setGiveNeed({
      needId: need.id,
      amount: need.amount,
      fundsReceived: need.fundsReceived,
    });
    setGiveDialogOpen(true);
  };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // ── Content ──
  const content = (
    <div className="flex flex-col h-full">
      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-start gap-3">
          {/* Avatar circle */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {(person.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {person.name || "Unknown"}
            </h2>
            {person.primaryRole && (
              <p className="text-sm text-gray-500">{person.primaryRole}</p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {campus && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {campus.name}
                </span>
              )}
              {district && <span>· {district.name}</span>}
              {person.primaryRegion && <span>· {person.primaryRegion}</span>}
            </div>
          </div>
        </div>

        {/* ═══ QUICK ACTION BUTTONS ═══ */}
        <div className="flex items-center gap-2 mt-3">
          {/* Call */}
          {person.phone ? (
            <a
              href={`tel:${person.phone}`}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-700"
            >
              <Phone className="h-5 w-5" />
              <span className="text-[11px] font-medium">Call</span>
            </a>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
              <Phone className="h-5 w-5" />
              <span className="text-[11px] font-medium">Call</span>
            </div>
          )}

          {/* Text */}
          {person.phone ? (
            <a
              href={`sms:${person.phone}`}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700"
            >
              <Smartphone className="h-5 w-5" />
              <span className="text-[11px] font-medium">Text</span>
            </a>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
              <Smartphone className="h-5 w-5" />
              <span className="text-[11px] font-medium">Text</span>
            </div>
          )}

          {/* Email */}
          {person.email ? (
            <a
              href={`mailto:${person.email}`}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700"
            >
              <Mail className="h-5 w-5" />
              <span className="text-[11px] font-medium">Email</span>
            </a>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
              <Mail className="h-5 w-5" />
              <span className="text-[11px] font-medium">Email</span>
            </div>
          )}

          {/* In-App Message (scroll to thread) */}
          <button
            type="button"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors text-orange-700 relative"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[11px] font-medium">Message</span>
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {messages.length > 9 ? "9+" : messages.length}
              </span>
            )}
          </button>
        </div>

        {/* Contact details (subtle text below buttons) */}
        {(person.phone || person.email) && (
          <div className="mt-2 text-[11px] text-gray-400 space-y-0.5">
            {person.phone && <p>📱 {person.phone}</p>}
            {person.email && <p>✉️ {person.email}</p>}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-5">
          {/* ═══ NEEDS & PROGRESS ═══ */}
          {activeNeeds.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-red-500" />
                Needs & Progress
              </h3>

              {/* Overall progress */}
              {fundingTotals.totalAmount > 0 && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">
                      Overall Funding
                    </span>
                    <span className="font-bold text-gray-900">
                      {fundingTotals.pct}%
                    </span>
                  </div>
                  <Progress value={fundingTotals.pct} className="h-2.5" />
                  <p className="text-xs text-gray-500 mt-1.5">
                    ${(fundingTotals.totalReceived / 100).toFixed(2)} of $
                    {(fundingTotals.totalAmount / 100).toFixed(2)} received
                  </p>
                </div>
              )}

              {/* Individual needs */}
              <div className="space-y-2">
                {activeNeeds.map(need => {
                  const received = need.fundsReceived ?? 0;
                  const amount = need.amount ?? 0;
                  const pct =
                    amount > 0
                      ? Math.min(
                          Math.round((received / amount) * 100),
                          100
                        )
                      : 0;
                  const isFunded = amount > 0 && received >= amount;

                  return (
                    <div
                      key={need.id}
                      className={`p-3 rounded-lg border ${
                        isFunded
                          ? "border-green-200 bg-green-50"
                          : pct > 0
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isFunded ? "default" : "outline"}
                            className={
                              isFunded
                                ? "bg-green-600"
                                : pct > 0
                                  ? "border-yellow-500 text-yellow-700"
                                  : "border-red-500 text-red-700"
                            }
                          >
                            {need.type}
                          </Badge>
                          {isFunded && (
                            <span className="text-green-600 text-xs font-semibold">
                              ✓ Funded
                            </span>
                          )}
                        </div>
                        {!isFunded && user && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-100"
                            onClick={() => openGiveDialog(need)}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Give
                          </Button>
                        )}
                      </div>
                      {need.description && need.description !== need.type && (
                        <p className="text-xs text-gray-600 mb-1.5">
                          {need.description}
                        </p>
                      )}
                      {amount > 0 && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">
                              ${(received / 100).toFixed(2)} / $
                              {(amount / 100).toFixed(2)}
                            </span>
                            <span className="font-medium">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFunded
                                  ? "bg-green-500"
                                  : pct > 0
                                    ? "bg-yellow-500"
                                    : "bg-gray-300"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeNeeds.length === 0 && (
            <section className="text-center py-4">
              <p className="text-sm text-gray-400">No active needs</p>
            </section>
          )}

          <Separator />

          {/* ═══ WAYS TO GIVE ═══ */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-600" />
              Ways to Give
            </h3>

            <div className="space-y-2">
              {/* CashApp */}
              {person.cashapp && (
                <a
                  href={`https://cash.app/${person.cashapp.startsWith("$") ? person.cashapp : "$" + person.cashapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#00D632] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    $
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Cash App
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {person.cashapp}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                </a>
              )}

              {/* Venmo */}
              {person.venmo && (
                <a
                  href={`https://venmo.com/${person.venmo.startsWith("@") ? person.venmo.slice(1) : person.venmo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#008CFF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    V
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Venmo</p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {person.venmo}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </a>
              )}

              {/* Zelle */}
              {person.zelle && (
                <button
                  type="button"
                  onClick={() => copyToClipboard("Zelle", person.zelle!)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#6D1ED4] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    Z
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Zelle</p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {person.zelle}
                    </p>
                  </div>
                  <Copy className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </button>
              )}

              {/* US Missions / AG Giving */}
              <a
                href="https://giving.ag.org/donate"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    US Missions Giving
                  </p>
                  <p className="text-xs text-gray-500">
                    giving.ag.org/donate
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
              </a>

              {/* No payment methods fallback */}
              {!person.cashapp && !person.venmo && !person.zelle && (
                <p className="text-xs text-gray-400 text-center py-1">
                  No CashApp, Venmo, or Zelle on file — use US Missions Giving above or contact directly.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* ═══ PROFILE LINKS ═══ */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4 text-orange-500" />
              Profile Links
            </h3>

            <div className="space-y-2">
              {/* Mighty Networks Profile */}
              {person.mightyProfileUrl && (
                <a
                  href={person.mightyProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Mighty Profile
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      Chi Alpha Community
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-600" />
                </a>
              )}

              {!person.mightyProfileUrl && (
                <p className="text-xs text-gray-400 text-center py-1">
                  No Mighty Profile connected
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* ═══ MESSAGE THREAD (IN-APP) ═══ */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                In-App Messages
                {messages.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {messages.length}
                  </Badge>
                )}
              </h3>
              <p className="text-[10px] text-gray-400">
                Notifies {person.name?.split(" ")[0] || "them"} in the app
              </p>
            </div>

            {/* Message list */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scroll-smooth">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No messages yet</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Send a message — they'll be notified in the app
                  </p>
                </div>
              )}
              {messages.map(note => {
                const isMe = note.createdBy === user?.email;
                return (
                  <div
                    key={note.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      {!isMe && note.createdBy && (
                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">
                          {note.createdBy}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {note.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 flex items-center gap-1 ${
                          isMe ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(note.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            {user && (
              <div className="mt-3 flex gap-2 items-end">
                <Textarea
                  placeholder={`Message ${person.name?.split(" ")[0] || "them"}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="resize-none flex-1 min-h-[40px] text-sm rounded-xl"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={handleSendMessage}
                  disabled={createNote.isPending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* ═══ GIVE DIALOG ═══ */}
      {giveNeed && (
        <GiveDialog
          open={giveDialogOpen}
          onOpenChange={open => {
            setGiveDialogOpen(open);
            if (!open) setGiveNeed(null);
          }}
          personId={person.personId}
          personName={person.name ?? "Unknown"}
          needId={giveNeed.needId}
          needAmount={giveNeed.amount}
          fundsReceived={giveNeed.fundsReceived}
          cashapp={person.cashapp}
          zelle={person.zelle}
          venmo={person.venmo}
        />
      )}
    </div>
  );

  // ── Render ──
  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={person.name || "Person Info"}
        defaultSnap={0}
        snapPoints={[100]}
        closeOnBackdrop={true}
        showCloseButton={true}
        showSnapPoints={false}
        compactHeader={true}
        fullScreen={true}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{person.name || "Person Info"}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
