import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Mail, Phone, MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SecurityTeamOrganizationsPage() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the user's profile to verify they are security team
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Security-team") {
    redirect("/auth/login");
  }

  // Fetch assigned organizations with their assigned services
  const { data: assignments, error: assignmentsError } = await supabase
    .from("security_team_organizations")
    .select(`
      id,
      organization_id,
      assigned_at,
      services,
      organizations!inner (
        id,
        name,
        contact_email,
        contact_phone,
        address,
        services,
        notes,
        created_at
      )
    `)
    .eq("security_team_user_id", user.id)
    .order("assigned_at", { ascending: false });

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError);
  }

  // Group assignments by organization to combine multiple service assignments
  const organizationsMap = new Map();
  
  assignments?.forEach((assignment: any) => {
    const org = Array.isArray(assignment.organizations) 
      ? assignment.organizations[0] 
      : assignment.organizations;
    
    if (!org) return;
    
    const orgId = org.id;
    const assignedServices = assignment.services || {};
    
    if (organizationsMap.has(orgId)) {
      // Merge services if organization already exists
      const existing = organizationsMap.get(orgId);
      existing.assigned_services = {
        ...existing.assigned_services,
        ...assignedServices
      };
      // Keep the earliest assignment date
      if (new Date(assignment.assigned_at) < new Date(existing.assigned_at)) {
        existing.assigned_at = assignment.assigned_at;
      }
    } else {
      // Add new organization
      organizationsMap.set(orgId, {
        ...org,
        assigned_at: assignment.assigned_at,
        assigned_services: assignedServices
      });
    }
  });
  
  // Convert map to array and sort by assigned date
  const organizations = Array.from(organizationsMap.values())
    .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-purple-600" />
          My Organizations
        </h1>
        <p className="text-gray-600 mt-2">
          Organizations assigned to you
        </p>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Assigned Organizations
          </CardTitle>
          <Building2 className="h-5 w-5 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{organizations.length}</div>
          <p className="text-xs text-gray-500 mt-1">
            You have access to {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {assignmentsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Error loading organizations: {assignmentsError.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                No Organizations Assigned Yet
              </p>
              <p className="text-gray-500 text-sm">
                Contact an administrator to get access to organizations
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org: any) => (
            <Link
              key={org.id}
              href={`/dashboard/security-team/organizations/${org.id}`}
              className="block"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        {org.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned {new Date(org.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {org.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{org.contact_email}</span>
                    </div>
                  )}
                  {org.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{org.contact_phone}</span>
                    </div>
                  )}
                  {org.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{org.address}</span>
                    </div>
                  )}
                  
                  {/* Display only assigned services */}
                  {org.assigned_services && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <p className="text-xs text-gray-500 w-full mb-1">Assigned Services:</p>
                      {org.assigned_services.web && (
                        <Badge variant="outline" className="text-xs">
                          Web {typeof org.assigned_services.web === 'object' && org.assigned_services.web.tier 
                            ? `(${org.assigned_services.web.tier})` 
                            : ''}
                        </Badge>
                      )}
                      {org.assigned_services.android && (
                        <Badge variant="outline" className="text-xs">
                          Android {typeof org.assigned_services.android === 'object' && org.assigned_services.android.tier 
                            ? `(${org.assigned_services.android.tier})` 
                            : ''}
                        </Badge>
                      )}
                      {org.assigned_services.ios && (
                        <Badge variant="outline" className="text-xs">
                          iOS {typeof org.assigned_services.ios === 'object' && org.assigned_services.ios.tier 
                            ? `(${org.assigned_services.ios.tier})` 
                            : ''}
                        </Badge>
                      )}
                      {!org.assigned_services.web && !org.assigned_services.android && !org.assigned_services.ios && (
                        <span className="text-xs text-gray-400">No services assigned</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
