import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-security-team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Shield, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

export default async function SecurityTeamNotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Check if user is security team
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "Security-team") {
    return redirect("/dashboard");
  }

  // Fetch notifications for this security team member
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
            <p className="text-gray-500 mt-1">Stay updated on your assignments and tasks</p>
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
                <Shield className="h-16 w-16 text-gray-300" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    You'll see notifications here when you're assigned to organizations or verification tasks
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
