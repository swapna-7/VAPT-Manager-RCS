"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft, Loader2, Building2, User, Calendar, CheckCircle, XCircle, MessageSquare, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  approved_by: string | null;
  organization_id: string;
  assigned_to_client: string | null;
  submitted_by: string;
  service_type: string | null;
  poc: string | null;
  instances: string | null;
  cwe_id: string | null;
  security_team_comments: string | null;
  client_status: string | null;
  client_deadline: string | null;
  organizations: {
    name: string;
    contact_email: string | null;
  };
  profiles: {
    full_name: string | null;
  };
  assigned_client_profile?: {
    full_name: string | null;
  } | null;
}

interface ClientUser {
  id: string;
  full_name: string | null;
}

export default function AdminVulnerabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminComments, setAdminComments] = useState("");
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientDeadline, setClientDeadline] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);

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

      // Verify user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Admin") {
        router.push("/dashboard/admin");
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
        .single();

      if (error) {
        console.error("Error fetching vulnerability:", error);
        return;
      }

      if (!vuln) {
        router.push("/dashboard/admin/vulnerabilities");
        return;
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
        assigned_client_profile: assignedClientData
      };

      setVulnerability(transformedVuln);
      setAdminComments(transformedVuln.admin_comments || "");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientUsers = async () => {
    if (!vulnerability) return;

    try {
      setLoadingClients(true);

      // Fetch client users from the vulnerability's organization
      const { data: clients, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("organization_id", vulnerability.organization_id)
        .eq("role", "Client")
        .eq("status", "approved")
        .eq("suspended", false)
        .order("full_name");

      if (!error && clients) {
        setClientUsers(clients);
      }
    } catch (error) {
      console.error("Error loading client users:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleApprove = async () => {
    if (!currentUser || !vulnerability) return;

    // Load client users and show modal
    setShowClientModal(true);
    await loadClientUsers();
  };

  const handleConfirmApproval = async () => {
    if (!currentUser || !vulnerability) return;

    if (!selectedClient) {
      alert("Please select a client user to assign this vulnerability to.");
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("vulnerabilities")
        .update({
          status: "approved",
          admin_comments: adminComments.trim() || null,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          assigned_to_client: selectedClient,
          client_status: "open",
          client_deadline: clientDeadline ? new Date(clientDeadline).toISOString() : null
        })
        .eq("id", unwrappedParams.id);

      if (error) {
        console.error("Error approving vulnerability:", error);
        alert("Failed to approve: " + error.message);
        return;
      }

      // Create notification for security team member (who submitted it)
      const { error: securityNotifError } = await supabase
        .from("notifications")
        .insert({
          type: "vulnerability_approved",
          user_id: vulnerability.submitted_by,
          actor_id: currentUser.id,
          payload: {
            vulnerability_id: vulnerability.id,
            vulnerability_title: vulnerability.title,
            admin_comments: adminComments.trim() || null,
          },
        });

      if (securityNotifError) {
        console.error("Error creating security team notification:", securityNotifError);
      }

      // Create notification for client user
      const { error: clientNotifError } = await supabase
        .from("notifications")
        .insert({
          type: "vulnerability_assigned",
          user_id: selectedClient,
          actor_id: currentUser.id,
          payload: {
            vulnerability_id: vulnerability.id,
            vulnerability_title: vulnerability.title,
            description: vulnerability.description,
            severity: vulnerability.severity,
            client_deadline: clientDeadline ? new Date(clientDeadline).toISOString() : null,
          },
        });

      if (clientNotifError) {
        console.error("Error creating client notification:", clientNotifError);
      }

      alert("Vulnerability approved and assigned successfully!");
      router.push("/dashboard/admin/vulnerabilities");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to approve vulnerability");
    } finally {
      setProcessing(false);
      setShowClientModal(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser || !vulnerability) return;

    if (!adminComments.trim()) {
      alert("Please provide comments explaining why this submission is being rejected.");
      return;
    }

    if (!confirm("Are you sure you want to reject this vulnerability submission?")) {
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("vulnerabilities")
        .update({
          status: "rejected",
          admin_comments: adminComments.trim(),
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", unwrappedParams.id);

      if (error) {
        console.error("Error rejecting vulnerability:", error);
        alert("Failed to reject: " + error.message);
        return;
      }

      alert("Vulnerability rejected");
      router.push("/dashboard/admin/vulnerabilities");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to reject vulnerability");
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
        <p className="text-red-600">Vulnerability not found</p>
      </div>
    );
  }

  const isPending = vulnerability.status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/admin/vulnerabilities"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vulnerabilities
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vulnerability.title}
              </h1>
              <p className="text-gray-600 mt-1">
                Review Vulnerability Submission
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

      {/* Organization and Submitter Info */}
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
              {vulnerability.organizations.contact_email && (
                <div>
                  <p className="text-sm text-gray-600">Contact Email</p>
                  <p className="font-semibold text-gray-900">{vulnerability.organizations.contact_email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Submitted By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold text-gray-900">
                  {vulnerability.profiles?.full_name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Submitted On
                </p>
                <p className="font-semibold text-gray-900">
                  {new Date(vulnerability.created_at).toLocaleDateString()} at{" "}
                  {new Date(vulnerability.created_at).toLocaleTimeString()}
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
          <CardDescription>Details submitted by security team</CardDescription>
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
            <p className="text-sm font-medium text-gray-600 mb-2">Countermeasures / Remediation</p>
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

      {/* Admin Review Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Admin Review
          </CardTitle>
          <CardDescription>
            {isPending
              ? "Add comments and approve or reject this submission"
              : "This submission has been reviewed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {!isPending && vulnerability.admin_comments ? "(Already Submitted)" : ""}
            </Label>
            <Textarea
              id="comments"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              placeholder="Add your review comments here..."
              rows={6}
              disabled={!isPending}
            />
          </div>

          {isPending && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleApprove}
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
                    Approve
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
                    Reject
                  </>
                )}
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className={getStatusColor(vulnerability.status)}>
                  {vulnerability.status.charAt(0).toUpperCase() + vulnerability.status.slice(1)}
                </Badge>
              </div>
              {vulnerability.approved_at && (
                <p className="text-sm text-gray-600">
                  Reviewed on: {new Date(vulnerability.approved_at).toLocaleDateString()} at{" "}
                  {new Date(vulnerability.approved_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Assignment Info */}
      {vulnerability.assigned_to_client && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Assignment
            </CardTitle>
            <CardDescription>
              This vulnerability has been assigned to a client user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Assigned to</p>
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
            {vulnerability.client_deadline && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Remediation Deadline
                </p>
                <p className="font-semibold text-gray-900 mt-1">
                  {new Date(vulnerability.client_deadline).toLocaleDateString()} at{" "}
                  {new Date(vulnerability.client_deadline).toLocaleTimeString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client Assignment Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign to Client User
              </CardTitle>
              <CardDescription>
                Select a client user from {vulnerability?.organizations.name} to assign this vulnerability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : clientUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    No active client users found in this organization.
                  </p>
                  <p className="text-sm text-gray-500">
                    Please create a client user for this organization before approving.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="client-select">Select Client User *</Label>
                    <select
                      id="client-select"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Choose a client user...</option>
                      {clientUsers.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name || "Unnamed User"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-deadline" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Remediation Deadline (Optional)
                    </Label>
                    <Input
                      id="client-deadline"
                      type="datetime-local"
                      value={clientDeadline}
                      onChange={(e) => setClientDeadline(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Set a deadline for the client to remediate this vulnerability
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleConfirmApproval}
                      disabled={!selectedClient || processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Assign
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowClientModal(false);
                        setSelectedClient("");
                        setClientDeadline("");
                      }}
                      disabled={processing}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
