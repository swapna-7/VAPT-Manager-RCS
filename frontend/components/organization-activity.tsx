"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UserPlus, Building2, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface OrganizationActivityProps {
  organizationId: string;
}

export default function OrganizationActivity({ organizationId }: OrganizationActivityProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const supabase = createClient();
      
      // Fetch activity logs related to this organization
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("target->>organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Also fetch notifications related to this organization
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("payload->>organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Combine and sort
      const allActivities = [
        ...(logs || []).map((log) => ({ ...log, type: "activity" })),
        ...(notifications || []).map((notif) => ({ ...notif, type: "notification" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities.slice(0, 10));
      setLoading(false);
    };

    fetchActivity();
  }, [organizationId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading activity...</p>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No activity recorded</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        let icon = <Clock className="h-4 w-4 text-blue-500" />;
        let message = "";

        if (activity.type === "notification") {
          if (activity.notification_type === "organization_signup") {
            icon = <Building2 className="h-4 w-4 text-blue-500" />;
            message = "Organization registered";
          } else if (activity.notification_type === "user_approved") {
            icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
            message = "User approved";
          }
        } else {
          message = activity.action || "Activity recorded";
        }

        return (
          <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
            {icon}
            <div className="flex-1">
              <p className="text-sm text-gray-900">{message}</p>
              <p className="text-xs text-gray-500">
                {formatDateTime(activity.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


