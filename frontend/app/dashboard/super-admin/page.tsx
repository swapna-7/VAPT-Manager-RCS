import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Building2, Shield, CheckCircle2, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

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
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
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

                  const timeAgo = new Date(activity.created_at).toLocaleString();

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
                href="/dashboard/super-admin/users"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">Approve or suspend users</p>
                </div>
              </Link>
              <Link
                href="/dashboard/super-admin/organizations"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Organizations</p>
                  <p className="text-sm text-gray-500">Track organization-wise info</p>
                </div>
              </Link>
              <Link
                href="/dashboard/super-admin/notifications"
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
