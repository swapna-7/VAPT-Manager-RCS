"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Plus, X, ArrowLeft, Loader2, Calendar, CheckSquare, Square } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  services: any;
}

interface Assignment {
  id: string;
  organization_id: string;
  organizations: Organization;
  services: any;
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
  const [selectedServices, setSelectedServices] = useState<any>({});
  const [deadline, setDeadline] = useState<string>("");
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
          services,
          organizations!inner (
            id,
            name,
            contact_email,
            contact_phone,
            address,
            services
          )
        `)
        .eq("security_team_user_id", unwrappedParams.id);

      if (!assignError && userAssignments) {
        // Transform the data to match our Assignment type
        const transformedAssignments = userAssignments.map((item: any) => ({
          id: item.id,
          organization_id: item.organization_id,
          services: item.services,
          organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        }));
        setAssignments(transformedAssignments);
      }

      // Fetch all organizations
      const { data: allOrgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, contact_email, contact_phone, address, services")
        .order("name");

      if (!orgsError && allOrgs) {
        // Don't filter out organizations - same org can have multiple service assignments
        setAvailableOrgs(allOrgs);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrganization = async () => {
    if (!selectedOrg || !currentUser) return;

    // Check if at least one service is selected
    const hasServices = Object.values(selectedServices).some(val => val !== null);
    if (!hasServices) {
      alert("Please select at least one service to assign");
      return;
    }

    try {
      setAssigning(true);

      // Only include non-null services in the services object
      const servicesToAssign = Object.entries(selectedServices).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const insertData: any = {
        security_team_user_id: unwrappedParams.id,
        organization_id: selectedOrg,
        assigned_by: currentUser.id,
        services: servicesToAssign,
      };

      // Only add deadline if it's set
      if (deadline) {
        insertData.deadline = new Date(deadline).toISOString();
      }

      const { data, error } = await supabase
        .from("security_team_organizations")
        .insert(insertData)
        .select();

      if (error) {
        console.error("Error assigning organization:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        alert(`Failed to assign services: ${error.message || 'Unknown error'}\n\nPlease make sure you have run the database migration.`);
        return;
      }

      console.log("Successfully assigned services:", data);

      // Get organization name for notification
      const org = availableOrgs.find(o => o.id === selectedOrg);
      
      // Create notification for security team member
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          type: "organization_assigned",
          user_id: unwrappedParams.id,
          actor_id: currentUser.id,
          payload: {
            organization_name: org?.name || "Unknown Organization",
            organization_id: selectedOrg,
            services: servicesToAssign,
            deadline: deadline ? new Date(deadline).toISOString() : null,
          },
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }

      // Reload data
      setSelectedOrg("");
      setSelectedServices({});
      setDeadline("");
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to assign organization. Please check the console for details.");
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <select
                id="organization"
                value={selectedOrg}
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  setSelectedServices({});
                }}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={assigning || availableOrgs.length === 0}
              >
                <option value="">Select an organization...</option>
                {availableOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedOrg && availableOrgs.find(org => org.id === selectedOrg) && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <Label className="mb-3 block font-semibold">Select Services to Assign *</Label>
                <div className="space-y-3">
                  {(() => {
                    const org = availableOrgs.find(o => o.id === selectedOrg);
                    const orgServices = org?.services || {};
                    
                    return (
                      <>
                        {orgServices.web && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <Checkbox
                              checked={!!selectedServices.web}
                              onCheckedChange={(checked) => {
                                setSelectedServices({
                                  ...selectedServices,
                                  web: checked ? orgServices.web : null
                                });
                              }}
                            />
                            <div className="flex-1">
                              <span className="font-medium">Web Application PT</span>
                              <Badge className="ml-2" variant="outline">
                                {typeof orgServices.web === 'string' ? orgServices.web : orgServices.web?.tier || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        {orgServices.android && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <Checkbox
                              checked={!!selectedServices.android}
                              onCheckedChange={(checked) => {
                                setSelectedServices({
                                  ...selectedServices,
                                  android: checked ? orgServices.android : null
                                });
                              }}
                            />
                            <div className="flex-1">
                              <span className="font-medium">Android Application PT</span>
                              <Badge className="ml-2" variant="outline">
                                {typeof orgServices.android === 'string' ? orgServices.android : orgServices.android?.tier || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        {orgServices.ios && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <Checkbox
                              checked={!!selectedServices.ios}
                              onCheckedChange={(checked) => {
                                setSelectedServices({
                                  ...selectedServices,
                                  ios: checked ? orgServices.ios : null
                                });
                              }}
                            />
                            <div className="flex-1">
                              <span className="font-medium">iOS Application PT</span>
                              <Badge className="ml-2" variant="outline">
                                {typeof orgServices.ios === 'string' ? orgServices.ios : orgServices.ios?.tier || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        {!orgServices.web && !orgServices.android && !orgServices.ios && (
                          <p className="text-sm text-gray-500">No services available for this organization</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deadline (Optional)
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={assigning}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set a deadline for completing the assigned service/assessment
              </p>
            </div>

            <Button
              onClick={handleAssignOrganization}
              disabled={!selectedOrg || assigning || !Object.values(selectedServices).some(v => v !== null)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Services
                </>
              )}
            </Button>
          </div>
          {availableOrgs.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No organizations available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assigned Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assigned Services ({assignments.length})
          </CardTitle>
          <CardDescription>
            Services this security team member can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No services assigned yet
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">
                        {assignment.organizations.name}
                      </h3>
                    </div>
                    
                    {/* Assigned Services */}
                    <div className="mb-2 ml-7">
                      <p className="text-xs font-medium text-gray-600 mb-1">Assigned Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {assignment.services?.web && (
                          <Badge variant="outline" className="text-xs">
                            Web ({typeof assignment.services.web === 'string' ? assignment.services.web : assignment.services.web?.tier || 'N/A'})
                          </Badge>
                        )}
                        {assignment.services?.android && (
                          <Badge variant="outline" className="text-xs">
                            Android ({typeof assignment.services.android === 'string' ? assignment.services.android : assignment.services.android?.tier || 'N/A'})
                          </Badge>
                        )}
                        {assignment.services?.ios && (
                          <Badge variant="outline" className="text-xs">
                            iOS ({typeof assignment.services.ios === 'string' ? assignment.services.ios : assignment.services.ios?.tier || 'N/A'})
                          </Badge>
                        )}
                        {!assignment.services?.web && !assignment.services?.android && !assignment.services?.ios && (
                          <span className="text-xs text-gray-500">No services selected</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Organization Details */}
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
