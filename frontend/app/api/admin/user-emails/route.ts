import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_ids } = body as { user_ids: string[] };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (!user_ids || !Array.isArray(user_ids)) {
      return NextResponse.json({ error: "user_ids array required" }, { status: 400 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch emails from auth.users
    const emails: Record<string, string> = {};
    
    for (const userId of user_ids) {
      try {
        const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
        if (!error && user?.email) {
          emails[userId] = user.email;
        }
      } catch (e) {
        // Skip if user not found
      }
    }

    return NextResponse.json({ emails });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


