"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Eye, Clock, CheckCircle, XCircle, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Verification {
  id: string;
  verification_status: string;
  created_at: string;
  vulnerabilities: {
    title: string;
    severity: string;
    organizations: {
      name: string;
    };
  };
  client_profile: {
    full_name: string | null;
  };
}

export default function AdminVerificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadVerifications();
  }, []);

  async function loadVerifications() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "Admin") {
      router.push("/dashboard/admin");
      return;
    }

    // Fetch all verifications
    const { data: verificationsData } = await supabase
      .from("verifications")
      .select(`
        id,
        verification_status,
        created_at,
        vulnerabilities!inner (
          title,
          severity,
          organizations!inner (
            name
          )
        ),
        client_profile:profiles!verifications_submitted_by_client_fkey (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    const transformedVerifications = (verificationsData || []).map((item: any) => ({
      ...item,
      vulnerabilities: {
        ...item.vulnerabilities,
        organizations: Array.isArray(item.vulnerabilities.organizations) 
          ? item.vulnerabilities.organizations[0] 
          : item.vulnerabilities.organizations
      },
      client_profile: Array.isArray(item.client_profile) ? item.client_profile[0] : item.client_profile
    }));

    setVerifications(transformedVerifications);
    setLoading(false);
  }

  // Filter verifications based on active tab
  const filteredVerifications = verifications.filter((v) => {
    if (activeTab === "pending") return v.verification_status === "pending";
    if (activeTab === "assigned") return v.verification_status === "assigned";
    if (activeTab === "verified") return v.verification_status === "verified";
    if (activeTab === "rejected") return v.verification_status === "rejected";
    return true;
  });

  // Calculate counts
  const pendingCount = verifications.filter((v) => v.verification_status === "pending").length;
  const assignedCount = verifications.filter((v) => v.verification_status === "assigned").length;
  const verifiedCount = verifications.filter((v) => v.verification_status === "verified").length;
  const rejectedCount = verifications.filter((v) => v.verification_status === "rejected").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verification Requests</h1>
          <p className="text-gray-600 mt-1">
            Assign verification requests to security team members
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assignedCount}</div>
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
      <Tabs defaultValue="pending" onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Requests</CardTitle>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned ({assignedCount})
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
            <TabsContent value="pending">
              <VerificationList 
                verifications={filteredVerifications} 
                emptyMessage="No pending verifications"
                showAssignButton={true}
              />
            </TabsContent>
            <TabsContent value="assigned">
              <VerificationList 
                verifications={filteredVerifications} 
                emptyMessage="No assigned verifications"
                showAssignButton={false}
              />
            </TabsContent>
            <TabsContent value="verified">
              <VerificationList 
                verifications={filteredVerifications} 
                emptyMessage="No verified requests"
                showAssignButton={false}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <VerificationList 
                verifications={filteredVerifications} 
                emptyMessage="No rejected requests"
                showAssignButton={false}
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
  verifications, 
  emptyMessage,
  showAssignButton 
}: { 
  verifications: Verification[]; 
  emptyMessage: string;
  showAssignButton: boolean;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "assigned": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-4 w-4" />;
      case "assigned": return <Shield className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (verifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {verifications.map((verif) => (
        <div 
          key={verif.id} 
          className={`border rounded-lg p-4 hover:border-purple-300 transition-colors ${
            verif.verification_status === "pending" ? "border-yellow-200 bg-yellow-50/30" : "border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {verif.vulnerabilities.title}
                </h3>
                <Badge className={getSeverityColor(verif.vulnerabilities.severity)}>
                  {verif.vulnerabilities.severity}
                </Badge>
                <Badge className={getStatusColor(verif.verification_status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(verif.verification_status)}
                    {verif.verification_status.charAt(0).toUpperCase() + verif.verification_status.slice(1)}
                  </span>
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {verif.vulnerabilities.organizations.name}
                </span>
                <span>
                  Submitted by: {verif.client_profile?.full_name || "Unknown"}
                </span>
                <span>
                  {new Date(verif.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Link href={`/dashboard/admin/verifications/${verif.id}`}>
              {showAssignButton ? (
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Eye className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              ) : (
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              )}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
