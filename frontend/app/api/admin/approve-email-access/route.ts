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
      ? emails.map((email: string) => ({ name: email.split('@')[0], email }))
      : [];

    if (!organization_id || userList.length === 0 || !password) {
      return NextResponse.json(
        { error: "Invalid notification payload: missing organization_id, users/emails, or password" },
        { status: 400 }
      );
    }

    // Create user accounts for each user
    const createdUsers: string[] = [];
    const errors: string[] = [];

    for (const user of userList) {
      const email = typeof user === 'string' ? user : user.email;
      const fullName = typeof user === 'string' ? email.split('@')[0] : user.name;
      
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.trim(),
          password: password,
          email_confirm: true, // Auto-confirm email
        });

        if (authError) {
          errors.push(`${email}: ${authError.message}`);
          continue;
        }

        if (!authData.user?.id) {
          errors.push(`${email}: Failed to create user`);
          continue;
        }

        const userId = authData.user.id;

        // Wait for trigger to create profile
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Update profile with organization details and full name
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            role: "Client",
            organization_id: organization_id,
            status: "approved", // Auto-approve since super admin approved
          })
          .eq("id", userId);

        if (profileError) {
          errors.push(`${email}: ${profileError.message}`);
          // Clean up auth user if profile creation failed
          await supabase.auth.admin.deleteUser(userId);
          continue;
        }

        createdUsers.push(email);
      } catch (err) {
        errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
      }
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

