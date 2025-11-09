import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  organizations: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  };
}

export default async function AdminVulnerabilitiesPage() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Admin") {
    redirect("/dashboard/admin");
  }

  // Fetch all vulnerabilities
  const { data: vulnerabilities } = await supabase
    .from("vulnerabilities")
    .select(`
      id,
      title,
      severity,
      status,
      created_at,
      organizations!inner (
        name
      ),
      profiles!vulnerabilities_submitted_by_fkey (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  // Transform data
  const transformedVulns = (vulnerabilities || []).map((item: any) => ({
    ...item,
    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  }));

  // Calculate counts
  const pendingCount = transformedVulns.filter((v: Vulnerability) => v.status === "pending").length;
  const approvedCount = transformedVulns.filter((v: Vulnerability) => v.status === "approved").length;
  const rejectedCount = transformedVulns.filter((v: Vulnerability) => v.status === "rejected").length;

  // Get pending vulnerabilities first
  const pendingVulns = transformedVulns.filter((v: Vulnerability) => v.status === "pending");
  const otherVulns = transformedVulns.filter((v: Vulnerability) => v.status !== "pending");
  const sortedVulns = [...pendingVulns, ...otherVulns];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-blue-100 text-blue-800";
      case "Informational":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vulnerability Reviews</h1>
          <p className="text-gray-600 mt-1">
            Review and approve vulnerability submissions from security team
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-gray-600 mt-1">Verified submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-gray-600 mt-1">Not approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities List */}
      {sortedVulns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No vulnerability submissions yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingCount > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Review ({pendingCount})
              </h2>
              <div className="space-y-3">
                {pendingVulns.map((vuln: Vulnerability) => (
                  <Card key={vuln.id} className="border-yellow-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {vuln.title}
                            </h3>
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity}
                            </Badge>
                            <Badge className={getStatusColor(vuln.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(vuln.status)}
                                Pending
                              </span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {vuln.organizations.name}
                            </span>
                            <span>
                              Submitted by: {vuln.profiles?.full_name || "Unknown"}
                            </span>
                            <span>
                              {new Date(vuln.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/admin/vulnerabilities/${vuln.id}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {otherVulns.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                All Submissions
              </h2>
              <div className="space-y-3">
                {otherVulns.map((vuln: Vulnerability) => (
                  <Card key={vuln.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {vuln.title}
                            </h3>
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity}
                            </Badge>
                            <Badge className={getStatusColor(vuln.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(vuln.status)}
                                {vuln.status.charAt(0).toUpperCase() + vuln.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {vuln.organizations.name}
                            </span>
                            <span>
                              Submitted by: {vuln.profiles?.full_name || "Unknown"}
                            </span>
                            <span>
                              {new Date(vuln.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/admin/vulnerabilities/${vuln.id}`}>
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
