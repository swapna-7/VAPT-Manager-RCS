import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Admin API: upsert a profile using the SUPABASE_SERVICE_ROLE_KEY.
 * WARNING: This endpoint must be protected in production. It's intended for
 * development/testing to get around RLS when bootstrapping data.
 *
 * Request JSON: { user_id: string, role?: string, full_name?: string, organization_id?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, role = "Client", full_name = null, organization_id = null } = body as any;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" }, { status: 500 });
    }

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // If organization_id is provided, ensure it exists to avoid FK errors.
    if (organization_id) {
      const { data: orgCheck, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", organization_id)
        .limit(1)
        .maybeSingle();
      if (orgError) {
        return NextResponse.json({ error: orgError.message }, { status: 500 });
      }
      if (!orgCheck) {
        return NextResponse.json({ error: "organization_id not found" }, { status: 400 });
      }
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert([
        {
          id: user_id,
          role,
          full_name,
          organization_id,
        },
      ], { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Fetch the profile after upsert to return the created/updated row.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: profileData ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
