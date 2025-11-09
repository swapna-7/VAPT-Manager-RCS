"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Loader2, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  organization_id: string;
  organizations: {
    name: string;
  };
  admin_comments: string | null;
}

type TabType = "all" | "pending" | "approved" | "rejected";

export default function SubmissionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(user);

      // Verify user is security team
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Security-team") {
        router.push("/dashboard/security-team");
        return;
      }

      // Fetch user's vulnerability submissions
      const { data: vulns, error } = await supabase
        .from("vulnerabilities")
        .select(`
          id,
          title,
          severity,
          status,
          created_at,
          organization_id,
          admin_comments,
          organizations!inner (
            name
          )
        `)
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });

      if (!error && vulns) {
        // Transform the data
        const transformed = vulns.map((item: any) => ({
          ...item,
          organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        }));
        setVulnerabilities(transformed);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredVulnerabilities = vulnerabilities.filter((vuln) => {
    if (activeTab === "all") return true;
    return vuln.status === activeTab;
  });

  const getCounts = () => {
    return {
      all: vulnerabilities.length,
      pending: vulnerabilities.filter(v => v.status === "pending").length,
      approved: vulnerabilities.filter(v => v.status === "approved").length,
      rejected: vulnerabilities.filter(v => v.status === "rejected").length
    };
  };

  const counts = getCounts();

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
            <p className="text-gray-600 mt-1">
              Track your vulnerability submissions and their status
            </p>
          </div>
        </div>
        <Link href="/dashboard/security-team/submissions/new">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            New Submission
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "all"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Submitted ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending Approval ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "approved"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Approved ({counts.approved})
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "rejected"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Rejected ({counts.rejected})
          </button>
        </div>
      </div>

      {/* Submissions List */}
      {filteredVulnerabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {activeTab === "all"
                  ? "No submissions yet"
                  : `No ${activeTab} submissions`}
              </p>
              {activeTab === "all" && (
                <Link href="/dashboard/security-team/submissions/new">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Submission
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVulnerabilities.map((vuln) => (
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
                    <p className="text-sm text-gray-600 mb-2">
                      Organization: <span className="font-medium">{vuln.organizations.name}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(vuln.created_at).toLocaleDateString()} at{" "}
                      {new Date(vuln.created_at).toLocaleTimeString()}
                    </p>
                    {vuln.status === "rejected" && vuln.admin_comments && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800 mb-1">
                          Admin Comments:
                        </p>
                        <p className="text-sm text-red-700">{vuln.admin_comments}</p>
                      </div>
                    )}
                  </div>
                  <Link href={`/dashboard/security-team/submissions/${vuln.id}`}>
                    <Button variant="outline" size="sm">
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
