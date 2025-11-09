"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Plus, X, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

interface Assignment {
  id: string;
  organization_id: string;
  organizations: Organization;
}

export default function SecurityTeamUserPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user and verify admin
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(authUser);

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (!userProfile || userProfile.role !== "Admin") {
        router.push("/dashboard/admin");
        return;
      }

      // Fetch security team user details
      const { data: securityUser, error: userError } = await supabase
        .from("profiles")
        .select("id, full_name, status, suspended, role")
        .eq("id", unwrappedParams.id)
        .single();

      if (userError || !securityUser) {
        console.error("Error fetching user:", userError);
        return;
      }

      if (securityUser.role !== "Security-team") {
        router.push("/dashboard/admin/security-teams");
        return;
      }

      setUser(securityUser);

      // Fetch assigned organizations
      const { data: userAssignments, error: assignError } = await supabase
        .from("security_team_organizations")
        .select(`
          id,
          organization_id,
          organizations!inner (
            id,
            name,
            contact_email,
            contact_phone,
            address
          )
        `)
        .eq("security_team_user_id", unwrappedParams.id);

      if (!assignError && userAssignments) {
        // Transform the data to match our Assignment type
        const transformedAssignments = userAssignments.map((item: any) => ({
          id: item.id,
          organization_id: item.organization_id,
          organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        }));
        setAssignments(transformedAssignments);
      }

      // Fetch all organizations
      const { data: allOrgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, contact_email, contact_phone, address")
        .order("name");

      if (!orgsError && allOrgs) {
        // Filter out already assigned organizations
        const assignedOrgIds = new Set((userAssignments || []).map((a: any) => a.organization_id));
        const available = allOrgs.filter((org: Organization) => !assignedOrgIds.has(org.id));
        setAvailableOrgs(available);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrganization = async () => {
    if (!selectedOrg || !currentUser) return;

    try {
      setAssigning(true);

      const { error } = await supabase
        .from("security_team_organizations")
        .insert({
          security_team_user_id: unwrappedParams.id,
          organization_id: selectedOrg,
          assigned_by: currentUser.id
        });

      if (error) {
        console.error("Error assigning organization:", error);
        alert("Failed to assign organization: " + error.message);
        return;
      }

      // Reload data
      setSelectedOrg("");
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to assign organization");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignOrganization = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this organization assignment?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("security_team_organizations")
        .delete()
        .eq("id", assignmentId);

      if (error) {
        console.error("Error unassigning organization:", error);
        alert("Failed to unassign organization: " + error.message);
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to unassign organization");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">User not found or not a security team member</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/admin/security-teams"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Security Teams
        </Link>
        
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.full_name || "Unnamed User"}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage organization assignments
            </p>
          </div>
          <Badge className={user.suspended ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
            {user.suspended ? "Suspended" : user.status}
          </Badge>
        </div>
      </div>

      {/* Assign New Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Assign Organization
          </CardTitle>
          <CardDescription>
            Add an organization to this security team member's access list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={assigning || availableOrgs.length === 0}
            >
              <option value="">Select an organization...</option>
              {availableOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleAssignOrganization}
              disabled={!selectedOrg || assigning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </div>
          {availableOrgs.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              All organizations have been assigned to this user
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assigned Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assigned Organizations ({assignments.length})
          </CardTitle>
          <CardDescription>
            Organizations this security team member can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No organizations assigned yet
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">
                        {assignment.organizations.name}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-600 ml-7">
                      {assignment.organizations.contact_email && (
                        <p>Email: {assignment.organizations.contact_email}</p>
                      )}
                      {assignment.organizations.contact_phone && (
                        <p>Phone: {assignment.organizations.contact_phone}</p>
                      )}
                      {assignment.organizations.address && (
                        <p>Address: {assignment.organizations.address}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUnassignOrganization(assignment.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
