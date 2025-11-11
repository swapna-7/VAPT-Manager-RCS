import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Admin endpoint to sync and fix orphaned user approvals
 * This checks for users who have approved access requests but missing profiles
 * GET: Check for orphaned approvals
 * POST: Fix orphaned approvals by creating missing profiles
 */

export async function GET(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ 
        error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" 
      }, { status: 500 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check for orphaned approvals
    const { data, error } = await supabase
      .from("orphaned_approvals")
      .select("*")
      .neq("issue_type", "complete");

    if (error) {
      return NextResponse.json({ 
        error: `Failed to check orphaned approvals: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      orphaned_count: data?.length || 0,
      orphaned_approvals: data || [],
      message: data?.length === 0 
        ? "No orphaned approvals found - all systems normal ✅" 
        : `Found ${data.length} orphaned approval(s) that need fixing ⚠️`
    });

  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ 
        error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" 
      }, { status: 500 });
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Call the sync function
    const { data, error } = await supabase.rpc("sync_approved_user_profiles");

    if (error) {
      return NextResponse.json({ 
        error: `Failed to sync profiles: ${error.message}` 
      }, { status: 500 });
    }

    const fixedCount = data?.length || 0;

    return NextResponse.json({ 
      ok: true,
      fixed_count: fixedCount,
      fixed_users: data || [],
      message: fixedCount === 0 
        ? "No orphaned approvals to fix - all systems normal ✅" 
        : `Successfully created ${fixedCount} missing profile(s) ✅`
    });

  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
