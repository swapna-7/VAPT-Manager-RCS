import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Admin endpoint to approve email access requests and create user accounts
 * Request JSON: { notification_id: string, approver_id?: string }
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { notification_id, approver_id = null } = body as any;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" },
        { status: 500 }
      );
    }
    if (!notification_id) {
      return NextResponse.json({ error: "notification_id required" }, { status: 400 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch the notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .eq("type", "email_access_request")
      .single();

    if (notifError || !notification) {
      return NextResponse.json({ error: "Notification not found or invalid type" }, { status: 404 });
    }

    const payload = notification.payload as any;
    const { organization_id, users, emails, password } = payload;

    // Support both old format (emails array) and new format (users array with name and email)
    const userList = users && Array.isArray(users) 
      ? users 
      : emails && Array.isArray(emails)
      ? emails.map((email: string) => ({ name: email.split('@')[0], email, role: 'Client' }))
      : [];

    if (!organization_id || userList.length === 0 || !password) {
      return NextResponse.json(
        { error: "Invalid notification payload: missing organization_id, users/emails, or password" },
        { status: 400 }
      );
    }

    console.log("Processing user list:", JSON.stringify(userList, null, 2));

    // Create user accounts for each user
    const createdUsers: string[] = [];
    const errors: string[] = [];

    for (const user of userList) {
      const email = typeof user === 'string' ? user : (user.email || '');
      const fullName = typeof user === 'string' 
        ? email.split('@')[0] 
        : (user.name || user.full_name || email.split('@')[0]);
      // Custom designation from sign-up (e.g., "Web Dev", "Manager", etc.)
      const userDesignation = typeof user === 'string' ? null : (user.role || null);
      // System role is always "Client" for organization users
      const systemRole = 'Client';
      
      console.log(`Creating user: email=${email}, fullName=${fullName}, role=${systemRole}, designation=${userDesignation}`);
      
      let authUserId: string | null = null;
      
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.trim(),
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName.trim(),
            role: systemRole,
          },
        });

        if (authError) {
          throw new Error(`Auth creation failed: ${authError.message}`);
        }

        if (!authData.user?.id) {
          throw new Error('Failed to create user - no user ID returned');
        }

        authUserId = authData.user.id;
        console.log(`✅ Auth user created: userId=${authUserId}`);

        // Create profile explicitly (don't rely on triggers)
        console.log(`Creating profile for userId=${authUserId} with fullName="${fullName}", role="${systemRole}", designation="${userDesignation}"`);
        const { error: profileInsertError } = await supabase
          .from("profiles")
          .insert({
            id: authUserId,
            full_name: fullName.trim(),
            role: systemRole, // Always "Client" for organization users
            designation: userDesignation, // Custom job title from sign-up
            organization_id: organization_id,
            status: "approved",
            suspended: false,
          });

        if (profileInsertError) {
          throw new Error(`Profile creation failed: ${profileInsertError.message}`);
        }

        console.log(`✅ Profile created successfully for ${email}`);

        // Verify profile was created
        const { data: verifyProfile, error: verifyError } = await supabase
          .from("profiles")
          .select("id, full_name, role, organization_id, status")
          .eq("id", authUserId)
          .single();

        if (verifyError || !verifyProfile) {
          throw new Error(`Profile verification failed: ${verifyError?.message || 'Profile not found'}`);
        }

        console.log(`✅ Profile verified:`, verifyProfile);

        createdUsers.push(email);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`❌ Failed to create user ${email}:`, errorMessage);
        errors.push(`${email}: ${errorMessage}`);
        
        // Rollback: delete auth user if it was created
        if (authUserId) {
          console.log(`🔄 Rolling back auth user: ${authUserId}`);
          await supabase.auth.admin.deleteUser(authUserId);
        }
      }
    }

    // Approve the organization if not already approved
    const { error: orgApproveError } = await supabase
      .from("organizations")
      .update({ status: "approved" })
      .eq("id", organization_id);

    if (orgApproveError) {
      console.error("Error approving organization:", orgApproveError);
      // Don't fail the whole operation, but log it
    }

    // Mark notification as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification_id);

    // Create success notification
    await supabase.from("notifications").insert([
      {
        type: "approval",
        actor_id: approver_id,
        payload: {
          notification_id,
          emails_approved: createdUsers,
          organization_id,
        },
      },
    ]);

    return NextResponse.json({
      ok: true,
      created: createdUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      created_users: createdUsers,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

