import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Clock, Users } from "lucide-react";
import OrganizationNotes from "@/components/organization-notes";
import OrganizationActivity from "@/components/organization-activity";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !organization) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/super-admin/organizations"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch users belonging to this organization
  const { data: usersData } = await supabase
    .from("profiles")
    .select("id, full_name, role, designation, status, created_at")
    .eq("organization_id", id)
    .order("created_at", { ascending: false });

  // Fetch user emails using admin client
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

  // Map users with their emails
  const userEmails = usersData?.map((user) => ({
    id: user.id,
    full_name: user.full_name,
    email: emailMap.get(user.id) || "Email not available",
    role: user.role,
    designation: user.designation || user.role, // Use designation if available, fallback to role
    status: user.status,
    created_at: user.created_at,
  })) || [];

  const services = organization.services as any;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/super-admin/organizations"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg bg-purple-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-600 mt-1">Complete organization overview and tracking</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Active
        </span>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Contact Email</p>
                <p className="text-sm font-medium">{organization.contact_email || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{organization.contact_phone || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {formatDateTime(organization.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">
                  {organization.updated_at
                    ? formatDateTime(organization.updated_at)
                    : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address */}
      {organization.address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700">{organization.address}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Organization Users
            </CardTitle>
            <Badge variant="secondary">{userEmails.length} {userEmails.length === 1 ? 'User' : 'Users'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {userEmails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Designation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {userEmails.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.full_name || "No name provided"}</span>
                          {(user as any).isPending && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{(user as any).designation}</td>
                      <td className="py-3 px-4">
                        <Badge variant={user.role === 'Client' ? 'default' : user.role === 'Pending' ? 'secondary' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No users found for this organization</p>
          )}
        </CardContent>
      </Card>


      {/* Services */}
      {services && typeof services === 'object' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Web Application PT */}
              {services.web && typeof services.web === 'object' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-blue-900">Web Application PT</span>
                    <span className="text-sm font-medium px-2 py-1 bg-blue-200 text-blue-900 rounded">
                      {typeof services.web.tier === 'string' ? services.web.tier : typeof services.web === 'string' ? services.web : 'N/A'}
                    </span>
                  </div>
                  {services.web.details && typeof services.web.details === 'object' && (
                    <div className="space-y-2 mt-3 text-sm">
                      {services.web.details.scopeUrl && (
                        <div>
                          <span className="font-medium text-gray-700">Scope URL:</span>
                          <div className="mt-1 text-blue-600 break-all">{services.web.details.scopeUrl}</div>
                        </div>
                      )}
                      {services.web.details.userMatrix && (
                        <div>
                          <span className="font-medium text-gray-700">User Matrix:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.web.details.userMatrix}</pre>
                        </div>
                      )}
                      {services.web.details.credentials && (
                        <div>
                          <span className="font-medium text-gray-700">Credentials:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.web.details.credentials}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Android Application PT */}
              {services.android && typeof services.android === 'object' && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-green-900">Android Application PT</span>
                    <span className="text-sm font-medium px-2 py-1 bg-green-200 text-green-900 rounded">
                      {typeof services.android.tier === 'string' ? services.android.tier : typeof services.android === 'string' ? services.android : 'N/A'}
                    </span>
                  </div>
                  {services.android.details && typeof services.android.details === 'object' && (
                    <div className="space-y-2 mt-3 text-sm">
                      {services.android.details.sslPinnedApk && (
                        <div>
                          <span className="font-medium text-gray-700">SSL Pinned APK:</span>
                          <div className="mt-1 text-blue-600 break-all">{services.android.details.sslPinnedApk}</div>
                        </div>
                      )}
                      {services.android.details.sslUnpinnedApk && (
                        <div>
                          <span className="font-medium text-gray-700">SSL Unpinned APK:</span>
                          <div className="mt-1 text-blue-600 break-all">{services.android.details.sslUnpinnedApk}</div>
                        </div>
                      )}
                      {services.android.details.userMatrix && (
                        <div>
                          <span className="font-medium text-gray-700">User Matrix:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.android.details.userMatrix}</pre>
                        </div>
                      )}
                      {services.android.details.credentials && (
                        <div>
                          <span className="font-medium text-gray-700">Credentials:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.android.details.credentials}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* iOS Application PT */}
              {services.ios && typeof services.ios === 'object' && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-purple-900">iOS Application PT</span>
                    <span className="text-sm font-medium px-2 py-1 bg-purple-200 text-purple-900 rounded">
                      {typeof services.ios.tier === 'string' ? services.ios.tier : typeof services.ios === 'string' ? services.ios : 'N/A'}
                    </span>
                  </div>
                  {services.ios.details && typeof services.ios.details === 'object' && (
                    <div className="space-y-2 mt-3 text-sm">
                      {services.ios.details.testflightPinned && (
                        <div>
                          <span className="font-medium text-gray-700">TestFlight (Pinned):</span>
                          <div className="mt-1 text-blue-600 break-all">{services.ios.details.testflightPinned}</div>
                        </div>
                      )}
                      {services.ios.details.testflightUnpinned && (
                        <div>
                          <span className="font-medium text-gray-700">TestFlight (Unpinned):</span>
                          <div className="mt-1 text-blue-600 break-all">{services.ios.details.testflightUnpinned}</div>
                        </div>
                      )}
                      {services.ios.details.ipaFile && (
                        <div>
                          <span className="font-medium text-gray-700">IPA File:</span>
                          <div className="mt-1 text-blue-600 break-all">{services.ios.details.ipaFile}</div>
                        </div>
                      )}
                      {services.ios.details.userMatrix && (
                        <div>
                          <span className="font-medium text-gray-700">User Matrix:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.ios.details.userMatrix}</pre>
                        </div>
                      )}
                      {services.ios.details.credentials && (
                        <div>
                          <span className="font-medium text-gray-700">Credentials:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs whitespace-pre-wrap border">{services.ios.details.credentials}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationNotes organizationId={id} initialNotes={organization.notes || ""} />
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationActivity organizationId={id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


