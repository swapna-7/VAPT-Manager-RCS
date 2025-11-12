"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, FileText, Calendar, Loader2, User, Building2 } from "lucide-react";

interface Verification {
  id: string;
  vulnerability_id: string;
  submitted_by_client: string;
  client_comments: string | null;
  assigned_to_security_team: string | null;
  verification_deadline: string | null;
  verification_status: string;
  security_team_comments: string | null;
  admin_comments: string | null;
  submitted_at: string;
  assigned_at: string | null;
  verified_at: string | null;
  vulnerability: {
    title: string;
    severity: string;
    service_type: string | null;
    organization_id: string;
  };
  organization: {
    name: string;
  };
  security_team_profile?: {
    full_name: string | null;
  };
}

export default function ClientVerificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<Verification[]>([]);

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

      // Fetch verifications submitted by this client
      const { data: verificationsData, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("submitted_by_client", user.id)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching verifications:", error);
        return;
      }

      if (!verificationsData || verificationsData.length === 0) {
        setVerifications([]);
        setLoading(false);
        return;
      }

      // Fetch vulnerability details for each verification
      const vulnIds = verificationsData.map(v => v.vulnerability_id);
      const { data: vulnerabilities } = await supabase
        .from("vulnerabilities")
        .select("id, title, severity, service_type, organization_id")
        .in("id", vulnIds);

      // Fetch organization details
      const orgIds = vulnerabilities?.map(v => v.organization_id) || [];
      const { data: organizations } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      // Fetch security team profiles
      const securityTeamIds = verificationsData
        .map(v => v.assigned_to_security_team)
        .filter(id => id !== null);
      
      const { data: securityTeamProfiles } = securityTeamIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", securityTeamIds)
        : { data: [] };

      // Combine all data
      const enrichedVerifications = verificationsData.map(verification => {
        const vulnerability = vulnerabilities?.find(v => v.id === verification.vulnerability_id);
        const organization = organizations?.find(o => o.id === vulnerability?.organization_id);
        const securityTeamProfile = securityTeamProfiles?.find(p => p.id === verification.assigned_to_security_team);

        return {
          ...verification,
          vulnerability: vulnerability || {
            title: "Unknown",
            severity: "N/A",
            service_type: null,
            organization_id: ""
          },
          organization: organization || { name: "Unknown" },
          security_team_profile: securityTeamProfile || null
        };
      });

      setVerifications(enrichedVerifications);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "assigned":
        return <User className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verification Requests</h1>
        <p className="text-gray-600 mt-2">
          Track the verification status of your closed vulnerabilities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Submitted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verifications.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {verifications.filter(v => v.verification_status === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {verifications.filter(v => v.verification_status === "verified").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {verifications.filter(v => v.verification_status === "rejected").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List */}
      {verifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No verification requests yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Close a vulnerability to submit it for verification
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((verification) => (
            <Card key={verification.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">
                        {verification.vulnerability.title}
                      </CardTitle>
                      <Badge className={getSeverityColor(verification.vulnerability.severity)}>
                        {verification.vulnerability.severity}
                      </Badge>
                      <Badge className={getStatusColor(verification.verification_status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(verification.verification_status)}
                          {verification.verification_status.charAt(0).toUpperCase() + 
                           verification.verification_status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {verification.organization.name}
                      </span>
                      {verification.vulnerability.service_type && (
                        <Badge variant="outline" className="text-xs">
                          {verification.vulnerability.service_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Timeline */}
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      Submitted
                    </p>
                    <p className="font-semibold text-gray-900">
                      {new Date(verification.submitted_at).toLocaleDateString()}
                    </p>
                  </div>

                  {verification.assigned_at && (
                    <div>
                      <p className="text-gray-600 flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        Assigned
                      </p>
                      <p className="font-semibold text-gray-900">
                        {new Date(verification.assigned_at).toLocaleDateString()}
                      </p>
                      {verification.security_team_profile?.full_name && (
                        <p className="text-xs text-gray-600">
                          to {verification.security_team_profile.full_name}
                        </p>
                      )}
                    </div>
                  )}

                  {verification.verified_at && (
                    <div>
                      <p className="text-gray-600 flex items-center gap-1 mb-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </p>
                      <p className="font-semibold text-gray-900">
                        {new Date(verification.verified_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {verification.verification_deadline && (
                    <div>
                      <p className="text-gray-600 flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3" />
                        Deadline
                      </p>
                      <p className={`font-semibold ${
                        new Date(verification.verification_deadline) < new Date()
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}>
                        {new Date(verification.verification_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Comments */}
                {verification.client_comments && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-1">Your Comments</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                      {verification.client_comments}
                    </p>
                  </div>
                )}

                {verification.admin_comments && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-1">Admin Comments</p>
                    <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                      {verification.admin_comments}
                    </p>
                  </div>
                )}

                {verification.security_team_comments && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-1">Security Team Comments</p>
                    <p className="text-sm text-gray-900 bg-purple-50 p-3 rounded border border-purple-200">
                      {verification.security_team_comments}
                    </p>
                  </div>
                )}

                {/* Status Message */}
                {verification.verification_status === "rejected" && (
                  <div className="pt-3 border-t">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        <strong>Verification Rejected:</strong> The security team has rejected this verification.
                        Please review the comments and take necessary action.
                      </p>
                    </div>
                  </div>
                )}

                {verification.verification_status === "verified" && (
                  <div className="pt-3 border-t">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>Verified:</strong> The security team has confirmed that this vulnerability has been fixed.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
