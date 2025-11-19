import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      contact_email,
      contact_phone,
      address,
      services,
      users,
      password,
    } = body;

    if (!name || !contact_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Insert organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert([
        {
          name,
          contact_email,
          contact_phone,
          address,
          services,
        },
      ])
      .select("id")
      .single();

    if (orgError) {
      console.error("org insert error", orgError);
      throw orgError;
    }

    const organizationId = orgData.id;

    // Create notifications for admin/super-admin approval
    const notifications = [
      {
        type: "organization_signup",
        actor_id: null,
        payload: {
          name,
          organization_id: organizationId,
          contact_email,
          contact_phone,
          address,
          services,
        },
      },
      {
        type: "email_access_request",
        actor_id: null,
        payload: {
          organization_id: organizationId,
          users,
          password,
          requested_by: contact_email,
          services,
        },
      },
    ];

    const { error: notifError } = await supabase.from("notifications").insert(notifications);
    if (notifError) {
      console.error("notification insert error", notifError);
      throw notifError;
    }

    return NextResponse.json({ organizationId });
  } catch (err: unknown) {
    console.error("/api/org-create error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
