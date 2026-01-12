import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Copy, 
  Mail, 
  MessageCircle, 
  Check,
  RotateCcw,
  Share2,
  ChevronDown,
  ChevronUp,
  Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_INVITATION_MESSAGE = `Hey,

We're exploring CMC Go as a way to coordinate toward CMC. It's a map-first web app that replaces spreadsheets with a shared visual, helping leaders at every level see who's been personally invited, surfacing who needs support, and bringing clarity to each person's decision journey.

When you have a moment, we'd really value your thoughts. Take a look and let us know if this feels like a helpful way for us to coordinate toward CMC. If so, we'd love for you to join us in using it as we invite and walk with people toward CMC, keeping our areas up to date and building shared momentum together.`;

const SHORT_MESSAGE = `Check out CMC Go - a map-first web app to coordinate CMC invitations and track who needs support. Would love your thoughts!`;

export function ShareModal({ open, onClose }: ShareModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState(DEFAULT_INVITATION_MESSAGE);
  const [isEditing, setIsEditing] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLinkCopied(false);
      setMessageCopied(false);
    }
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`${customMessage}\n\n${siteUrl}`);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleResetMessage = () => {
    setCustomMessage(DEFAULT_INVITATION_MESSAGE);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Check out CMC Go - Coordinate toward CMC together');
    const body = encodeURIComponent(`${customMessage}\n\n${siteUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSMSShare = () => {
    // For SMS, use a shorter version if the custom message is too long
    const messageToUse = customMessage.length > 300 ? SHORT_MESSAGE : customMessage;
    const body = encodeURIComponent(`${messageToUse}\n\n${siteUrl}`);
    window.open(`sms:?body=${body}`, '_blank');
  };

  const handleGroupMeShare = () => {
    handleCopyMessage();
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(siteUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    // Twitter has character limits, use short message
    const text = encodeURIComponent(SHORT_MESSAGE);
    const url = encodeURIComponent(siteUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${customMessage}\n\n${siteUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const isMessageModified = customMessage !== DEFAULT_INVITATION_MESSAGE;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share CMC Go
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Copy Section */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Share with other leaders to coordinate CMC invitations together.</p>
            
            {/* Copy Link Button */}
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleCopyLink}
            >
              <span className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy Link
              </span>
              {linkCopied ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  Copied!
                </span>
              ) : (
                <span className="text-xs text-gray-400 truncate max-w-[150px]">{siteUrl}</span>
              )}
            </Button>

            {/* Copy Full Message Button */}
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleCopyMessage}
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Copy Invitation Message
                {isMessageModified && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Customized</span>
                )}
              </span>
              {messageCopied ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  Copied!
                </span>
              ) : null}
            </Button>
          </div>

          {/* Editable Message Section */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Pencil className="w-4 h-4" />
                Personalize Your Message
              </span>
              {isEditing ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {isEditing && (
              <div className="p-3 space-y-3 border-t">
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your personalized invitation message..."
                  className="min-h-[200px] text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {customMessage.length} characters
                  </p>
                  {isMessageModified && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetMessage}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset to Default
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">or share via</span>
            </div>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Email */}
            <button
              onClick={handleEmailShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600">Email</span>
            </button>

            {/* SMS/Text */}
            <button
              onClick={handleSMSShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs text-gray-600">Text</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600">WhatsApp</span>
            </button>

            {/* GroupMe */}
            <button
              onClick={handleGroupMeShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4 14h-8v-2h8v2zm0-3h-8v-2h8v2zm0-3h-8V8h8v2z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600">GroupMe</span>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebookShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600">Facebook</span>
            </button>

            {/* Twitter/X */}
            <button
              onClick={handleTwitterShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600">X</span>
            </button>
          </div>

          {/* Preview Message (collapsed by default when not editing) */}
          {!isEditing && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <button
                onClick={() => setShowFullPreview(!showFullPreview)}
                className="w-full flex items-center justify-between text-xs font-medium text-gray-500 mb-2"
              >
                <span>Message Preview {isMessageModified && '(Customized)'}</span>
                {showFullPreview ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <p className={`text-xs text-gray-600 whitespace-pre-line ${showFullPreview ? '' : 'line-clamp-3'}`}>
                {customMessage}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export the invitation message for use elsewhere
export const SHARE_INVITATION_MESSAGE = DEFAULT_INVITATION_MESSAGE;
