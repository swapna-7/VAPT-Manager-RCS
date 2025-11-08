import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Admin endpoint to approve a user (set profiles.status = 'approved')
 * Request JSON: { user_id: string, approver_id?: string }
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, approver_id = null } = body as any;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" }, { status: 500 });
    }
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Update profile status to approved
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
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
