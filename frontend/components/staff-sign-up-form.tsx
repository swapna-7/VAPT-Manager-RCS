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

export function StaffSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`,
        },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData?.user?.id;
      if (userId) {
        // Wait a moment for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use UPSERT to set role and full_name (trigger creates with defaults)
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            full_name: fullName,
            role,
            status: "pending",
          }, { onConflict: "id" });
        
        if (profileError) {
          console.error("profile upsert error", profileError.message);
          throw new Error("Database error saving new user");
        }

        // notify super-admin for approval
        const { error: notifError } = await supabase.from("notifications").insert([
          {
            type: "user_signup",
            actor_id: userId,
            payload: { email, role, full_name: fullName },
          },
        ]);
        if (notifError) console.error("notification insert error", notifError.message);
      }

      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Staff Sign up</CardTitle>
          <CardDescription>Create staff account (Super-admin/Admin/Security-team)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded border p-2">
                <option>Super-admin</option>
                <option>Admin</option>
                <option>Security-team</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create account"}
            </Button>

            <div className="mt-4 text-center text-sm">
              Already have an account? <Link href="/auth/login" className="underline">Login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
