"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
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

export default function ClientVulnerabilitiesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    loadVulnerabilities();
  }, []);

  const loadVulnerabilities = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Client") {
        router.push("/dashboard/client");
        return;
      }

      const { data: vulnsData } = await supabase
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

      const transformed = (vulnsData || []).map((item: any) => ({
        ...item,
        organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));

      setVulnerabilities(transformed);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts
  const openCount = vulnerabilities.filter((v) => v.client_status === "open").length;
  const reopenedCount = vulnerabilities.filter((v) => v.client_status === "reopened").length;
  const closedCount = vulnerabilities.filter((v) => v.client_status === "closed").length;

  // Filter based on active tab
  const filteredVulnerabilities = vulnerabilities.filter((v) => {
    if (activeTab === "open") return v.client_status === "open";
    if (activeTab === "reopened") return v.client_status === "reopened";
    if (activeTab === "closed") return v.client_status === "closed";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
            <p className="text-xs text-gray-600 mt-1">Sent back from verification</p>
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

      {/* Vulnerabilities List with Tabs */}
      <Tabs defaultValue="open" onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vulnerabilities</CardTitle>
              <TabsList>
                <TabsTrigger value="open">
                  Open ({openCount})
                </TabsTrigger>
                <TabsTrigger value="reopened">
                  Reopened ({reopenedCount})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedCount})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="open">
              <VulnerabilityList vulnerabilities={filteredVulnerabilities} emptyMessage="No open vulnerabilities" />
            </TabsContent>
            <TabsContent value="reopened">
              <VulnerabilityList vulnerabilities={filteredVulnerabilities} emptyMessage="No reopened vulnerabilities" />
            </TabsContent>
            <TabsContent value="closed">
              <VulnerabilityList vulnerabilities={filteredVulnerabilities} emptyMessage="No closed vulnerabilities" />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Vulnerability List Component
function VulnerabilityList({ vulnerabilities, emptyMessage }: { vulnerabilities: Vulnerability[]; emptyMessage: string }) {
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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "closed": return "bg-green-100 text-green-800";
      case "open": return "bg-yellow-100 text-yellow-800";
      case "reopened": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "closed": return <CheckCircle className="h-4 w-4" />;
      case "open": return <Clock className="h-4 w-4" />;
      case "reopened": return <RotateCcw className="h-4 w-4" />;
      default: return null;
    }
  };

  if (vulnerabilities.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vulnerabilities.map((vuln) => (
        <div key={vuln.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
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
        </div>
      ))}
    </div>
  );
}
