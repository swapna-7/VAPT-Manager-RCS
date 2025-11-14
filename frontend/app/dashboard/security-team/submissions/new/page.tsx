"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ArrowLeft, Loader2, Send, Plus, X } from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  services: string[]; // Available services for this organization
}

interface AssignedService {
  organization_id: string;
  service: string;
}

export default function NewSubmissionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pocLinks, setPocLinks] = useState<string[]>([""]);

  const [formData, setFormData] = useState({
    organization_id: "",
    service_type: "",
    title: "",
    description: "",
    instances: "",
    remediation: "",
    cwe_id: "",
    severity: "Medium",
    cvss_score: "",
    affected_systems: "",
    security_team_comments: ""
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

      // Fetch assigned organizations with their services
      const { data: assignments, error } = await supabase
        .from("security_team_organizations")
        .select(`
          organization_id,
          services,
          organizations!inner (
            id,
            name
          )
        `)
        .eq("security_team_user_id", user.id);

      if (!error && assignments) {
        // Group services by organization
        const orgMap = new Map<string, { id: string; name: string; services: string[] }>();
        
        assignments.forEach((item: any) => {
          const orgId = item.organization_id;
          const orgName = Array.isArray(item.organizations) ? item.organizations[0].name : item.organizations.name;
          
          if (!orgMap.has(orgId)) {
            orgMap.set(orgId, {
              id: orgId,
              name: orgName,
              services: []
            });
          }
          
          // Extract service types from the services JSONB
          if (item.services) {
            const serviceKeys = Object.keys(item.services);
            serviceKeys.forEach(key => {
              const org = orgMap.get(orgId)!;
              const serviceLabel = key === 'web' ? 'Web Application PT' :
                                  key === 'android' ? 'Android Application PT' :
                                  key === 'ios' ? 'iOS Application PT' : key;
              if (!org.services.includes(serviceLabel)) {
                org.services.push(serviceLabel);
              }
            });
          }
        });
        
        const orgs = Array.from(orgMap.values());
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPocLink = () => {
    setPocLinks([...pocLinks, ""]);
  };

  const removePocLink = (index: number) => {
    if (pocLinks.length > 1) {
      setPocLinks(pocLinks.filter((_, i) => i !== index));
    }
  };

  const updatePocLink = (index: number, value: string) => {
    const newLinks = [...pocLinks];
    newLinks[index] = value;
    setPocLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    // Validation
    if (!formData.organization_id) {
      alert("Please select an organization");
      return;
    }
    if (!formData.service_type) {
      alert("Please select a service type");
      return;
    }
    if (!formData.title.trim()) {
      alert("Please enter a finding/title");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }
    // Validate POC links
    const validPocLinks = pocLinks.filter(link => link.trim() !== "");
    if (validPocLinks.length === 0) {
      alert("Please enter at least one POC link");
      return;
    }
    if (!formData.instances.trim()) {
      alert("Please enter instances");
      return;
    }
    if (!formData.remediation.trim()) {
      alert("Please enter countermeasures/remediation");
      return;
    }
    if (!formData.cwe_id.trim()) {
      alert("Please enter CWE ID");
      return;
    }

    try {
      setSubmitting(true);

      // Filter out empty POC links and join them with newline
      const validPocLinks = pocLinks.filter(link => link.trim() !== "");
      const pocText = validPocLinks.join("\n");

      const { error } = await supabase
        .from("vulnerabilities")
        .insert({
          organization_id: formData.organization_id,
          submitted_by: currentUser.id,
          service_type: formData.service_type,
          title: formData.title.trim(),
          description: formData.description.trim(),
          poc: pocText,
          instances: formData.instances.trim(),
          severity: formData.severity,
          cvss_score: formData.cvss_score ? parseFloat(formData.cvss_score) : null,
          cwe_id: formData.cwe_id.trim(),
          affected_systems: formData.affected_systems.trim() || "N/A",
          remediation: formData.remediation.trim(),
          security_team_comments: formData.security_team_comments.trim() || null,
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
    
    // Update available services when organization changes
    if (field === "organization_id") {
      const selectedOrg = organizations.find(org => org.id === value);
      if (selectedOrg) {
        setAvailableServices(selectedOrg.services);
        setFormData(prev => ({ ...prev, service_type: "" })); // Reset service selection
      } else {
        setAvailableServices([]);
      }
    }
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
                className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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

            {/* Service Type Selection */}
            {formData.organization_id && (
              <div className="space-y-2">
                <Label htmlFor="service_type">Service Type *</Label>
                <select
                  id="service_type"
                  value={formData.service_type}
                  onChange={(e) => handleChange("service_type", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select a service...</option>
                  {availableServices.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500">
                  Select which service this vulnerability relates to
                </p>
              </div>
            )}

            {/* Title / Finding */}
            <div className="space-y-2">
              <Label htmlFor="title">Finding Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Clickjacking"
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
                placeholder="Detailed technical description of the vulnerability"
                rows={6}
                required
              />
            </div>

            {/* Proof of Concept (POC) */}
            <div className="space-y-2">
              <Label htmlFor="poc">Proof of Concept (POC) Links *</Label>
              <div className="space-y-3">
                {pocLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      id={`poc-${index}`}
                      type="url"
                      value={link}
                      onChange={(e) => updatePocLink(index, e.target.value)}
                      placeholder="https://example.com/poc-link"
                      className="flex-1"
                    />
                    {pocLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePocLink(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPocLink}
                  className="w-full border-dashed border-gray-500 hover:border-gray-400"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <p className="text-sm ">Add Another POC Link</p>
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Add one or more links to POC demonstrations (screenshots, videos, or documentation)
              </p>
            </div>

            {/* Instances */}
            <div className="space-y-2">
              <Label htmlFor="instances">Instances *</Label>
              <Textarea
                id="instances"
                value={formData.instances}
                onChange={(e) => handleChange("instances", e.target.value)}
                placeholder="List all instances where this vulnerability was found&#10;Example:&#10;- https://example.com/admin/dashboard&#10;- https://example.com/user/profile&#10;- Mobile app settings page"
                rows={6}
                required
              />
              <p className="text-sm text-gray-500">
                Provide URLs, page names, or locations where this vulnerability exists
              </p>
            </div>

            {/* Severity and CWE ID */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <select
                  id="severity"
                  value={formData.severity}
                  onChange={(e) => handleChange("severity", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <Label htmlFor="cwe_id">CWE ID *</Label>
                <Input
                  id="cwe_id"
                  value={formData.cwe_id}
                  onChange={(e) => handleChange("cwe_id", e.target.value)}
                  placeholder="e.g., CWE-1021"
                  required
                />
              </div>
            </div>

            {/* CVSS Score */}
            <div className="space-y-2">
              <Label htmlFor="cvss_score">CVSS Score (CVSS v3.1)</Label>
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

            {/* Affected Systems */}
            <div className="space-y-2">
              <Label htmlFor="affected_systems">Affected Systems</Label>
              <Textarea
                id="affected_systems"
                value={formData.affected_systems}
                onChange={(e) => handleChange("affected_systems", e.target.value)}
                placeholder="List all affected systems, URLs, applications, or components..."
                rows={4}
              />
            </div>

            {/* Countermeasures / Remediation */}
            <div className="space-y-2">
              <Label htmlFor="remediation">Countermeasures / Remediation *</Label>
              <Textarea
                id="remediation"
                value={formData.remediation}
                onChange={(e) => handleChange("remediation", e.target.value)}
                placeholder="Recommended security measures and remediation steps"
                rows={6}
                required
              />
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="security_team_comments">Comments</Label>
              <Textarea
                id="security_team_comments"
                value={formData.security_team_comments}
                onChange={(e) => handleChange("security_team_comments", e.target.value)}
                placeholder="Additional comments or notes"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Comments are visible to Admin, Security Team, and Client
              </p>
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
