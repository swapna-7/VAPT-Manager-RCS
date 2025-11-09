import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Building2, Shield, CheckCircle2, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Verify user is authenticated and get their role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Please log in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify user is an admin
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userProfile || userProfile.role !== "Admin") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800 font-semibold mb-2">Access Denied</p>
            <p className="text-sm text-yellow-700">
              You need Admin role to access this page. Your current role: {userProfile?.role || "Unknown"}
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              User ID: {user.id}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all data
  const [profilesResult, organizationsResult, notificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, status, created_at, suspended")
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, type, payload, created_at, read")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Log errors for debugging
  if (profilesResult.error) {
    console.error("Error fetching profiles:", profilesResult.error);
  }
  if (organizationsResult.error) {
    console.error("Error fetching organizations:", organizationsResult.error);
  }
  if (notificationsResult.error) {
    console.error("Error fetching notifications:", notificationsResult.error);
  }

  const profiles = profilesResult.data || [];
  const organizations = organizationsResult.data || [];
  const notifications = notificationsResult.data || [];

  // Calculate stats
  const totalUsers = profiles.length;
  const activeUsers = profiles.filter((p) => p.status === "approved" && !p.suspended).length;
  const pendingApprovals = profiles.filter((p) => p.status === "pending").length;
  const totalOrgs = organizations.length;

  // Get recent activity from notifications
  const recentActivity = notifications.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-2">System overview and management</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">{activeUsers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
            <Clock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Organizations</CardTitle>
            <Building2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrgs}</div>
            <p className="text-xs text-gray-500 mt-1">Active clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Notifications</CardTitle>
            <Shield className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.filter((n) => !n.read).length}</div>
            <p className="text-xs text-gray-500 mt-1">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Messages */}
      {(organizationsResult.error || notificationsResult.error) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            {organizationsResult.error && (
              <p className="text-sm text-red-600 mb-2">
                Error loading organizations: {organizationsResult.error.message}
              </p>
            )}
            {notificationsResult.error && (
              <p className="text-sm text-red-600">
                Error loading notifications: {notificationsResult.error.message}
              </p>
            )}
            <p className="text-xs text-red-500 mt-2">
              This might be due to RLS policies. Make sure your account has the "Admin" role.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity</p>
              ) : (
                recentActivity.map((activity) => {
                  let icon = <Clock className="h-4 w-4 text-blue-500" />;
                  let message = "";

                  if (activity.type === "user_signup") {
                    icon = <UserPlus className="h-4 w-4 text-blue-500" />;
                    const payload = activity.payload as any;
                    message = `${payload.full_name || payload.email} (${payload.role}) registered`;
                  } else if (activity.type === "approval") {
                    icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
                    message = "User approved";
                  } else if (activity.type === "organization_signup") {
                    icon = <Building2 className="h-4 w-4 text-blue-500" />;
                    const payload = activity.payload as any;
                    message = `New organization "${payload.name}" added`;
                  } else {
                    message = activity.type;
                  }

                  const timeAgo = formatDateTime(activity.created_at);

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      {icon}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{message}</p>
                        <p className="text-xs text-gray-500">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/dashboard/admin/users"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">Approve or suspend users</p>
                </div>
              </Link>
              <Link
                href="/dashboard/admin/organizations"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Organizations</p>
                  <p className="text-sm text-gray-500">Track organization-wise info</p>
                </div>
              </Link>
              <Link
                href="/dashboard/admin/notifications"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Shield className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-500">View system notifications</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
