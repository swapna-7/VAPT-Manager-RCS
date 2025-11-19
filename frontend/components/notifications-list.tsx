"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UserPlus, Building2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { FileDown } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  payload: any;
  read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  initialNotifications: Notification[];
}

export default function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("unread");
  const router = useRouter();

  const handleApproveEmailAccess = async (notificationId: string) => {
    setApproving((prev) => ({ ...prev, [notificationId]: true }));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const res = await fetch("/api/admin/approve-email-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          approver_id: user?.id,
        }),
      });

      const json = await res.json();
      if (json.error) {
        alert(`Error: ${json.error}`);
        return;
      }

      // Mark notification as read and update UI
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );

      alert(`Successfully created ${json.created} user account(s).${json.errors ? `\nErrors: ${json.errors.join(", ")}` : ""}`);
      
      // Refresh the page to show updated notifications
      router.refresh();
    } catch (err) {
      alert(`Failed to approve: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setApproving((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select();

    if (error) {
      console.error("Error marking notification as read:", error);
      alert("Failed to mark notification as read. Please check console for details.");
      return;
    }

    console.log("Notification marked as read:", data);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    
    if (unreadIds.length > 0) {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)
        .select();

      if (error) {
        console.error("Error marking all notifications as read:", error);
        alert("Failed to mark all notifications as read. Please check console for details.");
        return;
      }

      console.log("All notifications marked as read:", data);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "organization_signup":
        return <Building2 className="h-5 w-5 text-blue-500" />;
      case "email_access_request":
        return <UserPlus className="h-5 w-5 text-purple-500" />;
      case "approval":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const payload = notification.payload || {};
    switch (notification.type) {
      case "user_signup":
        return `${payload.full_name || payload.email || "A user"} (${payload.role || "Client"}) has registered and is pending approval`;
      case "organization_signup":
        return `New organization "${payload.name}" has been registered and is pending approval`;
      case "email_access_request":
        const userCount = Array.isArray(payload.users) 
          ? payload.users.length 
          : (Array.isArray(payload.emails) ? payload.emails.length : 0);
        return `${userCount} user${userCount !== 1 ? "s" : ""} requested for access to organization (pending approval)`;
      case "approval":
        return `User ${payload.user_id ? "has been approved" : "approval processed"}`;
      default:
        return notification.type;
    }
  };

  if (notifications.length === 0) {
    return <p className="text-sm text-gray-500">No notifications</p>;
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "read") return n.read;
    return true;
  });

  // Calculate counts
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  return (
    <Tabs defaultValue="unread" onValueChange={setActiveTab} className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readCount})
          </TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </div>

      <TabsContent value="unread" className="mt-0">
        {filteredNotifications.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No unread notifications</p>
        ) : (
          <NotificationItems 
            notifications={filteredNotifications}
            approving={approving}
            handleApproveEmailAccess={handleApproveEmailAccess}
            markAsRead={markAsRead}
            getNotificationIcon={getNotificationIcon}
            getNotificationMessage={getNotificationMessage}
          />
        )}
      </TabsContent>

      <TabsContent value="read" className="mt-0">
        {filteredNotifications.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No read notifications</p>
        ) : (
          <NotificationItems 
            notifications={filteredNotifications}
            approving={approving}
            handleApproveEmailAccess={handleApproveEmailAccess}
            markAsRead={markAsRead}
            getNotificationIcon={getNotificationIcon}
            getNotificationMessage={getNotificationMessage}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

// Separate component for rendering notification items
function NotificationItems({
  notifications,
  approving,
  handleApproveEmailAccess,
  markAsRead,
  getNotificationIcon,
  getNotificationMessage
}: {
  notifications: Notification[];
  approving: Record<string, boolean>;
  handleApproveEmailAccess: (id: string) => void;
  markAsRead: (id: string) => void;
  getNotificationIcon: (type: string) => React.ReactNode;
  getNotificationMessage: (notification: Notification) => string;
}) {
  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const payload = notification.payload || {};
        const isEmailAccessRequest = notification.type === "email_access_request" && !notification.read;
        
        return (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg ${
              !notification.read ? "bg-purple-50 border-purple-200" : "bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <p className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                  {getNotificationMessage(notification)}
                </p>
                {isEmailAccessRequest && (
                  <div className="mt-2 p-3 bg-white rounded border text-xs space-y-3">
                    {Array.isArray(payload.users) ? (
                      <>
                        <div>
                          <p className="font-medium mb-1.5 text-gray-900">Users requesting access:</p>
                          <ul className="space-y-2">
                            {payload.users.map((user: { name: string; email: string; role?: string }, idx: number) => (
                              <li key={idx} className="text-gray-700 flex flex-col gap-0.5 pl-3 border-l-2 border-blue-200">
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-gray-600">{user.email}</div>
                                {user.role && (
                                  <div className="text-gray-500 italic">Role: {user.role}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : Array.isArray(payload.emails) ? (
                      <>
                        <div>
                          <p className="font-medium mb-1.5 text-gray-900">Emails:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {payload.emails.map((email: string, idx: number) => (
                              <li key={idx} className="text-gray-700">{email}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : null}
                    
                    {/* Service Details */}
                    {payload.services && typeof payload.services === 'object' && (
                      <div className="border-t pt-3">
                        <p className="font-medium mb-2 text-gray-900">Requested Services:</p>
                        
                        {/* Web Application PT */}
                        {payload.services.web && typeof payload.services.web === 'object' && (
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="font-semibold text-blue-900 mb-1">
                              Web Application PT - {typeof payload.services.web.tier === 'string' ? payload.services.web.tier : 'N/A'}
                            </div>
                            {payload.services.web.details && typeof payload.services.web.details === 'object' && (
                              <div className="space-y-1.5 mt-2 text-gray-700">
                                {payload.services.web.details.scopeUrl && (
                                  <div>
                                    <span className="font-medium">Scope URL:</span>{" "}
                                    <span className="text-blue-600">{payload.services.web.details.scopeUrl}</span>
                                  </div>
                                )}
                                {payload.services.web.details.userMatrix && (
                                  <div>
                                    <span className="font-medium">User Matrix File:</span>
                                    <a 
                                      href={payload.services.web.details.userMatrix} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.web.details.userMatrix.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                                {payload.services.web.details.credentials && (
                                  <div>
                                    <span className="font-medium">Credentials File:</span>
                                    <a 
                                      href={payload.services.web.details.credentials} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.web.details.credentials.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Android Application PT */}
                        {payload.services.android && typeof payload.services.android === 'object' && (
                          <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                            <div className="font-semibold text-green-900 mb-1">
                              Android Application PT - {typeof payload.services.android.tier === 'string' ? payload.services.android.tier : 'N/A'}
                            </div>
                            {payload.services.android.details && typeof payload.services.android.details === 'object' && (
                              <div className="space-y-1.5 mt-2 text-gray-700">
                                {payload.services.android.details.sslPinnedApk && (
                                  <div>
                                    <span className="font-medium">SSL Pinned APK:</span>{" "}
                                    <span className="text-blue-600 break-all">{payload.services.android.details.sslPinnedApk}</span>
                                  </div>
                                )}
                                {payload.services.android.details.sslUnpinnedApk && (
                                  <div>
                                    <span className="font-medium">SSL Unpinned APK:</span>{" "}
                                    <span className="text-blue-600 break-all">{payload.services.android.details.sslUnpinnedApk}</span>
                                  </div>
                                )}
                                {payload.services.android.details.userMatrix && (
                                  <div>
                                    <span className="font-medium">User Matrix File:</span>
                                    <a 
                                      href={payload.services.android.details.userMatrix} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.android.details.userMatrix.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                                {payload.services.android.details.credentials && (
                                  <div>
                                    <span className="font-medium">Credentials File:</span>
                                    <a 
                                      href={payload.services.android.details.credentials} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.android.details.credentials.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* iOS Application PT */}
                        {payload.services.ios && typeof payload.services.ios === 'object' && (
                          <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                            <div className="font-semibold text-purple-900 mb-1">
                              iOS Application PT - {typeof payload.services.ios.tier === 'string' ? payload.services.ios.tier : 'N/A'}
                            </div>
                            {payload.services.ios.details && typeof payload.services.ios.details === 'object' && (
                              <div className="space-y-1.5 mt-2 text-gray-700">
                                {payload.services.ios.details.testflightPinned && (
                                  <div>
                                    <span className="font-medium">TestFlight (Pinned):</span>{" "}
                                    <span className="text-blue-600 break-all">{payload.services.ios.details.testflightPinned}</span>
                                  </div>
                                )}
                                {payload.services.ios.details.testflightUnpinned && (
                                  <div>
                                    <span className="font-medium">TestFlight (Unpinned):</span>{" "}
                                    <span className="text-blue-600 break-all">{payload.services.ios.details.testflightUnpinned}</span>
                                  </div>
                                )}
                                {payload.services.ios.details.ipaFile && (
                                  <div>
                                    <span className="font-medium">IPA File:</span>{" "}
                                    <span className="text-blue-600 break-all">{payload.services.ios.details.ipaFile}</span>
                                  </div>
                                )}
                                {payload.services.ios.details.userMatrix && (
                                  <div>
                                    <span className="font-medium">User Matrix File:</span>
                                    <a 
                                      href={payload.services.ios.details.userMatrix} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.ios.details.userMatrix.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                                {payload.services.ios.details.credentials && (
                                  <div>
                                    <span className="font-medium">Credentials File:</span>
                                    <a 
                                      href={payload.services.ios.details.credentials} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                      <FileDown className="h-4 w-4 flex-shrink-0" />
                                      {payload.services.ios.details.credentials.split('/').pop() || 'Download'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateTime(notification.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEmailAccessRequest && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveEmailAccess(notification.id)}
                    disabled={approving[notification.id]}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approving[notification.id] ? "Approving..." : "Approve"}
                  </Button>
                )}
                {!notification.read && !isEmailAccessRequest && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


