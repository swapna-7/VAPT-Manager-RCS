"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Loader2, Building2, User, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: string;
  cvss_score: number | null;
  affected_systems: string;
  remediation: string;
  status: string;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  assigned_to_client: string | null;
  client_status: string | null;
  organizations: {
    name: string;
    contact_email: string | null;
  };
  profiles: {
    full_name: string | null;
  };
  approved_by_profile?: {
    full_name: string | null;
  } | null;
  assigned_client_profile?: {
    full_name: string | null;
  } | null;
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);
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

      // Fetch vulnerability details
      const { data: vuln, error } = await supabase
        .from("vulnerabilities")
        .select(`
          *,
          organizations!inner (
            name,
            contact_email
          ),
          profiles!vulnerabilities_submitted_by_fkey (
            full_name
          )
        `)
        .eq("id", unwrappedParams.id)
        .eq("submitted_by", user.id)
        .single();

      if (error) {
        console.error("Error fetching vulnerability:", error);
        return;
      }

      if (!vuln) {
        router.push("/dashboard/security-team/submissions");
        return;
      }

      // Fetch approver details if approved
      let approverData = null;
      if (vuln.approved_by) {
        const { data: approver } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", vuln.approved_by)
          .single();
        approverData = approver;
      }

      // Fetch assigned client details if assigned
      let assignedClientData = null;
      if (vuln.assigned_to_client) {
        const { data: client } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", vuln.assigned_to_client)
          .single();
        assignedClientData = client;
      }

      // Transform the data
      const transformedVuln = {
        ...vuln,
        organizations: Array.isArray(vuln.organizations) ? vuln.organizations[0] : vuln.organizations,
        profiles: Array.isArray(vuln.profiles) ? vuln.profiles[0] : vuln.profiles,
        approved_by_profile: approverData,
        assigned_client_profile: assignedClientData
      };

      setVulnerability(transformedVuln);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!vulnerability) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Vulnerability not found or access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/security-team/submissions"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vulnerability.title}
              </h1>
              <p className="text-gray-600 mt-1">
                Vulnerability Details
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getSeverityColor(vulnerability.severity)}>
              {vulnerability.severity}
            </Badge>
            <Badge className={getStatusColor(vulnerability.status)}>
              {vulnerability.status.charAt(0).toUpperCase() + vulnerability.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {vulnerability.status === "rejected" && vulnerability.admin_comments && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Rejection Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{vulnerability.admin_comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-semibold text-gray-900">{vulnerability.organizations.name}</p>
            </div>
            {vulnerability.organizations.contact_email && (
              <div>
                <p className="text-sm text-gray-600">Contact Email</p>
                <p className="font-semibold text-gray-900">{vulnerability.organizations.contact_email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
            <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Severity</p>
              <Badge className={getSeverityColor(vulnerability.severity)}>
                {vulnerability.severity}
              </Badge>
            </div>
            {vulnerability.cvss_score && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">CVSS Score</p>
                <p className="text-2xl font-bold text-gray-900">{vulnerability.cvss_score}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Affected Systems</p>
            <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.affected_systems}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Remediation Steps</p>
            <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.remediation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Submission Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Submitted By</p>
              <p className="font-semibold text-gray-900">
                {vulnerability.profiles?.full_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Submitted On</p>
              <p className="font-semibold text-gray-900">
                {new Date(vulnerability.created_at).toLocaleDateString()} at{" "}
                {new Date(vulnerability.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {vulnerability.status === "approved" && vulnerability.approved_at && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Approved By</p>
                <p className="font-semibold text-green-700">
                  {vulnerability.approved_by_profile?.full_name || "Admin"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved On</p>
                <p className="font-semibold text-green-700">
                  {new Date(vulnerability.approved_at).toLocaleDateString()} at{" "}
                  {new Date(vulnerability.approved_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {vulnerability.assigned_to_client && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Assigned to Client</p>
                <p className="font-semibold text-blue-700">
                  {vulnerability.assigned_client_profile?.full_name || "Unknown Client"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Client Status</p>
                <Badge className={
                  vulnerability.client_status === "closed" ? "bg-green-100 text-green-800" :
                  vulnerability.client_status === "reopened" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                }>
                  {vulnerability.client_status ? vulnerability.client_status.charAt(0).toUpperCase() + vulnerability.client_status.slice(1) : "Open"}
                </Badge>
              </div>
            </div>
          )}

          {vulnerability.admin_comments && vulnerability.status !== "rejected" && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Admin Comments</p>
              <p className="text-gray-900">{vulnerability.admin_comments}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
