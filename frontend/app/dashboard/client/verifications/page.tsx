"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, Send, Clock, XCircle, Shield, Loader2 } from "lucide-react";
import Link from "next/link";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  client_status: string;
  verification_status: string | null;
  created_at: string;
  organizations: {
    name: string;
  };
}

interface Verification {
  id: string;
  vulnerability_id: string;
  verification_status: string;
  created_at: string;
  verified_at: string | null;
  security_team_comments: string | null;
}

export default function ClientVerificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("not_submitted");
  const [submitting, setSubmitting] = useState<string | null>(null);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "Client") {
        router.push("/dashboard/client");
        return;
      }

      // Fetch closed vulnerabilities
      const { data: vulnsData } = await supabase
        .from("vulnerabilities")
        .select(`
          id,
          title,
          severity,
          client_status,
          verification_status,
          created_at,
          organizations!inner (
            name
          )
        `)
        .eq("assigned_to_client", user.id)
        .eq("client_status", "closed")
        .order("created_at", { ascending: false });

      const transformed = (vulnsData || []).map((item: any) => ({
        ...item,
        organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
      }));

      setVulnerabilities(transformed);

      // Fetch verifications
      const { data: verificationsData } = await supabase
        .from("verifications")
        .select("*")
        .eq("submitted_by_client", user.id)
        .order("created_at", { ascending: false });

      setVerifications(verificationsData || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForVerification = async (vulnerabilityId: string) => {
    try {
      setSubmitting(vulnerabilityId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase.from("verifications").insert({
        vulnerability_id: vulnerabilityId,
        submitted_by_client: user.id,
        verification_status: "pending"
      });

      await supabase
        .from("vulnerabilities")
        .update({ verification_status: "pending_verification" })
        .eq("id", vulnerabilityId);

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send for verification");
    } finally {
      setSubmitting(null);
    }
  };

  // Create a map of vulnerability_id to verification
  const verificationMap = new Map(
    verifications.map((v: any) => [v.vulnerability_id, v])
  );

  // Calculate counts
  const notSubmitted = vulnerabilities.filter((v: any) => 
    !v.verification_status || v.verification_status === "not_submitted"
  );
  const pendingCount = vulnerabilities.filter((v: any) => 
    v.verification_status === "pending_verification"
  ).length;
  const verifiedCount = vulnerabilities.filter((v: any) => 
    v.verification_status === "verified"
  ).length;
  const rejectedCount = vulnerabilities.filter((v: any) => 
    v.verification_status === "verification_rejected"
  ).length;

  // Filter based on active tab
  const filteredVulnerabilities = vulnerabilities.filter((v: any) => {
    if (activeTab === "not_submitted") return !v.verification_status || v.verification_status === "not_submitted";
    if (activeTab === "pending") return v.verification_status === "pending_verification";
    if (activeTab === "verified") return v.verification_status === "verified";
    if (activeTab === "rejected") return v.verification_status === "verification_rejected";
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
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verifications</h1>
          <p className="text-gray-600 mt-1">
            Submit closed vulnerabilities for verification
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Submitted</CardTitle>
            <Send className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{notSubmitted.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List with Tabs */}
      <Tabs defaultValue="not_submitted" onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Requests</CardTitle>
              <TabsList>
                <TabsTrigger value="not_submitted">
                  Not Submitted ({notSubmitted.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="verified">
                  Verified ({verifiedCount})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedCount})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="not_submitted">
              <VerificationList 
                vulnerabilities={filteredVulnerabilities} 
                verificationMap={verificationMap}
                onSendForVerification={handleSendForVerification}
                submitting={submitting}
                emptyMessage="No vulnerabilities ready for verification submission"
              />
            </TabsContent>
            <TabsContent value="pending">
              <VerificationList 
                vulnerabilities={filteredVulnerabilities} 
                verificationMap={verificationMap}
                onSendForVerification={handleSendForVerification}
                submitting={submitting}
                emptyMessage="No pending verifications"
              />
            </TabsContent>
            <TabsContent value="verified">
              <VerificationList 
                vulnerabilities={filteredVulnerabilities} 
                verificationMap={verificationMap}
                onSendForVerification={handleSendForVerification}
                submitting={submitting}
                emptyMessage="No verified vulnerabilities"
              />
            </TabsContent>
            <TabsContent value="rejected">
              <VerificationList 
                vulnerabilities={filteredVulnerabilities} 
                verificationMap={verificationMap}
                onSendForVerification={handleSendForVerification}
                submitting={submitting}
                emptyMessage="No rejected verifications"
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Verification List Component
function VerificationList({ 
  vulnerabilities, 
  verificationMap,
  onSendForVerification,
  submitting,
  emptyMessage
}: { 
  vulnerabilities: any[]; 
  verificationMap: Map<string, any>;
  onSendForVerification: (id: string) => void;
  submitting: string | null;
  emptyMessage: string;
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

  const getVerificationColor = (status: string | null) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "pending_verification": return "bg-yellow-100 text-yellow-800";
      case "verification_rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationIcon = (status: string | null) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-4 w-4" />;
      case "pending_verification": return <Clock className="h-4 w-4" />;
      case "verification_rejected": return <XCircle className="h-4 w-4" />;
      default: return <Send className="h-4 w-4" />;
    }
  };

  if (vulnerabilities.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vulnerabilities.map((vuln: any) => {
        const verification = verificationMap.get(vuln.id);
        const canSubmit = !vuln.verification_status || vuln.verification_status === "not_submitted";
        
        return (
          <div key={vuln.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{vuln.title}</h3>
                  <Badge className={getSeverityColor(vuln.severity)}>
                    {vuln.severity}
                  </Badge>
                  <Badge className={getVerificationColor(vuln.verification_status)}>
                    <span className="flex items-center gap-1">
                      {getVerificationIcon(vuln.verification_status)}
                      {vuln.verification_status === "verified" ? "Verified" :
                       vuln.verification_status === "pending_verification" ? "Pending" :
                       vuln.verification_status === "verification_rejected" ? "Rejected" :
                       "Not Submitted"}
                    </span>
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Organization: {vuln.organizations.name}
                </p>
                {vuln.verification_status === "verified" && verification?.verified_at && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-semibold text-green-900 mb-1">
                      ✓ Verified by Security Team
                    </p>
                    <p className="text-xs text-green-700">
                      Verified on: {new Date(verification.verified_at).toLocaleDateString()}
                    </p>
                    {verification.security_team_comments && (
                      <p className="text-sm text-green-900 mt-2">
                        <strong>Comments:</strong> {verification.security_team_comments}
                      </p>
                    )}
                  </div>
                )}
                {vuln.verification_status === "verification_rejected" && verification?.security_team_comments && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      ✗ Verification Rejected
                    </p>
                    <p className="text-sm text-red-900 mt-2">
                      <strong>Reason:</strong> {verification.security_team_comments}
                    </p>
                  </div>
                )}
                {vuln.verification_status === "pending_verification" && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-900">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Awaiting verification from security team
                    </p>
                  </div>
                )}
              </div>
              {canSubmit && (
                <Button 
                  onClick={() => onSendForVerification(vuln.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting === vuln.id}
                >
                  {submitting === vuln.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send for Verification
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
