import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, suspended } = body as any;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" },
        { status: 500 }
      );
    }
    if (!user_id || typeof suspended !== "boolean") {
      return NextResponse.json({ error: "user_id and suspended (boolean) required" }, { status: 400 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Update profile suspended status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ suspended })
      .eq("id", user_id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, suspended });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


