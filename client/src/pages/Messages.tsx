import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MessageCircle,
  Send,
  User,
  ChevronLeft,
  Inbox,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Messages() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: inbox = [], isLoading: inboxLoading } =
    trpc.messaging.inbox.useQuery(undefined, {
      refetchInterval: 15_000,
    });

  type InboxMsg = (typeof inbox)[number];

  const { data: unreadCount = 0 } = trpc.messaging.unreadCount.useQuery(
    undefined,
    { refetchInterval: 15_000 }
  );

  const sendMessage = trpc.messaging.send.useMutation({
    onSuccess: () => {
      toast.success("Reply sent!");
      setReplyContent("");
      utils.messaging.inbox.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const markRead = trpc.messaging.markRead.useMutation({
    onSuccess: () => {
      utils.messaging.inbox.invalidate();
      utils.messaging.unreadCount.invalidate();
    },
  });

  // Group messages by sender
  const conversationsBySender: Record<number, InboxMsg[]> = {};
  for (const msg of inbox) {
    if (!conversationsBySender[msg.senderUserId]) {
      conversationsBySender[msg.senderUserId] = [];
    }
    conversationsBySender[msg.senderUserId].push(msg);
  }

  const senderIds = Object.keys(conversationsBySender).map(Number);
  const selectedMessages: InboxMsg[] = selectedSenderId
    ? (conversationsBySender[selectedSenderId] ?? [])
    : [];

  const handleSelectConversation = (senderId: number) => {
    setSelectedSenderId(senderId);
    // Mark messages from this sender as read
    markRead.mutate({ senderUserId: senderId });
  };

  const handleReply = () => {
    if (!replyContent.trim() || !selectedMessages[0]) return;
    // Direct replies require knowing the sender's personId.
    // For now, guide users to the person details panel.
    toast.info(
      "Direct replies coming soon! Use the person details panel to message them."
    );
    setReplyContent("");
  };

  if (loading || inboxLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-4 sm:py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Messages
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {selectedSenderId ? (
        /* Conversation View */
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSenderId(null)}
            className="mb-4 min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to inbox
          </Button>
          <div className="space-y-3">
            {selectedMessages.map(msg => (
              <Card key={msg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {msg.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reply box */}
          <div className="mt-4 flex gap-2">
            <Textarea
              placeholder="Type a reply..."
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <Button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              className="shrink-0 min-h-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Inbox List */
        <div>
          {senderIds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No messages yet
                </p>
                <p className="text-sm text-gray-500">
                  Messages from others will appear here. Use the person details
                  panel to send messages.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {senderIds.map(senderId => {
                const senderMessages = conversationsBySender[senderId];
                const latestMsg = senderMessages[0];
                const unread = senderMessages.filter(m => !m.isRead).length;
                return (
                  <Card
                    key={senderId}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectConversation(senderId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {latestMsg.senderName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(latestMsg.createdAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {latestMsg.content}
                          </p>
                        </div>
                        {unread > 0 && (
                          <Badge className="bg-red-500 text-white shrink-0">
                            {unread}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
