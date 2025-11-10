import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

export default async function ClientNotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Check if user is client
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "Client") {
    return redirect("/dashboard");
  }

  // Fetch notifications for this client
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
  }

  const notificationsList = notifications || [];
  const unreadCount = notificationsList.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">Track vulnerabilities and verification updates</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-lg px-4 py-2">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        {notificationsList.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="h-16 w-16 text-gray-300" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    You'll receive notifications about vulnerabilities assigned to you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notificationsList.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} userId={user.id} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function NotificationCard({ notification, userId }: { notification: Notification; userId: string }) {
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
    <Card className={notification.read ? "bg-white" : "bg-blue-50 border-blue-200"}>
      <CardContent className="p-4">
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
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", notification.id);
            }}>
              <Button type="submit" variant="ghost" size="sm">
                Mark as read
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
