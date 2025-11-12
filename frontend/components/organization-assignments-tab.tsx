"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Assignment {
  id: string;
  services: any;
  deadline: string | null;
  assigned_at: string;
  assigned_by: string | null;
  security_team_user: Array<{
    full_name: string;
    email?: string;
  }>;
  assigned_by_profile?: Array<{
    full_name: string;
  }>;
}

interface OrganizationAssignmentsTabProps {
  organizationId: string;
}

export default function OrganizationAssignmentsTab({ organizationId }: OrganizationAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadAssignments();
  }, [organizationId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);

      // First, get the assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("security_team_organizations")
        .select("id, services, deadline, assigned_at, assigned_by, security_team_user_id")
        .eq("organization_id", organizationId)
        .order("assigned_at", { ascending: false });

      if (assignmentsError) {
        console.error("Error loading assignments:", assignmentsError);
        return;
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      // Get unique user IDs
      const userIds = new Set<string>();
      assignmentsData.forEach(assignment => {
        userIds.add(assignment.security_team_user_id);
        if (assignment.assigned_by) {
          userIds.add(assignment.assigned_by);
        }
      });

      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(userIds));

      // Create a map of user ID to profile
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Combine the data
      const enrichedAssignments = assignmentsData.map(assignment => ({
        id: assignment.id,
        services: assignment.services,
        deadline: assignment.deadline,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        security_team_user: profileMap.get(assignment.security_team_user_id) 
          ? [profileMap.get(assignment.security_team_user_id)]
          : [],
        assigned_by_profile: assignment.assigned_by && profileMap.get(assignment.assigned_by)
          ? [profileMap.get(assignment.assigned_by)]
          : undefined,
      }));

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceNames = (services: any): string[] => {
    if (!services || typeof services !== 'object') return [];
    return Object.keys(services).filter(key => services[key]);
  };

  const isOngoing = (deadline: string | null): boolean => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
  };

  const getStatusBadge = (deadline: string | null) => {
    if (!deadline) {
      return <Badge className="bg-blue-100 text-blue-800">Ongoing</Badge>;
    }

    const isPastDeadline = new Date(deadline) < new Date();
    if (isPastDeadline) {
      return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
    }

    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No assignments found for this organization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const serviceNames = getServiceNames(assignment.services);
        const status = isOngoing(assignment.deadline);

        return (
          <Card key={assignment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    {assignment.security_team_user?.[0]?.full_name || "Unknown User"}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Security Team Member
                  </p>
                </div>
                {getStatusBadge(assignment.deadline)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Services */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Assigned Services</p>
                <div className="flex flex-wrap gap-2">
                  {serviceNames.length > 0 ? (
                    serviceNames.map((service) => (
                      <Badge key={service} variant="outline" className="text-sm">
                        {service === 'web' ? 'Web Application PT' :
                         service === 'android' ? 'Android Application PT' :
                         service === 'ios' ? 'iOS Application PT' : service}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-sm">All Services</Badge>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Assigned On</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(assignment.assigned_at).toLocaleDateString()} at{" "}
                      {new Date(assignment.assigned_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {assignment.deadline && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Deadline</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(assignment.deadline).toLocaleDateString()} at{" "}
                        {new Date(assignment.deadline).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned By */}
              {assignment.assigned_by_profile && assignment.assigned_by_profile.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Assigned By</p>
                  <p className="font-semibold text-gray-900">
                    {assignment.assigned_by_profile[0].full_name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
