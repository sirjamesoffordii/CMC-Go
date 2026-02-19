import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  DollarSign,
  Hand,
  MessageCircle,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Notifications() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading: notifsLoading } =
    trpc.notifs.list.useQuery(undefined, {
      refetchInterval: 15_000,
    });

  const { data: unreadCount = 0 } = trpc.notifs.unreadCount.useQuery(
    undefined,
    { refetchInterval: 15_000 }
  );

  const { data: settings } = trpc.notifs.getSettings.useQuery();

  const markRead = trpc.notifs.markRead.useMutation({
    onSuccess: () => {
      utils.notifs.list.invalidate();
      utils.notifs.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifs.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      utils.notifs.list.invalidate();
      utils.notifs.unreadCount.invalidate();
    },
  });

  const updateSettings = trpc.notifs.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      utils.notifs.getSettings.invalidate();
    },
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "need_funded":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "need_created":
        return <Hand className="h-4 w-4 text-blue-600" />;
      case "message_received":
        return <MessageCircle className="h-4 w-4 text-purple-600" />;
      case "status_changed":
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
      case "system":
        return <Zap className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading || notifsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notifications...</p>
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
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="min-h-[44px]"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
          )}
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="min-h-[44px]"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showSettings && settings && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Needs Funded</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone gives to a need you created
                  </p>
                </div>
                <Switch
                  checked={settings.needFunded}
                  onCheckedChange={v =>
                    updateSettings.mutate({ needFunded: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Needs Created</Label>
                  <p className="text-xs text-muted-foreground">
                    When a new need is created in your scope
                  </p>
                </div>
                <Switch
                  checked={settings.needCreated}
                  onCheckedChange={v =>
                    updateSettings.mutate({ needCreated: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">New Messages</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone sends you a message
                  </p>
                </div>
                <Switch
                  checked={settings.messageReceived}
                  onCheckedChange={v =>
                    updateSettings.mutate({ messageReceived: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Status Changes</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone's CMC status changes
                  </p>
                </div>
                <Switch
                  checked={settings.statusChanged}
                  onCheckedChange={v =>
                    updateSettings.mutate({ statusChanged: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">System</Label>
                  <p className="text-xs text-muted-foreground">
                    Important system announcements
                  </p>
                </div>
                <Switch
                  checked={settings.systemNotifications}
                  onCheckedChange={v =>
                    updateSettings.mutate({ systemNotifications: v })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              No notifications
            </p>
            <p className="text-sm text-gray-500">
              You're all caught up! Notifications will appear here when there's
              activity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Card
              key={notif.id}
              className={`transition-all ${
                !notif.isRead
                  ? "border-l-4 border-l-red-500 bg-red-50/30"
                  : "opacity-75"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-medium text-sm ${!notif.isRead ? "text-gray-900" : "text-gray-600"}`}
                      >
                        {notif.title}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString(
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
                    {notif.body && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {notif.body}
                      </p>
                    )}
                  </div>
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        markRead.mutate({ notificationId: notif.id })
                      }
                      className="shrink-0 min-h-[44px]"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
