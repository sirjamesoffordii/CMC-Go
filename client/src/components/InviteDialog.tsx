import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Mail,
  MessageCircle,
  Link2,
  Users,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [emailList, setEmailList] = useState("");
  const [phoneList, setPhoneList] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inviteUrl = `${window.location.origin}/invite`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleBulkEmail = () => {
    const emails = emailList
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes("@"));

    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    const subject = encodeURIComponent("You're Invited to CMC Go!");
    const body = encodeURIComponent(
      `You've been invited to CMC Go!\n\nPlease click the link below to RSVP and share your details:\n\n${inviteUrl}\n\nWe look forward to seeing you there!`
    );

    // Use BCC for privacy
    const bcc = emails.join(",");
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, "_self");
    toast.success(`Opening email for ${emails.length} recipient(s)`);
  };

  const handleBulkText = () => {
    const phones = phoneList
      .split(/[,;\n]+/)
      .map(p => p.trim().replace(/[^\d+]/g, ""))
      .filter(p => p.length >= 7);

    if (phones.length === 0) {
      toast.error("Please enter at least one phone number");
      return;
    }

    const message = encodeURIComponent(
      `You're invited to CMC Go! RSVP here: ${inviteUrl}`
    );

    if (phones.length === 1) {
      // Single recipient — open SMS directly
      window.open(`sms:${phones[0]}?body=${message}`, "_self");
    } else {
      // Multiple recipients — copy message to clipboard and show numbers
      navigator.clipboard
        .writeText(
          `You're invited to CMC Go! RSVP here: ${inviteUrl}\n\nSend to:\n${phones.join("\n")}`
        )
        .then(() => {
          toast.success(
            `Message and ${phones.length} numbers copied to clipboard`
          );
        })
        .catch(() => {
          toast.error("Failed to copy to clipboard");
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Send Invites
          </DialogTitle>
          <DialogDescription>
            Share the invite link to collect RSVPs. Responses automatically sync
            with your contacts.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Link Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Invite Link</Label>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
              className="shrink-0"
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>

          {showQR && (
            <div className="flex justify-center py-3 bg-white rounded-lg border">
              <QRCodeSVG value={inviteUrl} size={180} />
            </div>
          )}
        </div>

        {/* Bulk Send Tabs */}
        <Tabs defaultValue="email" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Bulk Email
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              Bulk Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-3 mt-3">
            <Label className="text-sm">
              Enter email addresses (comma, semicolon, or newline separated)
            </Label>
            <Textarea
              ref={textareaRef}
              placeholder={"john@example.com\njane@example.com\n..."}
              value={emailList}
              onChange={e => setEmailList(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {
                  emailList
                    .split(/[,;\n]+/)
                    .filter(e => e.trim() && e.includes("@")).length
                }{" "}
                recipient(s)
              </span>
              <Button
                onClick={handleBulkEmail}
                disabled={!emailList.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Send Invite Emails
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 mt-3">
            <Label className="text-sm">
              Enter phone numbers (comma, semicolon, or newline separated)
            </Label>
            <Textarea
              placeholder={"(555) 123-4567\n(555) 987-6543\n..."}
              value={phoneList}
              onChange={e => setPhoneList(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {
                  phoneList
                    .split(/[,;\n]+/)
                    .filter(p => p.trim().replace(/[^\d+]/g, "").length >= 7)
                    .length
                }{" "}
                recipient(s)
              </span>
              <Button
                onClick={handleBulkText}
                disabled={!phoneList.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                Send Invite Texts
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Share */}
        <div className="border-t pt-4 mt-2">
          <Label className="text-sm font-medium text-gray-500 mb-2 block">
            Quick Share
          </Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCopyLink}
            >
              <Link2 className="w-4 h-4 mr-1.5" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: "CMC Go Invite",
                      text: "You're invited to CMC Go! RSVP here:",
                      url: inviteUrl,
                    })
                    .catch(() => {});
                } else {
                  handleCopyLink();
                }
              }}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
