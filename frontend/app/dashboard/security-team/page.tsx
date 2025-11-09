import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Building2, FileText, AlertCircle } from "lucide-react";

export default async function SecurityTeamDashboard() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the user's profile to verify they are security team
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Unable to load your profile. Error: {profileError.message}
            </p>
            <p className="text-sm text-gray-500 mt-2">
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
              <AlertCircle className="h-5 w-5" />
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

  // Verify the user has Security-team role
  if (profile.role !== "Security-team") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
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

  // Check if account is suspended
  if (profile.suspended) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
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
              <AlertCircle className="h-5 w-5" />
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

  // Redirect to the user's personalized dashboard
  redirect(`/dashboard/security-team/${user.id}`);
}
