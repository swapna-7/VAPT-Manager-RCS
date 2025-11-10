import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserManagementTable from "@/components/user-management-table";

export default async function UserManagementPage() {
  const supabase = await createClient();

  // First verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Please log in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all profiles from the profiles table
  // Try with suspended first, fallback if column doesn't exist
  let { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, suspended, created_at, organization_id")
    .order("created_at", { ascending: false });

  // If suspended column doesn't exist, fetch without it
  if (error && error.message?.includes("suspended")) {
    const { data, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, created_at, organization_id")
      .order("created_at", { ascending: false });
    
    if (!fallbackError) {
      // Add suspended: false to all profiles
      profiles = data?.map(p => ({ ...p, suspended: false })) || [];
      error = null;
    }
  }

  // Fetch organizations separately and attach to profiles
  if (profiles && profiles.length > 0) {
    const orgIds = profiles
      .filter(p => p.organization_id)
      .map(p => p.organization_id);
    
    if (orgIds.length > 0) {
      const { data: organizations } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      
      if (organizations) {
        // Create a map for quick lookup
        const orgMap = new Map(organizations.map(org => [org.id, org]));
        
        // Attach organization data to profiles
        profiles = profiles.map(profile => ({
          ...profile,
          organizations: profile.organization_id && orgMap.has(profile.organization_id)
            ? [orgMap.get(profile.organization_id)!]
            : null
        }));
      }
    }
  }

  // Log for debugging
  if (error) {
    console.error("Error fetching profiles:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
  } else {
    console.log(`Successfully fetched ${profiles?.length || 0} profiles`);
  }

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
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-600">Error loading users</p>
              <p className="text-sm text-red-600 mt-1">Message: {error.message}</p>
              {error.message?.includes("suspended") && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Missing Database Column
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    The <code className="bg-yellow-100 px-1 rounded">suspended</code> column doesn't exist in your profiles table.
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    <strong>Fix:</strong> Run this SQL in your Supabase SQL Editor:
                  </p>
                  <pre className="text-xs bg-yellow-100 p-2 rounded overflow-x-auto">
{`ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;`}
                  </pre>
                </div>
              )}
              {!error.message?.includes("suspended") && (
                <div className="text-xs text-red-500 mt-2">
                  <strong>Possible causes:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>RLS policies may not be configured correctly for Super-admin access</li>
                    <li>Your account may not have Super-admin role</li>
                    <li>Database connection issue</li>
                  </ul>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-3">
                <strong>Debug info:</strong> User ID: {user.id}
              </p>
            </div>
          )}
          {!error && (!profiles || profiles.length === 0) && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No users found in the database.</p>
              <p className="text-xs text-gray-400 mt-2">
                If you just created users, make sure they exist in the profiles table.
              </p>
            </div>
          )}
          {profiles && profiles.length > 0 && (
            <UserManagementTable profiles={profiles} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


