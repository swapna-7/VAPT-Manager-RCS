import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserManagementTable from "@/components/user-management-table";

export default async function UserManagementPage() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      status,
      suspended,
      created_at,
      organization_id,
      organizations:organization_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  // Get user emails from auth
  const userIds = profiles?.map((p) => p.id) || [];
  const userEmails: Record<string, string> = {};

  // Fetch emails for each user (we'll need to do this client-side or via API)
  // For now, we'll pass the profiles and fetch emails client-side

  const pendingCount = profiles?.filter((p) => p.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-600 mt-2">
          Manage user accounts and permissions
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
              ({pendingCount} pending approval)
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagementTable profiles={profiles || []} />
        </CardContent>
      </Card>
    </div>
  );
}

