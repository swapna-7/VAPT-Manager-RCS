"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminControls({
  profileId,
  currentRole,
  currentStatus,
}: {
  profileId: string;
  currentRole?: string | null;
  currentStatus?: string | null;
}) {
  const [role, setRole] = useState(currentRole || "Client");
  const [status, setStatus] = useState(currentStatus || "pending");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRole = async (newRole: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", profileId);
      if (error) throw error;
      setRole(newRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profileId }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      // refresh UI (very simple) – we'll set status to approved
      setStatus("approved");
      console.log("approve response", json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select value={role} onChange={(e) => updateRole(e.target.value)} className="rounded border p-1 text-sm">
        <option>Super-admin</option>
        <option>Admin</option>
        <option>Security-team</option>
        <option>Client</option>
      </select>
      <button
        className="px-2 py-1 bg-gray-200 rounded text-sm"
        onClick={() => updateRole(role)}
        disabled={isLoading}
        type="button"
      >
        {isLoading ? "Saving..." : "Save Role"}
      </button>
      {status !== "approved" && (
        <button
          className="px-2 py-1 bg-green-500 text-white rounded text-sm"
          onClick={() => approveUser()}
          disabled={isLoading}
          type="button"
        >
          Approve
        </button>
      )}
      {status === "approved" && (
        <span className="text-sm text-green-600 font-medium">✓ Approved</span>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}
