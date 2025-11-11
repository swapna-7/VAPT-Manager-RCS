import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Admin endpoint to approve a user
 * For existing users: set profiles.status = 'approved'
 * For pending requests: create auth account, profile, and update user_access_requests
 * Request JSON: { user_id?: string, request_id?: string, approver_id?: string }
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, request_id, approver_id = null } = body as any;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" }, { status: 500 });
    }

    const supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Case 1: Approving a user_access_request (create new account)
    if (request_id) {
      // Fetch the access request
      const { data: accessRequest, error: fetchError } = await supabase
        .from("user_access_requests")
        .select("*")
        .eq("id", request_id)
        .single();

      if (fetchError || !accessRequest) {
        return NextResponse.json({ error: "Access request not found" }, { status: 404 });
      }

      // Check if access request is already approved
      if (accessRequest.status === "approved") {
        // Check if user already exists
        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const existingUser = existingAuth?.users?.find(u => u.email === accessRequest.email);
        
        if (existingUser) {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", existingUser.id)
            .single();
          
          if (existingProfile) {
            return NextResponse.json({ 
              ok: true, 
              user_id: existingUser.id,
              message: "User already approved and exists" 
            });
          }
        }
      }

      let authUserId: string | null = null;

      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: accessRequest.email,
          email_confirm: true,
          user_metadata: {
            full_name: accessRequest.full_name,
            role: accessRequest.role,
          },
        });

        if (authError || !authData.user) {
          throw new Error(`Failed to create auth user: ${authError?.message}`);
        }

        authUserId = authData.user.id;

        // Create profile with explicit error handling
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          full_name: accessRequest.full_name,
          role: accessRequest.role,
          status: "approved",
          organization_id: accessRequest.organization_id,
          suspended: false,
        });

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        // Verify profile was actually created
        const { data: verifyProfile, error: verifyError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authData.user.id)
          .single();

        if (verifyError || !verifyProfile) {
          throw new Error(`Profile verification failed: ${verifyError?.message || "Profile not found after insert"}`);
        }

        // Update access request status
        const { error: updateRequestError } = await supabase
          .from("user_access_requests")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", request_id);

        if (updateRequestError) {
          console.error("Failed to update access request:", updateRequestError);
          // Don't fail the whole operation, but log it
        } else {
          console.log(`Successfully updated user_access_request ${request_id} to approved`);
        }

        // Create notification
        const { error: notifError } = await supabase.from("notifications").insert([
          {
            type: "approval",
            actor_id: approver_id,
            payload: { user_id: authData.user.id, email: accessRequest.email },
          },
        ]);
        if (notifError) console.error("notify error", notifError.message);

        return NextResponse.json({ ok: true, user_id: authData.user.id });

      } catch (error) {
        // CRITICAL: Rollback on any failure
        if (authUserId) {
          console.error("Rolling back - deleting auth user:", authUserId);
          const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);
          if (deleteError) {
            console.error("CRITICAL: Failed to rollback auth user:", deleteError);
          }
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("User approval failed:", errorMessage);
        return NextResponse.json({ 
          error: `User approval failed: ${errorMessage}`,
          details: "The operation was rolled back. Please try again or contact support."
        }, { status: 500 });
      }
    }

    // Case 2: Approving an existing user (just update status)
    if (user_id) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", user_id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      // insert notification for approval
      const { error: notifError } = await supabase.from("notifications").insert([
        {
          type: "approval",
          actor_id: approver_id,
          payload: { user_id },
        },
      ]);
      if (notifError) console.error("notify error", notifError.message);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Either user_id or request_id is required" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
