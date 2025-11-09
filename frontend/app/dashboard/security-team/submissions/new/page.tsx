"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
}

export default function NewSubmissionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    organization_id: "",
    title: "",
    description: "",
    severity: "Medium",
    cvss_score: "",
    affected_systems: "",
    remediation: ""
  });

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

      // Fetch assigned organizations
      const { data: assignments, error } = await supabase
        .from("security_team_organizations")
        .select(`
          organization_id,
          organizations!inner (
            id,
            name
          )
        `)
        .eq("security_team_user_id", user.id);

      if (!error && assignments) {
        const orgs = assignments.map((item: any) => ({
          id: item.organization_id,
          name: Array.isArray(item.organizations) ? item.organizations[0].name : item.organizations.name
        }));
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    // Validation
    if (!formData.organization_id) {
      alert("Please select an organization");
      return;
    }
    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!formData.affected_systems.trim()) {
      alert("Please enter affected systems");
      return;
    }
    if (!formData.remediation.trim()) {
      alert("Please enter remediation steps");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("vulnerabilities")
        .insert({
          organization_id: formData.organization_id,
          submitted_by: currentUser.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          severity: formData.severity,
          cvss_score: formData.cvss_score ? parseFloat(formData.cvss_score) : null,
          affected_systems: formData.affected_systems.trim(),
          remediation: formData.remediation.trim(),
          status: "pending"
        });

      if (error) {
        console.error("Error submitting vulnerability:", error);
        alert("Failed to submit vulnerability: " + error.message);
        return;
      }

      alert("Vulnerability submitted successfully!");
      router.push("/dashboard/security-team/submissions");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to submit vulnerability");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard/security-team/submissions"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">No Organizations Assigned</CardTitle>
            <CardDescription>
              You don't have any organizations assigned to you. Please contact an administrator.
            </CardDescription>
          </CardHeader>
        </Card>
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
        
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submit Vulnerability</h1>
            <p className="text-gray-600 mt-1">
              Report a new vulnerability for review
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Details</CardTitle>
            <CardDescription>
              Provide complete information about the vulnerability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Selection */}
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <select
                id="organization"
                value={formData.organization_id}
                onChange={(e) => handleChange("organization_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Vulnerability Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., SQL Injection in Login Form"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detailed description of the vulnerability, including how it was discovered and potential impact..."
                rows={6}
                required
              />
            </div>

            {/* Severity and CVSS Score */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <select
                  id="severity"
                  value={formData.severity}
                  onChange={(e) => handleChange("severity", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Informational">Informational</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvss_score">CVSS Score (0-10)</Label>
                <Input
                  id="cvss_score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.cvss_score}
                  onChange={(e) => handleChange("cvss_score", e.target.value)}
                  placeholder="e.g., 7.5"
                />
              </div>
            </div>

            {/* Affected Systems */}
            <div className="space-y-2">
              <Label htmlFor="affected_systems">Affected Systems *</Label>
              <Textarea
                id="affected_systems"
                value={formData.affected_systems}
                onChange={(e) => handleChange("affected_systems", e.target.value)}
                placeholder="List all affected systems, URLs, applications, or components..."
                rows={4}
                required
              />
            </div>

            {/* Remediation */}
            <div className="space-y-2">
              <Label htmlFor="remediation">Remediation Steps *</Label>
              <Textarea
                id="remediation"
                value={formData.remediation}
                onChange={(e) => handleChange("remediation", e.target.value)}
                placeholder="Provide detailed steps to fix or mitigate this vulnerability..."
                rows={6}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Vulnerability
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/security-team/submissions")}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
