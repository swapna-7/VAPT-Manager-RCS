import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  client_status: string | null;
  created_at: string;
  approved_at: string | null;
  organizations: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  };
}

export default async function ClientVulnerabilitiesPage() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify user is client
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Client") {
    redirect("/dashboard/client");
  }

  // Fetch vulnerabilities assigned to this client
  const { data: vulnerabilities } = await supabase
    .from("vulnerabilities")
    .select(`
      id,
      title,
      severity,
      client_status,
      created_at,
      approved_at,
      organizations!inner (
        name
      ),
      profiles!vulnerabilities_submitted_by_fkey (
        full_name
      )
    `)
    .eq("assigned_to_client", user.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: false });

  // Transform data
  const transformedVulns = (vulnerabilities || []).map((item: any) => ({
    ...item,
    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  }));

  // Calculate counts
  const openCount = transformedVulns.filter((v: Vulnerability) => v.client_status === "open").length;
  const reopenedCount = transformedVulns.filter((v: Vulnerability) => v.client_status === "reopened").length;
  const closedCount = transformedVulns.filter((v: Vulnerability) => v.client_status === "closed").length;

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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "closed":
        return "bg-green-100 text-green-800";
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "reopened":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      case "open":
        return <Clock className="h-4 w-4" />;
      case "reopened":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Vulnerabilities</h1>
          <p className="text-gray-600 mt-1">
            Review and manage vulnerabilities assigned to you
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{openCount}</div>
            <p className="text-xs text-gray-600 mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reopened</CardTitle>
            <RotateCcw className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{reopenedCount}</div>
            <p className="text-xs text-gray-600 mt-1">Sent back to admin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{closedCount}</div>
            <p className="text-xs text-gray-600 mt-1">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities List */}
      {transformedVulns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No vulnerabilities assigned to you yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transformedVulns.map((vuln: Vulnerability) => (
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
                      <Badge className={getStatusColor(vuln.client_status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(vuln.client_status)}
                          {vuln.client_status ? vuln.client_status.charAt(0).toUpperCase() + vuln.client_status.slice(1) : "Open"}
                        </span>
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Organization: {vuln.organizations.name}</p>
                      <p>Submitted by: {vuln.profiles?.full_name || "Unknown"}</p>
                      <p>
                        Assigned: {vuln.approved_at ? new Date(vuln.approved_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Link href={`/dashboard/client/vulnerabilities/${vuln.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
