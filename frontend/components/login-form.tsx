"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Ensure we have the authenticated user object. In some Auth setups the
      // signIn call may not immediately return a user (email confirmation flows),
      // so fetch the currently signed-in user explicitly.
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        // If we can't retrieve the user, show a helpful message
        throw new Error("Signed in but unable to retrieve user information. Check email confirmation or auth settings.");
      }

      const userId = userData?.user?.id || data?.user?.id;
      console.log("signIn data:", data, "getUser:", userData);
      if (!userId) {
        // fallback route
        setError("Login succeeded but no user id was returned. Check that the account is confirmed or try resetting the password.");
        router.push("/protected");
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("role, organization_id, status, suspended")
        .eq("id", userId)
        .limit(1)
        .single();

      console.log("profile query result:", profiles, profileError);

      if (profileError) {
        // If profile not found, try to auto-upsert via admin endpoint (dev helper).
        setError("No profile found — attempting to create one (dev helper)...");

        try {
          const roleToAssign = email === "superadmin@test.com" ? "Super-admin" : "Client";
          const res = await fetch("/api/admin/upsert-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, role: roleToAssign, full_name: null }),
          });
          const json = await res.json();
          console.log("admin upsert response:", json);
          if (json?.profile) {
            const newRole = json.profile.role || roleToAssign;
            const newStatus = json.profile.status || "pending";
            if (newStatus !== "approved") {
              setError("Your account is pending approval by an administrator.");
              return;
            }
            switch (newRole) {
              case "Super-admin":
                router.push("/dashboard/super-admin");
                return;
              case "Admin":
                router.push("/dashboard/admin");
                return;
              case "Security-team":
                router.push("/dashboard/security");
                return;
              default:
                router.push("/dashboard/client");
                return;
            }
          }
          // If admin upsert failed, fallthrough to showing an error below.
        } catch (upsertErr) {
          console.error("admin upsert error", upsertErr);
          setError(upsertErr instanceof Error ? upsertErr.message : String(upsertErr));
          router.push("/protected");
          return;
        }
      }

      // Check if account is suspended
      if (profiles && profiles.suspended) {
        setError("Your account has been suspended. Please contact an administrator.");
        return;
      }

      // If profile exists but is not approved, block login and show message.
      if (profiles && profiles.status && profiles.status !== "approved") {
        setError("Your account is pending approval by an administrator.");
        return;
      }

      const role = profiles?.role || "Client";
      // Redirect based on role
      switch (role) {
        case "Super-admin":
          router.push("/dashboard/super-admin");
          break;
        case "Admin":
          router.push("/dashboard/admin");
          break;
        case "Security-team":
          router.push("/dashboard/security");
          break;
        case "Client":
        default:
          router.push("/dashboard/client");
          break;
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
