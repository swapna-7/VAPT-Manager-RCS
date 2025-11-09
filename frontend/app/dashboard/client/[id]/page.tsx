import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClientDashboard({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify the authenticated user matches the ID in the URL
  if (user.id !== id) {
    redirect(`/dashboard/client/${user.id}`);
  }

  // Fetch the user's profile first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
    console.error("Error details:", JSON.stringify(profileError, null, 2));
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Unable to load your profile.
            </p>
            {profileError.message && (
              <p className="text-sm text-gray-500 mt-2">
                Error: {profileError.message}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Please contact support if this issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Profile Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your profile could not be found. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify the user has Client role
  if (profile.role !== "Client") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You do not have permission to access this page. Your role is: {profile.role}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch organization details if user has an organization_id
  let organization = null;
  if (profile.organization_id) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();
    
    organization = orgData;
  }

  // Check if account is suspended
  if (profile.suspended) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Account Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your account has been suspended. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if account is approved
  if (profile.status !== "approved") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your account is pending approval by an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userEmail = user.email || "No email";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {profile.full_name || "Client"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Full Name</p>
              <p className="font-semibold text-gray-900">
                {profile.full_name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </p>
              <p className="font-semibold text-gray-900">{userEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                {profile.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={getStatusColor(profile.status)}>
                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Member Since
              </p>
              <p className="font-semibold text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization ? (
              <>
                <div>
                  <p className="text-sm text-gray-600">Organization Name</p>
                  <p className="font-semibold text-gray-900">
                    {organization.name}
                  </p>
                </div>
                {organization.contact_email && (
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </p>
                    <p className="font-semibold text-gray-900">
                      {organization.contact_email}
                    </p>
                  </div>
                )}
                {organization.contact_phone && (
                  <div>
                    <p className="text-sm text-gray-600">Contact Phone</p>
                    <p className="font-semibold text-gray-900">
                      {organization.contact_phone}
                    </p>
                  </div>
                )}
                {organization.address && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold text-gray-900">
                      {organization.address}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-gray-600">No organization assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-gray-600 mt-1">
              {profile.suspended ? "Account is suspended" : "Account is active"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
            {profile.status === "approved" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile.status}</div>
            <p className="text-xs text-gray-600 mt-1">
              {profile.status === "approved"
                ? "Full access granted"
                : "Waiting for administrator approval"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Type</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.role}</div>
            <p className="text-xs text-gray-600 mt-1">Standard client account</p>
          </CardContent>
        </Card>
      </div>

      {organization?.services && (
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Services available to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {typeof organization.services === "object" &&
              Array.isArray(organization.services) ? (
                organization.services.map((service: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {service}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-600">No services assigned</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {organization?.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">
              {organization.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
