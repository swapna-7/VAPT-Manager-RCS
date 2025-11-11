"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Clock, CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface Verification {
  id: string;
  vulnerability_id: string;
  verification_status: string;
  created_at: string;
  assigned_at: string | null;
  verified_at: string | null;
  admin_comments: string | null;
  security_team_comments: string | null;
}

export default function SecurityTeamVerificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("assigned");

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
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

      if (!profile || profile.role !== "Security-team") {
        router.push("/dashboard");
        return;
      }

      // Fetch verifications assigned to this security team member
      const { data: verificationsData, error } = await supabase
        .from("verifications")
        .select(`
          *,
          vulnerabilities!inner (
            id,
            title,
            severity,
            description,
            organizations!inner (
              id,
              name
            ),
            client:profiles!vulnerabilities_assigned_to_client_fkey (
              full_name
            )
          )
        `)
        .eq("assigned_to_security_team", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching verifications:", error);
        return;
      }

      // Transform nested arrays to single objects
      const transformed = (verificationsData || []).map((v: any) => ({
        ...v,
        vulnerabilities: {
          ...v.vulnerabilities,
          organizations: Array.isArray(v.vulnerabilities.organizations) 
            ? v.vulnerabilities.organizations[0] 
            : v.vulnerabilities.organizations,
          client: Array.isArray(v.vulnerabilities.client)
            ? v.vulnerabilities.client[0]
            : v.vulnerabilities.client
        }
      }));

      setVerifications(transformed);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const assigned = verifications.filter((v: any) => v.verification_status === "assigned").length;
  const verified = verifications.filter((v: any) => v.verification_status === "verified").length;
  const rejected = verifications.filter((v: any) => v.verification_status === "rejected").length;

  // Filter based on active tab
  const filteredVerifications = verifications.filter((v: any) => {
    if (activeTab === "assigned") return v.verification_status === "assigned";
    if (activeTab === "verified") return v.verification_status === "verified";
    if (activeTab === "rejected") return v.verification_status === "rejected";
    return true;
  });

  // Sort: most recent first
  const sortedVerifications = [...filteredVerifications].sort((a: any, b: any) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Verifications</h1>
        </div>
        <p className="text-gray-600">
          Verify closed vulnerabilities assigned to you by the admin
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assigned}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verified}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
            <p className="text-xs text-gray-600 mt-1">Verification rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List with Tabs */}
      <Tabs defaultValue="assigned" onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Requests
              </CardTitle>
              <TabsList>
                <TabsTrigger value="assigned">
                  Assigned to Me ({assigned})
                </TabsTrigger>
                <TabsTrigger value="verified">
                  Verified ({verified})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejected})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="assigned">
              {sortedVerifications.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No verifications assigned to you yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedVerifications.map((verification: any) => (
                    <VerificationCard key={verification.id} verification={verification} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verified">
              {sortedVerifications.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No verified verifications yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedVerifications.map((verification: any) => (
                    <VerificationCard key={verification.id} verification={verification} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {sortedVerifications.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No rejected verifications.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedVerifications.map((verification: any) => (
                    <VerificationCard key={verification.id} verification={verification} />
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Verification Card Component
function VerificationCard({ verification }: { verification: any }) {
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

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {verification.vulnerabilities.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {verification.vulnerabilities.organizations.name}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className={getSeverityColor(verification.vulnerabilities.severity)}>
              {verification.vulnerabilities.severity}
            </Badge>
            <Badge className={getStatusColor(verification.verification_status)}>
              {verification.verification_status.charAt(0).toUpperCase() + verification.verification_status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm text-gray-600 mb-2">
            Assigned: {new Date(verification.assigned_at || verification.created_at).toLocaleDateString()}
          </p>
          {verification.verification_status === "assigned" ? (
            <Link href={`/dashboard/security-team/verifications/${verification.id}`}>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Shield className="h-4 w-4 mr-2" />
                Review
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/security-team/verifications/${verification.id}`}>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </Link>
          )}
        </div>
      </div>

      {verification.admin_comments && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1">Admin Comments:</p>
          <p className="text-sm text-gray-700">{verification.admin_comments}</p>
        </div>
      )}
    </div>
  );
}
