"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, X, Ban, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  status: string;
  suspended: boolean;
  created_at: string;
  organization_id: string | null;
  organizations?: {
    id: string;
    name: string;
  }[] | null;
}

interface UserManagementTableProps {
  profiles: Profile[];
}

export default function UserManagementTable({ profiles: initialProfiles }: UserManagementTableProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [filteredProfiles, setFilteredProfiles] = useState(initialProfiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [fetchingData, setFetchingData] = useState(false);

  // Client-side fallback: fetch profiles if initialProfiles is empty
  useEffect(() => {
    if (initialProfiles.length === 0 && !fetchingData) {
      setFetchingData(true);
      const fetchProfiles = async () => {
        try {
          const supabase = createClient();
          let { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, role, status, suspended, created_at, organization_id")
            .order("created_at", { ascending: false });
          
          // If suspended column doesn't exist, fetch without it
          if (error && error.message?.includes("suspended")) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from("profiles")
              .select("id, full_name, role, status, created_at, organization_id")
              .order("created_at", { ascending: false });
            
            if (!fallbackError && fallbackData) {
              // Add suspended: false to all profiles
              data = fallbackData.map(p => ({ ...p, suspended: false }));
              error = null;
            }
          }
          
          if (error) {
            console.error("Client-side fetch error:", error);
          } else if (data && data.length > 0) {
            // Fetch organizations separately
            const orgIds = data
              .filter(p => p.organization_id)
              .map(p => p.organization_id);
            
            if (orgIds.length > 0) {
              const { data: organizations } = await supabase
                .from("organizations")
                .select("id, name")
                .in("id", orgIds);
              
              if (organizations) {
                // Create a map for quick lookup
                const orgMap = new Map(organizations.map(org => [org.id, org]));
                
                // Attach organization data to profiles
                data = data.map(profile => ({
                  ...profile,
                  organizations: profile.organization_id && orgMap.has(profile.organization_id)
                    ? [orgMap.get(profile.organization_id)!]
                    : null
                }));
              }
            }
            
            setProfiles(data);
            setFilteredProfiles(data);
          }
        } catch (e) {
          console.error("Failed to fetch profiles client-side:", e);
        } finally {
          setFetchingData(false);
        }
      };
      fetchProfiles();
    }
  }, [initialProfiles.length, fetchingData]);

  // Fetch user emails
  useEffect(() => {
    const fetchEmails = async () => {
      const supabase = createClient();
      const emails: Record<string, string> = {};
      
      for (const profile of profiles) {
        try {
          // Get email from auth.users via admin API or direct query if possible
          // For now, we'll use a workaround - store email in profile or fetch via API
          const { data: { user } } = await supabase.auth.admin?.getUserById(profile.id).catch(() => ({ data: { user: null } }));
          // Since we can't access admin API from client, we'll need to create an API route
          // For now, let's fetch via API endpoint
        } catch (e) {
          // Ignore
        }
      }
      
      // Fetch emails via API
      try {
        const response = await fetch("/api/admin/user-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_ids: profiles.map((p) => p.id) }),
        });
        const data = await response.json();
        if (data.emails) {
          setUserEmails(data.emails);
        }
      } catch (e) {
        console.error("Failed to fetch emails", e);
      }
    };

    fetchEmails();
  }, [profiles]);

  // Filter profiles
  useEffect(() => {
    let filtered = profiles;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userEmails[p.id]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          false
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "suspended") {
        filtered = filtered.filter((p) => p.suspended);
      } else {
        filtered = filtered.filter((p) => p.status === statusFilter && !p.suspended);
      }
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((p) => p.role === roleFilter);
    }

    setFilteredProfiles(filtered);
  }, [searchTerm, statusFilter, roleFilter, profiles, userEmails]);

  const handleApprove = async (userId: string) => {
    setLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: "approved" } : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve user");
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, suspended: suspend }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, suspended: suspend } : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Super-admin":
        return "bg-purple-100 text-purple-800";
      case "Admin":
        return "bg-blue-100 text-blue-800";
      case "Security-team":
        return "bg-indigo-100 text-indigo-800";
      case "Client":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string, suspended: boolean) => {
    if (suspended) return "bg-red-100 text-red-800";
    if (status === "approved") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getUserType = (role: string) => {
    return ["Super-admin", "Admin", "Security-team"].includes(role) ? "Staff" : "Client";
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Roles</option>
          <option value="Super-admin">Super-admin</option>
          <option value="Admin">Admin</option>
          <option value="Security-team">Security-team</option>
          <option value="Client">Client</option>
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                USER
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TYPE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ROLE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CREATED
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-medium text-sm">
                          {profile.full_name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {profile.full_name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userEmails[profile.id] || "Loading..."}
                        </div>
                        {profile.role === "Client" && profile.organizations && profile.organizations.length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {profile.organizations[0].name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getUserType(profile.role)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getRoleBadgeColor(profile.role)}>
                      {profile.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusBadgeColor(profile.status, profile.suspended)}>
                      {profile.suspended ? "SUSPENDED" : profile.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {profile.status === "pending" && !profile.suspended && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(profile.id)}
                          disabled={loading[profile.id]}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {!profile.suspended ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSuspend(profile.id, true)}
                          disabled={loading[profile.id]}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleSuspend(profile.id, false)}
                          disabled={loading[profile.id]}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Unsuspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


