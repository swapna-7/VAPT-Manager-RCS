"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VulnerabilityDetailModal from "@/components/vulnerability-detail-modal";
import { 
  AlertCircle, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle,
  Eye,
  Clock,
  FileText
} from "lucide-react";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: string;
  client_status: string | null;
  service_type: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  assigned_to_client: string | null;
  client_updated_at: string | null;
  submitted_by_profile?: {
    full_name: string;
  }[];
  approved_by_profile?: {
    full_name: string;
  }[];
  assigned_to_client_profile?: {
    full_name: string;
  }[];
  verifications?: Array<{
    id: string;
    verification_status: string;
    assigned_to_security_team: string | null;
    verified_at: string | null;
    submitted_at: string;
    assigned_to_security_team_profile?: {
      full_name: string;
    }[];
  }>;
}

interface OrganizationVulnerabilitiesTabProps {
  organizationId: string;
}

export default function OrganizationVulnerabilitiesTab({ organizationId }: OrganizationVulnerabilitiesTabProps) {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVulnId, setSelectedVulnId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadVulnerabilities();
  }, [organizationId]);

  const loadVulnerabilities = async () => {
    try {
      setLoading(true);

      // Fetch vulnerabilities
      const { data: vulnData, error: vulnError } = await supabase
        .from("vulnerabilities")
        .select(`
          id,
          title,
          severity,
          status,
          client_status,
          service_type,
          created_at,
          approved_at,
          approved_by,
          assigned_to_client,
          client_updated_at,
          submitted_by
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (vulnError) {
        console.error("Error loading vulnerabilities:", vulnError);
        return;
      }

      if (!vulnData || vulnData.length === 0) {
        setVulnerabilities([]);
        return;
      }

      // Collect all user IDs
      const userIds = new Set<string>();
      vulnData.forEach(vuln => {
        if (vuln.submitted_by) userIds.add(vuln.submitted_by);
        if (vuln.approved_by) userIds.add(vuln.approved_by);
        if (vuln.assigned_to_client) userIds.add(vuln.assigned_to_client);
      });

      // Fetch verifications for these vulnerabilities
      const { data: verificationsData } = await supabase
        .from("verifications")
        .select(`
          id,
          vulnerability_id,
          verification_status,
          assigned_to_security_team,
          verified_at,
          submitted_at
        `)
        .in("vulnerability_id", vulnData.map(v => v.id));

      // Add verification user IDs
      verificationsData?.forEach(verification => {
        if (verification.assigned_to_security_team) {
          userIds.add(verification.assigned_to_security_team);
        }
      });

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(userIds));

      // Create profile map
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Group verifications by vulnerability
      const verificationsMap = new Map();
      verificationsData?.forEach(verification => {
        if (!verificationsMap.has(verification.vulnerability_id)) {
          verificationsMap.set(verification.vulnerability_id, []);
        }
        verificationsMap.get(verification.vulnerability_id).push({
          ...verification,
          assigned_to_security_team_profile: verification.assigned_to_security_team && profileMap.get(verification.assigned_to_security_team)
            ? [profileMap.get(verification.assigned_to_security_team)]
            : undefined,
        });
      });

      // Enrich vulnerabilities with profile and verification data
      const enrichedVulnerabilities = vulnData.map(vuln => ({
        ...vuln,
        submitted_by_profile: vuln.submitted_by && profileMap.get(vuln.submitted_by)
          ? [profileMap.get(vuln.submitted_by)]
          : [],
        approved_by_profile: vuln.approved_by && profileMap.get(vuln.approved_by)
          ? [profileMap.get(vuln.approved_by)]
          : [],
        assigned_to_client_profile: vuln.assigned_to_client && profileMap.get(vuln.assigned_to_client)
          ? [profileMap.get(vuln.assigned_to_client)]
          : [],
        verifications: verificationsMap.get(vuln.id) || [],
      }));

      setVulnerabilities(enrichedVulnerabilities);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      Critical: "bg-red-600 text-white",
      High: "bg-orange-600 text-white",
      Medium: "bg-yellow-600 text-white",
      Low: "bg-blue-600 text-white",
      Informational: "bg-gray-600 text-white",
    };
    return colors[severity] || "bg-gray-600 text-white";
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      open: "bg-blue-100 text-blue-800",
      reopened: "bg-orange-100 text-orange-800",
      closed: "bg-gray-100 text-gray-800",
      verified: "bg-green-100 text-green-800",
      assigned: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleViewDetails = (vuln: Vulnerability) => {
    setSelectedVulnId(vuln.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedVulnId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (vulnerabilities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No vulnerabilities found for this organization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <VulnerabilityDetailModal
        vulnerabilityId={selectedVulnId}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{vulnerabilities.length}</p>
              <p className="text-sm text-gray-600 mt-1">Total Vulnerabilities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {vulnerabilities.filter(v => v.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {vulnerabilities.filter(v => v.status === 'approved').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {vulnerabilities.filter(v => v.verifications && v.verifications.length > 0).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">With Verifications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {vulnerabilities.map((vuln) => (
        <Card key={vuln.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  {vuln.title}
                </CardTitle>
                {vuln.service_type && (
                  <p className="text-sm text-gray-600 mt-1">{vuln.service_type}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Badge className={getSeverityColor(vuln.severity)}>
                  {vuln.severity}
                </Badge>
                <Badge className={getStatusColor(vuln.status)}>
                  {vuln.status.charAt(0).toUpperCase() + vuln.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Submission Info */}
            <div className="grid md:grid-cols-2 gap-4 pb-4 border-b">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600">Submitted By</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vuln.submitted_by_profile?.[0]?.full_name || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600">Submitted On</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(vuln.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Approval Info */}
            {vuln.status === 'approved' && vuln.approved_at && (
              <div className="grid md:grid-cols-2 gap-4 pb-4 border-b">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-600">Approved By</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {vuln.approved_by_profile?.[0]?.full_name || "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-600">Approved On</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(vuln.approved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Client Assignment */}
            {vuln.assigned_to_client && (
              <div className="pb-4 border-b">
                <p className="text-xs font-semibold text-gray-700 mb-2">Client Assignment</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-blue-600 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600">Assigned To</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {vuln.assigned_to_client_profile?.[0]?.full_name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  {vuln.client_status && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Client Status</p>
                        <Badge className={getStatusColor(vuln.client_status)} variant="outline">
                          {vuln.client_status.charAt(0).toUpperCase() + vuln.client_status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {vuln.client_updated_at && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Last Updated</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(vuln.client_updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Info */}
            {vuln.verifications && vuln.verifications.length > 0 && (
              <div className="pb-4 border-b">
                <p className="text-xs font-semibold text-gray-700 mb-3">Verification Requests</p>
                <div className="space-y-3">
                  {vuln.verifications.map((verification, idx) => (
                    <div key={verification.id} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-600">Status</p>
                          <Badge className={getStatusColor(verification.verification_status)} variant="outline">
                            {verification.verification_status.charAt(0).toUpperCase() + 
                             verification.verification_status.slice(1)}
                          </Badge>
                        </div>
                        {verification.assigned_to_security_team_profile?.[0] && (
                          <div>
                            <p className="text-xs text-gray-600">Assigned To</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {verification.assigned_to_security_team_profile[0].full_name}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600">
                            {verification.verified_at ? "Verified On" : "Submitted On"}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(
                              verification.verified_at || verification.submitted_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleViewDetails(vuln)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Full Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
