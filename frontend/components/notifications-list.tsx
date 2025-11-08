"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UserPlus, Building2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  initialNotifications: Notification[];
}

export default function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    
    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "organization_signup":
        return <Building2 className="h-5 w-5 text-blue-500" />;
      case "approval":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const payload = notification.payload || {};
    switch (notification.type) {
      case "user_signup":
        return `${payload.full_name || payload.email || "A user"} (${payload.role}) has registered and is pending approval`;
      case "organization_signup":
        return `New organization "${payload.name}" has been registered and is pending approval`;
      case "approval":
        return `User ${payload.user_id ? "has been approved" : "approval processed"}`;
      default:
        return notification.type;
    }
  };

  if (notifications.length === 0) {
    return <p className="text-sm text-gray-500">No notifications</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg ${
              !notification.read ? "bg-purple-50 border-purple-200" : "bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <p className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                  {getNotificationMessage(notification)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

