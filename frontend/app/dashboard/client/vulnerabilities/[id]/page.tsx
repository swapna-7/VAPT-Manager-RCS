"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft, Loader2, Building2, User, Calendar, CheckCircle, XCircle, RotateCcw, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: string;
  cvss_score: number | null;
  affected_systems: string;
  remediation: string;
  client_status: string | null;
  client_comments: string | null;
  client_updated_at: string | null;
  admin_comments: string | null;
  verification_status: string | null;
  created_at: string;
  approved_at: string | null;
  service_type: string | null;
  poc: string | null;
  instances: string | null;
  cwe_id: string | null;
  security_team_comments: string | null;
  client_deadline: string | null;
  organizations: {
    name: string;
    contact_email: string | null;
  };
  profiles: {
    full_name: string | null;
  };
}

export default function ClientVulnerabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientComments, setClientComments] = useState("");

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

      // Verify user is client
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Client") {
        router.push("/dashboard/client");
        return;
      }

      // Fetch vulnerability details - step 1: get vulnerability
      const { data: vuln, error } = await supabase
        .from("vulnerabilities")
        .select("*")
        .eq("id", unwrappedParams.id)
        .eq("assigned_to_client", user.id)
        .single();

      if (error) {
        console.error("Error fetching vulnerability:", error);
        return;
      }

      if (!vuln) {
        router.push("/dashboard/client/vulnerabilities");
        return;
      }

      // Step 2: Get organization details
      const { data: org } = await supabase
        .from("organizations")
        .select("name, contact_email")
        .eq("id", vuln.organization_id)
        .single();

      // Step 3: Get submitter profile
      const { data: submitter } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", vuln.submitted_by)
        .single();

      // Transform the data
      const transformedVuln = {
        ...vuln,
        organizations: org || { name: "Unknown", contact_email: null },
        profiles: submitter || { full_name: null }
      };

      setVulnerability(transformedVuln);
      setClientComments(transformedVuln.client_comments || "");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!currentUser || !vulnerability) return;

    if (!clientComments.trim()) {
      alert("Please provide comments explaining why you're reopening this vulnerability.");
      return;
    }

    if (!confirm("Are you sure you want to reopen this vulnerability and send it back to admin?")) {
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("vulnerabilities")
        .update({
          client_status: "reopened",
          client_comments: clientComments.trim(),
          client_updated_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (error) {
        console.error("Error reopening vulnerability:", error);
        alert("Failed to reopen: " + error.message);
        return;
      }

      alert("Vulnerability reopened and sent back to admin!");
      router.push("/dashboard/client/vulnerabilities");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to reopen vulnerability");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = async () => {
    if (!currentUser || !vulnerability) return;

    if (!confirm("Are you sure you want to mark this vulnerability as closed and submit it for verification?")) {
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Update vulnerability status to closed
      const { error: vulnError } = await supabase
        .from("vulnerabilities")
        .update({
          client_status: "closed",
          client_comments: clientComments.trim() || null,
          client_updated_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (vulnError) {
        console.error("Error closing vulnerability:", vulnError);
        alert("Failed to close: " + vulnError.message);
        return;
      }

      // Step 2: Create verification request
      const { error: verificationError } = await supabase
        .from("verifications")
        .insert({
          vulnerability_id: unwrappedParams.id,
          submitted_by_client: currentUser.id,
          client_comments: clientComments.trim() || null,
          verification_status: "pending",
          submitted_at: new Date().toISOString()
        });

      if (verificationError) {
        console.error("Error creating verification:", verificationError);
        alert("Vulnerability closed but failed to create verification request: " + verificationError.message);
        return;
      }

      alert("Vulnerability marked as closed and submitted for verification!");
      router.push("/dashboard/client/verifications");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to close vulnerability");
    } finally {
      setProcessing(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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

  const canTakeAction = vulnerability.client_status !== "closed";



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/client/vulnerabilities"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vulnerabilities
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
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
            <Badge className={getStatusColor(vulnerability.client_status)}>
              {vulnerability.client_status ? vulnerability.client_status.charAt(0).toUpperCase() + vulnerability.client_status.slice(1) : "Open"}
            </Badge>
            {vulnerability.verification_status && vulnerability.verification_status !== "not_submitted" && (
              <Badge className={
                vulnerability.verification_status === "verified" 
                  ? "bg-green-100 text-green-800"
                  : vulnerability.verification_status === "pending_verification" 
                  ? "bg-yellow-100 text-yellow-800"
                  : vulnerability.verification_status === "verification_rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }>
                {vulnerability.verification_status === "verified" 
                  ? "Verified" 
                  : vulnerability.verification_status === "pending_verification"
                  ? "Pending Verification"
                  : "Verification Rejected"}
              </Badge>
            )}
          </div>
        </div>
      </div>

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
          <CardDescription>Details identified by security team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Type */}
          {vulnerability.service_type && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Service Type</p>
              <Badge variant="outline" className="text-sm">
                {vulnerability.service_type}
              </Badge>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.description}</p>
            </div>
          </div>

          {/* POC */}
          {vulnerability.poc && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Proof of Concept (POC)</p>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                {vulnerability.poc.split('\n').filter(link => link.trim()).map((link, index) => (
                  <div key={index}>
                    <a 
                      href={link.trim()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all underline block"
                    >
                      {link.trim()}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instances */}
          {vulnerability.instances && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Instances</p>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <pre className="text-gray-900 whitespace-pre-wrap font-mono text-sm">
                  {vulnerability.instances}
                </pre>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Severity</p>
              <Badge className={getSeverityColor(vulnerability.severity)}>
                {vulnerability.severity}
              </Badge>
            </div>
            {vulnerability.cvss_score && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">CVSS Score (v3.1)</p>
                <p className="text-2xl font-bold text-gray-900">{vulnerability.cvss_score}</p>
              </div>
            )}
            {vulnerability.cwe_id && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">CWE ID</p>
                <Badge variant="outline" className="text-sm font-mono">
                  {vulnerability.cwe_id}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Affected Systems</p>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.affected_systems}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Recommended Remediation</p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.remediation}</p>
            </div>
          </div>

          {/* Security Team Comments */}
          {vulnerability.security_team_comments && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Security Team Comments</p>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.security_team_comments}</p>
              </div>
            </div>
          )}

          {vulnerability.admin_comments && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-600 mb-2">Admin Comments</p>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-gray-900">{vulnerability.admin_comments}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          

          {vulnerability.approved_at && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Assigned On</p>
                <p className="font-semibold text-blue-700">
                  {new Date(vulnerability.approved_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
            <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Deadline</p>
              <p className={`font-semibold ${vulnerability.client_deadline ? 'text-red-700' : 'text-gray-900'}`}>
              {vulnerability.client_deadline 
                ? `${new Date(vulnerability.client_deadline).toLocaleDateString('en-GB')} - ${new Date(vulnerability.client_deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : "No deadline set"}
              </p>
            </div>
            </div>

          {vulnerability.client_updated_at && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-semibold text-gray-900">
                {new Date(vulnerability.client_updated_at).toLocaleDateString()} at{" "}
                {new Date(vulnerability.client_updated_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Your Response
          </CardTitle>
          <CardDescription>
            {canTakeAction
              ? "Add comments and update the status of this vulnerability"
              : "This vulnerability has been closed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {!canTakeAction && "(Read-only)"}
            </Label>
            <Textarea
              id="comments"
              value={clientComments}
              onChange={(e) => setClientComments(e.target.value)}
              placeholder="Add your comments here..."
              rows={6}
              disabled={!canTakeAction}
            />
          </div>

          {canTakeAction && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleClose}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Closed
                  </>
                )}
              </Button>
              <Button
                onClick={handleReopen}
                disabled={processing}
                variant="destructive"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reopen & Send Back
                  </>
                )}
              </Button>
            </div>
          )}

          {!canTakeAction && (
            <div className="pt-4 border-t">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Closed
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
