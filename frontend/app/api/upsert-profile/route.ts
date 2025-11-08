import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Determine authenticated user server-side (reads cookies)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = userData.user;
    const body = await req.json().catch(() => ({}));
    const role = body.role || "Client";
    const full_name = body.full_name || null;
    const organization_id = body.organization_id || null;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        [
          {
            id: user.id,
            role,
            full_name,
            organization_id,
          },
        ],
        { onConflict: "id" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data?.[0] ?? null });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
