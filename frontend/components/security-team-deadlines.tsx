"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Loader2 } from "lucide-react";

interface DeadlineItem {
  type: 'organization' | 'verification';
  deadline: string;
  organizationName: string;
  services?: any;
  vulnerabilityTitle?: string;
  verificationStatus?: string;
}

export function SecurityTeamDeadlines({ userId }: { userId: string }) {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDeadlines();
  }, [userId]);

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      const allDeadlines: DeadlineItem[] = [];

      // Fetch organization deadlines
      const { data: assignedOrgs } = await supabase
        .from("security_team_organizations")
        .select(`
          deadline,
          services,
          organizations!inner (
            id,
            name
          )
        `)
        .eq("security_team_user_id", userId)
        .order("deadline", { ascending: true, nullsFirst: false });

      // Add organization deadlines
      if (assignedOrgs) {
        assignedOrgs.forEach((assignment: any) => {
          if (assignment.deadline) {
            const org = Array.isArray(assignment.organizations) 
              ? assignment.organizations[0] 
              : assignment.organizations;
            const services = assignment.services || {};
            
            allDeadlines.push({
              type: 'organization',
              deadline: assignment.deadline,
              organizationName: org?.name || "Unknown Organization",
              services: services,
            });
          }
        });
      }

      // Fetch verification deadlines - using client-side which respects user's session
      const { data: verifications } = await supabase
        .from("verifications")
        .select("id, verification_deadline, verification_status, vulnerability_id, submitted_by_client")
        .eq("assigned_to_security_team", userId)
        .not("verification_deadline", "is", null)
        .in("verification_status", ["assigned", "pending"])
        .order("verification_deadline", { ascending: true });

      console.log("Client-side verifications:", verifications);

      if (verifications && verifications.length > 0) {
        const vulnIds = verifications.map(v => v.vulnerability_id);
        
        // Fetch vulnerabilities with client-side auth
        const { data: vulnerabilities } = await supabase
          .from("vulnerabilities")
          .select("id, title, organization_id")
          .in("id", vulnIds);

        console.log("Client-side vulnerabilities:", vulnerabilities);

        // Fetch organizations
        const orgIds = vulnerabilities?.map(v => v.organization_id).filter(Boolean) || [];
        const { data: organizations } = orgIds.length > 0
          ? await supabase
              .from("organizations")
              .select("id, name")
              .in("id", orgIds)
          : { data: [] };

        console.log("Client-side organizations:", organizations);

        // Add verification deadlines
        verifications.forEach((verification: any) => {
          const vuln = vulnerabilities?.find(v => v.id === verification.vulnerability_id);
          const org = organizations?.find(o => o.id === vuln?.organization_id);
          
          allDeadlines.push({
            type: 'verification',
            deadline: verification.verification_deadline,
            organizationName: org?.name || "Unknown Organization",
            vulnerabilityTitle: vuln?.title || "Unknown Vulnerability",
            verificationStatus: verification.verification_status,
          });
        });
      }

      // Sort all deadlines by date
      allDeadlines.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      
      setDeadlines(allDeadlines);
    } catch (error) {
      console.error("Error loading deadlines:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Deadlines
          </CardTitle>
          <CardDescription>
            Project and verification deadlines
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-600" />
          Deadlines
        </CardTitle>
        <CardDescription>
          Project and verification deadlines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length > 0 ? (
          deadlines.map((item, index) => {
            const isOverdue = new Date(item.deadline) < new Date();
            
            return (
              <div 
                key={index} 
                className={`border-l-4 pl-4 py-2 ${
                  item.type === 'verification' 
                    ? 'border-blue-500' 
                    : 'border-purple-500'
                } ${isOverdue ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-semibold flex items-center gap-2 ${
                      isOverdue ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      <Calendar className={`h-4 w-4 ${
                        isOverdue ? 'text-red-600' : 'text-purple-600'
                      }`} />
                      {new Date(item.deadline).toLocaleDateString('en-GB')} - {new Date(item.deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {item.organizationName}
                    </p>
                    
                    {item.type === 'verification' ? (
                      <>
                        <p className="text-xs text-blue-700 mt-1 font-medium">
                          Verification: {item.vulnerabilityTitle}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1 bg-blue-50">
                          {item.verificationStatus === 'assigned' ? 'Assigned' : 'Pending'}
                        </Badge>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.services && Object.keys(item.services).map((serviceKey) => {
                          const serviceName = 
                            serviceKey === 'web' ? 'Web Application PT' :
                            serviceKey === 'android' ? 'Android Application PT' :
                            serviceKey === 'ios' ? 'iOS Application PT' : serviceKey;
                          
                          const tier = typeof item.services[serviceKey] === 'string' 
                            ? item.services[serviceKey]
                            : item.services[serviceKey]?.tier || 'N/A';
                          
                          return (
                            <Badge key={serviceKey} variant="outline" className="text-xs">
                              {serviceName} ({tier})
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div>
            <p className="text-gray-600">No deadlines set</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
