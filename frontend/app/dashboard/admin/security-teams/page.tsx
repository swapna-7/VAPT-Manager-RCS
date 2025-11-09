import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Shield, Building2, Users, ArrowRight } from "lucide-react";

export default async function SecurityTeamsPage() {
  const supabase = await createClient();

  // Verify user is authenticated and is an admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userProfile || userProfile.role !== "Admin") {
    redirect("/dashboard/admin");
  }

  // Fetch all security team users
  const { data: securityTeamUsers, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name, status, suspended, created_at")
    .eq("role", "Security-team")
    .order("created_at", { ascending: false });

  if (usersError) {
    console.error("Error fetching security team users:", usersError);
  }

  // Fetch organization assignments for each user
  const { data: assignments } = await supabase
    .from("security_team_organizations")
    .select(`
      security_team_user_id,
      organization_id,
      organizations (
        name
      )
    `);

  // Group assignments by user
  const assignmentsByUser = new Map();
  assignments?.forEach((assignment: any) => {
    if (!assignmentsByUser.has(assignment.security_team_user_id)) {
      assignmentsByUser.set(assignment.security_team_user_id, []);
    }
    assignmentsByUser.get(assignment.security_team_user_id).push(assignment);
  });

  const getStatusColor = (status: string, suspended: boolean) => {
    if (suspended) return "bg-red-100 text-red-800";
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-8 w-8 text-purple-600" />
          Security Team Management
        </h1>
        <p className="text-gray-600 mt-2">
          Assign organizations to security team members
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Security Team Users
            </CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{securityTeamUsers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Shield className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {securityTeamUsers?.filter(u => u.status === "approved" && !u.suspended).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Assignments
            </CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Team Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Team Members</CardTitle>
          <CardDescription>
            Click on a user to manage their organization assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersError && (
            <div className="text-red-600 text-sm mb-4">
              Error loading users: {usersError.message}
            </div>
          )}
          
          {!securityTeamUsers || securityTeamUsers.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No security team users found
            </p>
          ) : (
            <div className="space-y-3">
              {securityTeamUsers.map((user) => {
                const userAssignments = assignmentsByUser.get(user.id) || [];
                
                return (
                  <Link
                    key={user.id}
                    href={`/dashboard/admin/security-teams/${user.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold text-gray-900">
                            {user.full_name || "Unnamed User"}
                          </h3>
                          <Badge className={getStatusColor(user.status, user.suspended)}>
                            {user.suspended ? "Suspended" : user.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>
                              {userAssignments.length} organization{userAssignments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {userAssignments.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {userAssignments.slice(0, 3).map((assignment: any) => (
                                <Badge key={assignment.organization_id} variant="outline" className="text-xs">
                                  {assignment.organizations?.name}
                                </Badge>
                              ))}
                              {userAssignments.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{userAssignments.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
