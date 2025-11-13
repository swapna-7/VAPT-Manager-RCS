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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Shield, ArrowLeft, Mail, Lock as LockIcon } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for session expiry message
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

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
                router.push("/dashboard/security-team");
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
          router.push("/dashboard/security-team");
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
      {/* Back to Home Link */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <Card className="border-0 shadow-2xl">
        {/* Card Header with Gradient */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center text-white font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-center text-purple-100 mt-2">
            Sign in to access your VAPT Manager dashboard
          </CardDescription>
        </div>

        <CardContent className="p-8">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/auth/sign-up"
                  className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          🔒 Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}
