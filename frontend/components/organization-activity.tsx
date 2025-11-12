"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UserPlus, Building2, Clock, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ReactNode } from "react";

interface OrganizationActivityProps {
  organizationId: string;
}

interface ActivityItem {
  id: string;
  created_at: string;
  type: string;
  icon: ReactNode;
  message: string;
  details?: string;
}

export default function OrganizationActivity({ organizationId }: OrganizationActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const supabase = createClient();
      
      // Fetch organization creation date
      const { data: organization } = await supabase
        .from("organizations")
        .select("name, created_at")
        .eq("id", organizationId)
        .single();

      // Fetch all users that belong to this organization
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

      // Get user emails
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

      const activityList: ActivityItem[] = [];

      // Add organization creation
      if (organization) {
        activityList.push({
          id: `org-created-${organizationId}`,
          created_at: organization.created_at,
          type: "organization_created",
          icon: <Building2 className="h-4 w-4 text-purple-600" />,
          message: "Organization Created",
          details: organization.name,
        });
      }

      // Add user onboarding events
      if (users) {
        users.forEach(user => {
          const email = emailMap.get(user.id);
          activityList.push({
            id: `user-onboard-${user.id}`,
            created_at: user.created_at,
            type: "user_onboarded",
            icon: <UserPlus className="h-4 w-4 text-green-600" />,
            message: "User Onboarded",
            details: `${user.full_name || "Unknown"}${email ? ` (${email})` : ""} - ${user.role}`,
          });
        });
      }

      // Sort by date (most recent first)
      activityList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(activityList);
      setLoading(false);
    };

    fetchActivity();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
          <div className="flex-shrink-0 mt-1">
            {activity.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{activity.message}</p>
                {activity.details && (
                  <p className="text-sm text-gray-700 mt-1">{activity.details}</p>
                )}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">When:</p>
                <p className="text-xs text-gray-600">
                  {formatDateTime(activity.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


