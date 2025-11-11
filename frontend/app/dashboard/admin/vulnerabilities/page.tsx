"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Building2, Loader2 } from "lucide-react";
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

export default function AdminVulnerabilitiesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("pending");

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

      if (!profile || profile.role !== "Admin") {
        router.push("/dashboard/admin");
        return;
      }

      // Fetch all vulnerabilities
      const { data: vulnsData } = await supabase
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
  const pendingCount = vulnerabilities.filter((v: any) => v.status === "pending").length;
  const approvedCount = vulnerabilities.filter((v: any) => v.status === "approved").length;
  const rejectedCount = vulnerabilities.filter((v: any) => v.status === "rejected").length;

  // Filter based on active tab
  const filteredVulnerabilities = vulnerabilities.filter((v: any) => {
    if (activeTab === "pending") return v.status === "pending";
    if (activeTab === "approved") return v.status === "approved";
    if (activeTab === "rejected") return v.status === "rejected";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

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

      {/* Vulnerabilities List with Tabs */}
      <Tabs defaultValue="pending" onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vulnerability Submissions</CardTitle>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending Review ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedCount})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedCount})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="pending">
              <VulnerabilityList 
                vulnerabilities={filteredVulnerabilities} 
                emptyMessage="No pending vulnerabilities to review"
                showReviewButton={true}
              />
            </TabsContent>
            <TabsContent value="approved">
              <VulnerabilityList 
                vulnerabilities={filteredVulnerabilities} 
                emptyMessage="No approved vulnerabilities"
                showReviewButton={false}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <VulnerabilityList 
                vulnerabilities={filteredVulnerabilities} 
                emptyMessage="No rejected vulnerabilities"
                showReviewButton={false}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Vulnerability List Component
function VulnerabilityList({ 
  vulnerabilities, 
  emptyMessage,
  showReviewButton 
}: { 
  vulnerabilities: any[]; 
  emptyMessage: string;
  showReviewButton: boolean;
}) {
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
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
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
    <div className="space-y-3">
      {vulnerabilities.map((vuln: any) => (
        <div 
          key={vuln.id} 
          className={`border rounded-lg p-4 hover:border-purple-300 transition-colors ${
            vuln.status === "pending" ? "border-yellow-200 bg-yellow-50/30" : "border-gray-200"
          }`}
        >
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
              {showReviewButton ? (
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Eye className="h-4 w-4 mr-1" />
                  Review
                </Button>
              ) : (
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              )}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
