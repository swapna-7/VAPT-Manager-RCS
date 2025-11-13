"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Shield, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

export default function SecurityTeamNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("unread");
  const [userId, setUserId] = useState<string>("");
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setUserId(user.id);

    // Check if user is security team
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "Security-team") {
      router.push("/dashboard");
      return;
    }

    // Fetch notifications for this security team member
    const { data: notificationsData, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      const migrationError = error && (error as any).code === '42703';
      setMigrationNeeded(migrationError);
    } else {
      setNotifications(notificationsData || []);
    }

    setLoading(false);
  }

  async function markAsRead(notificationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select();
    
    if (error) {
      console.error("Error marking notification as read:", error);
      alert("Failed to mark notification as read. Please check console for details.");
      return;
    }
    
    console.log("Notification marked as read:", data);
    
    // Update local state immediately for better UX
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "read") return n.read;
    return true;
  });

  // Calculate counts
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your assignments and tasks</p>
        </div>
      </div>

      {migrationNeeded && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 text-lg">Database Migration Required</h3>
                <p className="text-red-700 mt-2">
                  The notifications system requires a database migration to be run.
                </p>
                <div className="mt-4 p-4 bg-white rounded border border-red-200">
                  <p className="font-medium text-gray-900 mb-2">Steps to fix:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Open your Supabase Dashboard SQL Editor</li>
                    <li>Navigate to the project root folder</li>
                    <li>Open and execute <code className="bg-gray-100 px-1 rounded">NOTIFICATIONS_MIGRATION.sql</code></li>
                    <li>Wait 10-15 seconds for schema cache to refresh</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!migrationNeeded && (
        <Tabs defaultValue="unread" onValueChange={setActiveTab}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Notifications</CardTitle>
                <TabsList>
                  <TabsTrigger value="unread">
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger value="read">
                    Read ({readCount})
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="unread">
                <NotificationList 
                  notifications={filteredNotifications} 
                  emptyMessage="No unread notifications"
                  userId={userId}
                  onMarkAsRead={markAsRead}
                />
              </TabsContent>
              <TabsContent value="read">
                <NotificationList 
                  notifications={filteredNotifications} 
                  emptyMessage="No read notifications"
                  userId={userId}
                  onMarkAsRead={markAsRead}
                />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  );
}

// Notification List Component
function NotificationList({ 
  notifications, 
  emptyMessage,
  userId,
  onMarkAsRead
}: { 
  notifications: Notification[]; 
  emptyMessage: string;
  userId: string;
  onMarkAsRead: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationCard 
          key={notification.id} 
          notification={notification} 
          userId={userId} 
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
}

// Notification Card Component
function NotificationCard({ 
  notification, 
  userId,
  onMarkAsRead 
}: { 
  notification: Notification; 
  userId: string;
  onMarkAsRead: (id: string) => void;
}) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "organization_assigned":
        return <Shield className="h-5 w-5 text-blue-600" />;
      case "verification_assigned":
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />;
      case "vulnerability_approved":
        return <AlertTriangle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const { type, payload } = notification;
    
    switch (type) {
      case "organization_assigned":
        return (
          <div>
            <p className="font-medium">New Organization Assignment</p>
            <p className="text-sm text-gray-600 mt-1">
              You have been assigned to <span className="font-semibold">{payload.organization_name}</span>
            </p>
            {payload.services && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(payload.services).map(([service, data]: [string, any]) => (
                  data && (
                    <Badge key={service} variant="outline">
                      {service.charAt(0).toUpperCase() + service.slice(1)} - {data.tier}
                    </Badge>
                  )
                ))}
              </div>
            )}
            {payload.deadline && (
              <p className="text-xs text-red-600 mt-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Deadline: {formatDateTime(payload.deadline)}
              </p>
            )}
          </div>
        );
      
      case "verification_assigned":
        return (
          <div>
            <p className="font-medium">Verification Request</p>
            <p className="text-sm text-gray-600 mt-1">
              Verify fix for: <span className="font-semibold">{payload.vulnerability_title}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Organization: {payload.organization_name}
            </p>
            {payload.verification_deadline && (
              <p className="text-xs text-red-600 mt-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Deadline: {formatDateTime(payload.verification_deadline)}
              </p>
            )}
          </div>
        );
      
      case "vulnerability_approved":
        return (
          <div>
            <p className="font-medium">Vulnerability Approved</p>
            <p className="text-sm text-gray-600 mt-1">
              Your submission <span className="font-semibold">{payload.vulnerability_title}</span> has been approved
            </p>
            {payload.admin_comments && (
              <p className="text-xs text-gray-500 mt-2 italic">
                "{payload.admin_comments}"
              </p>
            )}
          </div>
        );
      
      default:
        return <p className="text-sm">{JSON.stringify(payload)}</p>;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${notification.read ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          {getNotificationMessage(notification)}
          <p className="text-xs text-gray-400 mt-2">
            {formatDateTime(notification.created_at)}
          </p>
        </div>
        {!notification.read && (
          <Button 
            onClick={() => {
              onMarkAsRead(notification.id);
              window.location.reload();
            }}
            variant="ghost" 
            size="sm"
          >
            Mark as read
          </Button>
        )}
      </div>
    </div>
  );
}
