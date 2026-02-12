import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MenuPanel } from "@/components/ui/menu-panel";
import {
  Copy,
  Mail,
  MessageCircle,
  Check,
  RotateCcw,
  Share2,
  Pencil,
} from "lucide-react";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_INVITATION_MESSAGE = `Hey,

We're exploring CMC Go as a way to coordinate toward CMC. It's a map-first web app that replaces spreadsheets with a shared visual, helping leaders at every level see who's been personally invited, surfacing who needs support, and bringing clarity to each person's decision journey.

When you have a moment, I would value your thoughts. Take a look and let me know if this feels like a helpful tool in mobilizing people toward CMC. If so, I'd love for you to join us in using it, updating the picture as things change and building shared momentum.`;

/** Detect iOS/iPadOS vs Android for SMS URI format */
function getSmsUri(body: string): string {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const encoded = encodeURIComponent(body);

  // iOS is picky: include ?&body= even with no recipient.
  if (isIOS) return `sms:?&body=${encoded}`;

  // Android/others: sms:?body= is common. Some desktop handlers ignore body.
  return `sms:?body=${encoded}`;
}

/** Open a popup window centered on screen */
function openSharePopup(url: string, name: string) {
  const width = 600;
  const height = 500;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

function openInNewTab(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Copy text to clipboard with fallback */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const [messageCopied, setMessageCopied] = useState(false);
  const [groupMeCopied, setGroupMeCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    DEFAULT_INVITATION_MESSAGE
  );
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullMessage = `${customMessage}\n\n${siteUrl}`;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMessageCopied(false);
      setGroupMeCopied(false);
      setIsEditing(false);
    }
  }, [open]);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleCopyMessage = useCallback(async () => {
    await copyToClipboard(fullMessage);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  }, [fullMessage]);

  const handleResetMessage = useCallback(() => {
    setCustomMessage(DEFAULT_INVITATION_MESSAGE);
  }, []);

  const handleEmailShare = useCallback(() => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      tf: "1",
      su: "Check out CMC Go — Coordinate toward CMC together",
      body: fullMessage,
    });

    // Force Gmail account index 0 (primary account) for the current browser profile.
    // Note: if the user isn't signed into Gmail, Google will still prompt for login.
    const gmailUrl = `https://mail.google.com/mail/u/0/?${params.toString()}`;
    openInNewTab(gmailUrl);
  }, [fullMessage]);

  const handleSMSShare = useCallback(() => {
    // Prefer Web Share API when available:
    // - Windows desktop: opens the Windows share sheet (Phone Link can appear as a target)
    // - iPhone/iPad: opens the iOS share sheet (Messages draft prefilled)
    const share = navigator.share;
    const canShare = navigator.canShare;
    if (share && (!canShare || canShare({ text: fullMessage }))) {
      share({ text: fullMessage, title: "CMC Go" }).catch(() => {
        // User cancel or share failure → fall through to platform-specific fallbacks
        const ua = navigator.userAgent;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
        if (isMobile) {
          window.location.href = getSmsUri(fullMessage);
          return;
        }

        // Desktop fallback: Google Messages Web can't accept a prefilled body via URL,
        // so copy the message and open a new conversation page.
        void copyToClipboard(fullMessage);
        openInNewTab("https://messages.google.com/web/conversations/new");
      });
      return;
    }

    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    if (isMobile) {
      window.location.href = getSmsUri(fullMessage);
      return;
    }

    // Desktop fallback when Web Share isn't available.
    void copyToClipboard(fullMessage);
    openInNewTab("https://messages.google.com/web/conversations/new");
  }, [fullMessage]);

  const handleGroupMeShare = useCallback(async () => {
    await copyToClipboard(fullMessage);
    setGroupMeCopied(true);
    setTimeout(() => setGroupMeCopied(false), 3000);
    window.open("https://web.groupme.com/chats", "_blank");
  }, [fullMessage]);

  const handleFacebookShare = useCallback(() => {
    const url = encodeURIComponent(siteUrl);
    const quote = encodeURIComponent(customMessage);
    openSharePopup(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
      "facebook-share"
    );
  }, [siteUrl, customMessage]);

  const handleTwitterShare = useCallback(() => {
    const maxLen = 280 - siteUrl.length - 5;
    const trimmed =
      customMessage.length > maxLen
        ? customMessage.slice(0, maxLen - 1) + "\u2026"
        : customMessage;
    const text = encodeURIComponent(trimmed);
    const url = encodeURIComponent(siteUrl);
    openSharePopup(
      `https://x.com/intent/tweet?text=${text}&url=${url}`,
      "x-share"
    );
  }, [siteUrl, customMessage]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  }, [fullMessage]);

  const isMessageModified = customMessage !== DEFAULT_INVITATION_MESSAGE;

  return (
    <MenuPanel
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose();
      }}
      title="Share CMC Go"
      icon={<Share2 className="w-4 h-4" />}
      maxWidth="980px"
    >
      <div className="space-y-4 md:space-y-3">
        {/* Info Banner */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-3">
          <p className="text-sm font-semibold text-black mb-1">
            Share the CMC Go app with other leaders
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            This is for sending the CMC Go app to other leaders, not for
            inviting people to CMC. Use this to help other leaders coordinate
            and track invitations together.
          </p>
        </div>

        {/* Message + Share — side-by-side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 md:gap-3">
          {/* Message — always visible */}
          <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
          {/* Message header with actions */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-black uppercase tracking-wide">
              Invitation Message
              {isMessageModified && (
                <span className="ml-2 text-[10px] font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded normal-case tracking-normal">
                  Edited
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {isMessageModified && (
                <button
                  onClick={handleResetMessage}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors ${
                  isEditing
                    ? "text-red-600 bg-red-50 font-medium"
                    : "text-gray-400 hover:text-black hover:bg-gray-100"
                }`}
              >
                <Pencil className="w-3 h-3" />
                {isEditing ? "Done" : "Edit"}
              </button>
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                {messageCopied ? (
                  <>
                    <Check className="w-3 h-3 text-red-600" />
                    <span className="text-red-600 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Message body — editable or read-only */}
          <div className="p-4 bg-white">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Write your personalized invitation message..."
                  className="min-h-[160px] text-sm resize-none border-gray-200 focus:border-red-300 focus:ring-red-200 rounded-lg"
                />
                <p className="text-[11px] text-gray-400 tabular-nums text-right">
                  {customMessage.length} characters
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {customMessage}
              </p>
            )}
            {/* URL that will be appended */}
            <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 font-mono">
              {siteUrl}
            </p>
          </div>
        </div>

        {/* Divider — mobile only */}
        <div className="relative md:hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 uppercase tracking-widest font-medium text-[10px]">
              Share via
            </span>
          </div>
        </div>

        {/* Share Options — 1 row on desktop, 3 cols on mobile */}
        <div className="flex flex-col items-center justify-center">
          <span className="hidden md:block text-xs text-gray-400 uppercase tracking-widest font-medium text-[10px] mb-2">
            Share via
          </span>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-2 md:justify-items-center">
          {/* Email */}
          <button
            onClick={handleEmailShare}
            className="flex flex-col items-center gap-2 p-3 md:p-2 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <Mail className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              Email
            </span>
          </button>

          {/* SMS/Text */}
          <button
            onClick={handleSMSShare}
            className="flex flex-col items-center gap-2 p-3 md:p-2 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <MessageCircle className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              Text
            </span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              WhatsApp
            </span>
          </button>

          {/* GroupMe */}
          <button
            onClick={handleGroupMeShare}
            className="relative flex flex-col items-center gap-2 p-3 md:p-2 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4 14h-8v-2h8v2zm0-3h-8v-2h8v2zm0-3h-8V8h8v2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              {groupMeCopied ? "Copied!" : "GroupMe"}
            </span>
            {groupMeCopied && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-600">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebookShare}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              Facebook
            </span>
          </button>

          {/* X (Twitter) */}
          <button
            onClick={handleTwitterShare}
            className="flex flex-col items-center gap-2 p-3 md:p-2 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-black transition-colors">
              X
            </span>
          </button>
        </div>
        </div>
        {/* Close 2-column grid */}
        </div>
      </div>
    </MenuPanel>
  );
}

// Export the invitation message for use elsewhere
export const SHARE_INVITATION_MESSAGE = DEFAULT_INVITATION_MESSAGE;
