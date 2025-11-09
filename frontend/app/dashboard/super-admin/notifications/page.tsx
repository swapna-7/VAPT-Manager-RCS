import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NotificationsList from "@/components/notifications-list";

export default async function NotificationsPage() {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Please log in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  // Log for debugging
  if (error) {
    console.error("Error fetching notifications:", error);
    console.error("User ID:", user.id);
  } else {
    console.log(`Successfully fetched ${notifications?.length || 0} notifications`);
  }

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-600 mt-2">
          System notifications and alerts
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-500">Error loading notifications: {error.message}</p>
          )}
          <NotificationsList initialNotifications={notifications || []} />
        </CardContent>
      </Card>
    </div>
  );
}


