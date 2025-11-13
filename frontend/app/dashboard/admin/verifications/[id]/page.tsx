"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ArrowLeft, Loader2, Building2, User, Calendar, Shield, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface SecurityTeamUser {
  id: string;
  full_name: string | null;
}

export default function AdminVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [vulnerability, setVulnerability] = useState<any>(null);
  const [securityTeamUsers, setSecurityTeamUsers] = useState<SecurityTeamUser[]>([]);
  const [selectedSecurityTeam, setSelectedSecurityTeam] = useState("");
  const [adminComments, setAdminComments] = useState("");
  const [verificationDeadline, setVerificationDeadline] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Admin") {
        router.push("/dashboard/admin");
        return;
      }

      // Fetch verification details
      const { data: verif, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("id", unwrappedParams.id)
        .single();

      if (error || !verif) {
        console.error("Error fetching verification:", error);
        return;
      }

      setVerification(verif);
      setAdminComments(verif.admin_comments || "");

      // Fetch vulnerability details
      const { data: vuln } = await supabase
        .from("vulnerabilities")
        .select(`
          *,
          organizations!inner (
            id,
            name,
            contact_email
          ),
          submitter:profiles!vulnerabilities_submitted_by_fkey (
            full_name
          ),
          client:profiles!vulnerabilities_assigned_to_client_fkey (
            full_name
          )
        `)
        .eq("id", verif.vulnerability_id)
        .single();

      if (vuln) {
        setVulnerability({
          ...vuln,
          organizations: Array.isArray(vuln.organizations) ? vuln.organizations[0] : vuln.organizations,
          submitter: Array.isArray(vuln.submitter) ? vuln.submitter[0] : vuln.submitter,
          client: Array.isArray(vuln.client) ? vuln.client[0] : vuln.client
        });

        // Fetch all security team users
        const { data: allSecurityTeam } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "Security-team")
          .eq("status", "approved")
          .eq("suspended", false)
          .order("full_name");

        if (allSecurityTeam && allSecurityTeam.length > 0) {
          setSecurityTeamUsers(allSecurityTeam);
          
          // Pre-select the original submitter if they're in the list
          const originalSubmitter = allSecurityTeam.find(user => user.id === vuln.submitted_by);
          if (originalSubmitter) {
            setSelectedSecurityTeam(originalSubmitter.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSecurityTeam) {
      alert("Please select a security team member");
      return;
    }

    if (!confirm("Are you sure you want to assign this verification to the security team?")) {
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("verifications")
        .update({
          assigned_to_security_team: selectedSecurityTeam,
          verification_status: "assigned",
          admin_comments: adminComments.trim() || null,
          verification_deadline: verificationDeadline ? new Date(verificationDeadline).toISOString() : null,
          assigned_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (error) {
        console.error("Error assigning verification:", error);
        alert("Failed to assign: " + error.message);
        return;
      }

      // Create notification for security team member
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          type: "verification_assigned",
          user_id: selectedSecurityTeam,
          actor_id: currentUser.id,
          payload: {
            verification_id: verification.id,
            vulnerability_id: vulnerability?.id,
            vulnerability_title: vulnerability?.title,
            organization_name: vulnerability?.organizations?.name,
            verification_deadline: verificationDeadline ? new Date(verificationDeadline).toISOString() : null,
          },
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }

      alert("Verification assigned successfully!");
      router.push("/dashboard/admin/verifications");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to assign verification");
    } finally {
      setProcessing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!verification || !vulnerability) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Verification not found</p>
      </div>
    );
  }

  const isPending = verification.verification_status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/admin/verifications"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Verifications
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vulnerability.title}
              </h1>
              <p className="text-gray-600 mt-1">
                Verification Request
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getSeverityColor(vulnerability.severity)}>
              {vulnerability.severity}
            </Badge>
            <Badge className={getStatusColor(verification.verification_status)}>
              {verification.verification_status.charAt(0).toUpperCase() + verification.verification_status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Organization and Client Info */}
      <div className="grid md:grid-cols-2 gap-6">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Submitted By (Client)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold text-gray-900">
                  {vulnerability.client?.full_name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Submitted On</p>
                <p className="font-semibold text-gray-900">
                  {new Date(verification.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerability Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Information</CardTitle>
          <CardDescription>Details of the vulnerability requiring verification</CardDescription>
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
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <a 
                  href={vulnerability.poc} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all underline"
                >
                  {vulnerability.poc}
                </a>
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
            <p className="text-sm font-medium text-gray-600 mb-2">Remediation Steps</p>
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
        </CardContent>
      </Card>

      {/* Client Comments */}
      {vulnerability.client_comments && (
        <Card>
          <CardHeader>
            <CardTitle>Client Comments</CardTitle>
            <CardDescription>Comments from client about their remediation efforts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.client_comments}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign to Security Team
          </CardTitle>
          <CardDescription>
            {isPending 
              ? "Assign this verification to any security team member for verification"
              : "This verification has been assigned"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="security-team">Security Team Member</Label>
            <select
              id="security-team"
              value={selectedSecurityTeam}
              onChange={(e) => setSelectedSecurityTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={!isPending}
            >
              <option value="">Select security team member...</option>
              {securityTeamUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || "Unnamed User"}
                  {user.id === vulnerability.submitted_by ? " (Original Submitter)" : ""}
                </option>
              ))}
            </select>
            {securityTeamUsers.length === 0 && (
              <p className="text-sm text-red-600">No security team members available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              placeholder="Add any comments for the security team..."
              rows={4}
              disabled={!isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-deadline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Verification Deadline (Optional)
            </Label>
            <Input
              id="verification-deadline"
              type="datetime-local"
              value={verificationDeadline}
              onChange={(e) => setVerificationDeadline(e.target.value)}
              disabled={!isPending}
            />
            <p className="text-xs text-gray-500">
              Set a deadline for the security team to verify this fix
            </p>
          </div>

          {isPending && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAssign}
                disabled={!selectedSecurityTeam || processing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Assign to Security Team
                  </>
                )}
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className={getStatusColor(verification.verification_status)}>
                  {verification.verification_status.charAt(0).toUpperCase() + verification.verification_status.slice(1)}
                </Badge>
              </div>
              {verification.assigned_at && (
                <p className="text-sm text-gray-600 mt-2">
                  Assigned on: {new Date(verification.assigned_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
