import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Clock, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // Verify this organization is assigned to the user and get assigned services
  const { data: assignments } = await supabase
    .from("security_team_organizations")
    .select("id, services")
    .eq("security_team_user_id", user.id)
    .eq("organization_id", id);

  if (!assignments || assignments.length === 0) {
    redirect("/dashboard/security-team/organizations");
  }

  // Merge all assigned services from multiple assignments
  const assignedServices: any = assignments.reduce((acc, assignment) => {
    return { ...acc, ...(assignment.services || {}) };
  }, {});

  // Fetch organization details
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !organization) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/security-team/organizations"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Organizations
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Organization not found or access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const services = organization.services as any;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/security-team/organizations"
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Organizations
      </Link>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg bg-purple-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-600 mt-1">Organization details and information</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Assigned
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
                  {formatDateTime(organization.updated_at || organization.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            {organization.address || "No address provided"}
          </p>
        </CardContent>
      </Card>

      {/* Assigned Services Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assigned Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">Services you are assigned to work on</p>
          <div className="flex flex-wrap gap-2">
            {assignedServices.web && (
              <Badge variant="outline" className="text-sm">
                Web Application PT ({typeof assignedServices.web === 'string' ? assignedServices.web : assignedServices.web?.tier || 'N/A'})
              </Badge>
            )}
            {assignedServices.android && (
              <Badge variant="outline" className="text-sm">
                Android Application PT ({typeof assignedServices.android === 'string' ? assignedServices.android : assignedServices.android?.tier || 'N/A'})
              </Badge>
            )}
            {assignedServices.ios && (
              <Badge variant="outline" className="text-sm">
                iOS Application PT ({typeof assignedServices.ios === 'string' ? assignedServices.ios : assignedServices.ios?.tier || 'N/A'})
              </Badge>
            )}
            {!assignedServices.web && !assignedServices.android && !assignedServices.ios && (
              <p className="text-gray-500">No services assigned</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Details - Web Application PT */}
      {assignedServices.web && services?.web?.details && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="h-5 w-5" />
              Web Application PT - Client Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Badge className="mb-3 bg-blue-600">
                {typeof services.web === 'string' ? services.web : services.web?.tier || 'N/A'}
              </Badge>
              
              <div className="space-y-3 mt-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Scope URL (Staging Environment)</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.web.details.scopeUrl || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">User Matrix</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.web.details.userMatrix || 'N/A'}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Login Credentials</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.web.details.credentials || 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Details - Android Application PT */}
      {assignedServices.android && services?.android?.details && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <FileText className="h-5 w-5" />
              Android Application PT - Client Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Badge className="mb-3 bg-green-600">
                {typeof services.android === 'string' ? services.android : services.android?.tier || 'N/A'}
              </Badge>
              
              <div className="space-y-3 mt-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">SSL Pinned APK</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.android.details.sslPinnedApk || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">SSL Unpinned APK</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.android.details.sslUnpinnedApk || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">User Matrix</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.android.details.userMatrix || 'N/A'}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Login Credentials</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.android.details.credentials || 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Details - iOS Application PT */}
      {assignedServices.ios && services?.ios?.details && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <FileText className="h-5 w-5" />
              iOS Application PT - Client Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <Badge className="mb-3 bg-purple-600">
                {typeof services.ios === 'string' ? services.ios : services.ios?.tier || 'N/A'}
              </Badge>
              
              <div className="space-y-3 mt-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">TestFlight iOS Invite (SSL Pinned)</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.ios.details.testflightPinned || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">TestFlight iOS Invite (SSL Unpinned)</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.ios.details.testflightUnpinned || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">IPA File/URL</h4>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border break-all">
                    {services.ios.details.ipaFile || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">User Matrix</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.ios.details.userMatrix || 'N/A'}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Login Credentials</h4>
                  <pre className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                    {services.ios.details.credentials || 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {organization.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{organization.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
