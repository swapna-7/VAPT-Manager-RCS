"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

export default function ClientNotificationsPage() {
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

    // Check if user is client
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "Client") {
      router.push("/dashboard");
      return;
    }

    // Fetch notifications for this client
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
          <p className="text-gray-500 mt-1">Track vulnerabilities and verification updates</p>
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
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
      case "vulnerability_assigned":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "verification_completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "verification_rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "deadline_reminder":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Informational":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const { type, payload } = notification;
    
    switch (type) {
      case "vulnerability_assigned":
        return (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">New Vulnerability Assigned</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">{payload.vulnerability_title}</span>
                </p>
                {payload.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {payload.description}
                  </p>
                )}
              </div>
              {payload.severity && (
                <Badge className={getSeverityColor(payload.severity)}>
                  {payload.severity}
                </Badge>
              )}
            </div>
            {payload.client_deadline && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-700 font-medium">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Deadline: {formatDateTime(payload.client_deadline)}
                </p>
              </div>
            )}
            {payload.vulnerability_id && (
              <Link href={`/dashboard/client/vulnerabilities`}>
                <Button variant="link" size="sm" className="mt-2 px-0">
                  View Details →
                </Button>
              </Link>
            )}
          </div>
        );
      
      case "verification_completed":
        return (
          <div>
            <p className="font-medium text-green-700">Verification Completed ✓</p>
            <p className="text-sm text-gray-600 mt-1">
              The fix for <span className="font-semibold">{payload.vulnerability_title}</span> has been verified
            </p>
            {payload.verification_notes && (
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">Verification Notes:</span> {payload.verification_notes}
                </p>
              </div>
            )}
            {payload.verified_by_name && (
              <p className="text-xs text-gray-500 mt-2">
                Verified by: {payload.verified_by_name}
              </p>
            )}
          </div>
        );
      
      case "verification_rejected":
        return (
          <div>
            <p className="font-medium text-red-700">Verification Rejected</p>
            <p className="text-sm text-gray-600 mt-1">
              The fix for <span className="font-semibold">{payload.vulnerability_title}</span> needs more work
            </p>
            {payload.verification_notes && (
              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">Reason:</span> {payload.verification_notes}
                </p>
              </div>
            )}
            <Link href={`/dashboard/client/vulnerabilities`}>
              <Button variant="link" size="sm" className="mt-2 px-0 text-red-600">
                View Vulnerability →
              </Button>
            </Link>
          </div>
        );
      
      case "deadline_reminder":
        return (
          <div>
            <p className="font-medium text-yellow-700">Deadline Approaching</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">{payload.vulnerability_title}</span> is due soon
            </p>
            {payload.client_deadline && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                <Clock className="h-3 w-3 inline mr-1" />
                Due: {formatDateTime(payload.client_deadline)}
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
            onClick={() => onMarkAsRead(notification.id)} 
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
