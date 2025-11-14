"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, ArrowLeft, Loader2, Building2, User, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function SecurityTeamVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [vulnerability, setVulnerability] = useState<any>(null);
  const [comments, setComments] = useState("");
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

      if (!profile || profile.role !== "Security-team") {
        router.push("/dashboard/security-team");
        return;
      }

      // Fetch verification details
      const { data: verif, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("id", unwrappedParams.id)
        .eq("assigned_to_security_team", user.id)
        .single();

      if (error || !verif) {
        console.error("Error fetching verification:", error);
        return;
      }

      setVerification(verif);
      setComments(verif.security_team_comments || "");

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
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!confirm("Are you sure you want to mark this as verified?")) {
      return;
    }

    try {
      setProcessing(true);

      const { error: verifError } = await supabase
        .from("verifications")
        .update({
          verification_status: "verified",
          security_team_comments: comments.trim() || null,
          verified_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (verifError) {
        console.error("Error updating verification:", verifError);
        alert("Failed to verify: " + verifError.message);
        return;
      }

      // Update vulnerability verification status
      const { error: vulnError } = await supabase
        .from("vulnerabilities")
        .update({
          verification_status: "verified"
        })
        .eq("id", verification.vulnerability_id);

      if (vulnError) {
        console.error("Error updating vulnerability:", vulnError);
        alert("Verification record updated, but failed to update vulnerability status: " + vulnError.message);
        return;
      }

      // Create notification for client
      if (vulnerability?.assigned_to_client) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            type: "verification_completed",
            user_id: vulnerability.assigned_to_client,
            actor_id: currentUser.id,
            payload: {
              verification_id: verification.id,
              vulnerability_id: vulnerability.id,
              vulnerability_title: vulnerability.title,
              verification_notes: comments.trim() || null,
              verified_by_name: currentUser.user_metadata?.full_name || "Security Team"
            },
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      alert("Verification completed successfully!");
      router.push("/dashboard/security-team/verifications");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to verify");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert("Please provide comments explaining why you are rejecting this verification");
      return;
    }

    if (!confirm("Are you sure you want to reject this verification?")) {
      return;
    }

    try {
      setProcessing(true);

      const { error: verifError } = await supabase
        .from("verifications")
        .update({
          verification_status: "rejected",
          security_team_comments: comments.trim(),
          verified_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (verifError) {
        console.error("Error updating verification:", verifError);
        alert("Failed to reject: " + verifError.message);
        return;
      }

      // Update vulnerability verification status
      const { error: vulnError } = await supabase
        .from("vulnerabilities")
        .update({
          verification_status: "verification_rejected"
        })
        .eq("id", verification.vulnerability_id);

      if (vulnError) {
        console.error("Error updating vulnerability:", vulnError);
        alert("Verification record updated, but failed to update vulnerability status: " + vulnError.message);
        return;
      }

      // Create notification for client
      if (vulnerability?.assigned_to_client) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            type: "verification_rejected",
            user_id: vulnerability.assigned_to_client,
            actor_id: currentUser.id,
            payload: {
              verification_id: verification.id,
              vulnerability_id: vulnerability.id,
              vulnerability_title: vulnerability.title,
              verification_notes: comments.trim(),
            },
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      alert("Verification rejected successfully!");
      router.push("/dashboard/security-team/verifications");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to reject verification");
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
        <p className="text-red-600">Verification not found or not assigned to you</p>
      </div>
    );
  }

  const isAssigned = verification.verification_status === "assigned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/security-team/verifications"
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
                Verify Vulnerability Fix
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
          <CardDescription>Details of the original vulnerability</CardDescription>
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
            <p className="text-sm font-medium text-gray-600 mb-2">Remediation Steps</p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.remediation}</p>
            </div>
          </div>

          {/* Security Team Comments */}
          {vulnerability.security_team_comments && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Original Security Team Comments</p>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-gray-900 whitespace-pre-wrap">{vulnerability.security_team_comments}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Comments */}
      {verification.admin_comments && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-gray-900 whitespace-pre-wrap">{verification.admin_comments}</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Verification Action */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Decision</CardTitle>
          <CardDescription>
            {isAssigned 
              ? "Review the vulnerability and confirm whether it has been properly fixed"
              : "This verification has been completed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {isAssigned && "(Required if rejecting)"}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments about the verification..."
              rows={4}
              disabled={!isAssigned}
            />
          </div>

          {isAssigned && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleVerify}
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
                    Verify as Fixed
                  </>
                )}
              </Button>

              <Button
                onClick={handleReject}
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
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Verification
                  </>
                )}
              </Button>
            </div>
          )}

          {!isAssigned && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className={getStatusColor(verification.verification_status)}>
                  {verification.verification_status.charAt(0).toUpperCase() + verification.verification_status.slice(1)}
                </Badge>
              </div>
              {verification.verified_at && (
                <p className="text-sm text-gray-600 mt-2">
                  Completed on: {new Date(verification.verified_at).toLocaleDateString()}
                </p>
              )}
              {verification.security_team_comments && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">Your Comments:</p>
                  <p className="text-sm text-gray-700">{verification.security_team_comments}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
