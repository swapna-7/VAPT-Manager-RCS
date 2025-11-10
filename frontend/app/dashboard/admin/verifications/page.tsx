import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";
import Link from "next/link";

interface Verification {
  id: string;
  verification_status: string;
  created_at: string;
  vulnerabilities: {
    title: string;
    severity: string;
    organizations: {
      name: string;
    };
  };
  client_profile: {
    full_name: string | null;
  };
}

export default async function AdminVerificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Admin") {
    redirect("/dashboard/admin");
  }

  // Fetch all verifications
  const { data: verifications } = await supabase
    .from("verifications")
    .select(`
      id,
      verification_status,
      created_at,
      vulnerabilities!inner (
        title,
        severity,
        organizations!inner (
          name
        )
      ),
      client_profile:profiles!verifications_submitted_by_client_fkey (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  const transformedVerifications = (verifications || []).map((item: any) => ({
    ...item,
    vulnerabilities: {
      ...item.vulnerabilities,
      organizations: Array.isArray(item.vulnerabilities.organizations) 
        ? item.vulnerabilities.organizations[0] 
        : item.vulnerabilities.organizations
    },
    client_profile: Array.isArray(item.client_profile) ? item.client_profile[0] : item.client_profile
  }));

  const pendingCount = transformedVerifications.filter((v: Verification) => 
    v.verification_status === "pending"
  ).length;
  const assignedCount = transformedVerifications.filter((v: Verification) => 
    v.verification_status === "assigned"
  ).length;
  const verifiedCount = transformedVerifications.filter((v: Verification) => 
    v.verification_status === "verified"
  ).length;
  const rejectedCount = transformedVerifications.filter((v: Verification) => 
    v.verification_status === "rejected"
  ).length;

  const pendingVerifications = transformedVerifications.filter((v: Verification) => 
    v.verification_status === "pending"
  );
  const otherVerifications = transformedVerifications.filter((v: Verification) => 
    v.verification_status !== "pending"
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-red-100 text-red-800";
      case "High": return "bg-orange-100 text-orange-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-blue-100 text-blue-800";
      case "Informational": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "assigned": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-4 w-4" />;
      case "assigned": return <Shield className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verification Requests</h1>
          <p className="text-gray-600 mt-1">
            Assign verification requests to security team members
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assignedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List */}
      {transformedVerifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No verification requests yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingCount > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Assignment ({pendingCount})
              </h2>
              <div className="space-y-3">
                {pendingVerifications.map((verif: Verification) => (
                  <Card key={verif.id} className="border-yellow-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {verif.vulnerabilities.title}
                            </h3>
                            <Badge className={getSeverityColor(verif.vulnerabilities.severity)}>
                              {verif.vulnerabilities.severity}
                            </Badge>
                            <Badge className={getStatusColor(verif.verification_status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(verif.verification_status)}
                                Pending
                              </span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {verif.vulnerabilities.organizations.name}
                            </span>
                            <span>
                              Submitted by: {verif.client_profile?.full_name || "Unknown"}
                            </span>
                            <span>
                              {new Date(verif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/admin/verifications/${verif.id}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            <Eye className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {otherVerifications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                All Verification Requests
              </h2>
              <div className="space-y-3">
                {otherVerifications.map((verif: Verification) => (
                  <Card key={verif.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {verif.vulnerabilities.title}
                            </h3>
                            <Badge className={getSeverityColor(verif.vulnerabilities.severity)}>
                              {verif.vulnerabilities.severity}
                            </Badge>
                            <Badge className={getStatusColor(verif.verification_status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(verif.verification_status)}
                                {verif.verification_status.charAt(0).toUpperCase() + verif.verification_status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {verif.vulnerabilities.organizations.name}
                            </span>
                            <span>
                              Submitted by: {verif.client_profile?.full_name || "Unknown"}
                            </span>
                            <span>
                              {new Date(verif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/admin/verifications/${verif.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
