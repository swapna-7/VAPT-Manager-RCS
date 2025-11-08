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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ServicesState = {
  web?: "Standard" | "Essential" | null;
  android?: "Standard" | "Essential" | null;
  ios?: "Standard" | "Essential" | null;
};

export function ClientSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [services, setServices] = useState<ServicesState>({});
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggleService = (key: keyof ServicesState) => {
    setServices((s) => ({ ...s, [key]: s[key] ? null : "Standard" }));
  };

  const setServiceTier = (key: keyof ServicesState, tier: "Standard" | "Essential") => {
    setServices((s) => ({ ...s, [key]: tier }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      // Create auth user for the primary admin contact
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`,
        },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData?.user?.id;

      // Insert organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert([
          {
            name: orgName,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            address,
            services: {
              web: services.web || null,
              android: services.android || null,
              ios: services.ios || null,
            },
          },
        ])
        .select("id")
        .single();
      if (orgError) throw orgError;

      const organizationId = orgData?.id;

      // Wait for trigger to complete, then upsert profile with organization details
      if (userId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            role: "Client",
            organization_id: organizationId,
            allowed_emails: allowedEmails ? allowedEmails.split(",").map((s) => s.trim()) : null,
            status: "pending",
          }, { onConflict: "id" });
        
        if (profileError) {
          console.error("profile upsert error", profileError.message);
          throw new Error("Database error saving new user");
        }

        // create notifications for admin approval
        const notifications = [
          {
            type: "user_signup",
            actor_id: userId,
            payload: { email: adminEmail, role: "Client", organization_id: organizationId },
          },
          {
            type: "organization_signup",
            actor_id: userId,
            payload: { 
              name: orgName, 
              organization_id: organizationId,
              contact_email: contactEmail,
              contact_phone: contactPhone,
              address,
              services: {
                web: services.web || null,
                android: services.android || null,
                ios: services.ios || null,
              }
            },
          },
        ];
        
        const { error: notifError } = await supabase.from("notifications").insert(notifications);
        if (notifError) console.error("notification insert error", notifError.message);
      }

      // Redirect to signup success (email confirmation may be required)
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
          <CardTitle className="text-2xl">Client Organisation Sign up</CardTitle>
          <CardDescription>Register your organisation and required services</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organisation name</Label>
              <Input id="org-name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-email">Contact email</Label>
              <Input id="contact-email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Contact phone</Label>
              <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Services required</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={!!services.web} onChange={() => toggleService("web")} />
                  <span>Web Application PT</span>
                  {services.web && (
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setServiceTier("web", "Standard")} className="btn">Standard</button>
                      <button type="button" onClick={() => setServiceTier("web", "Essential")} className="btn">Essential</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={!!services.android} onChange={() => toggleService("android")} />
                  <span>Android Application PT</span>
                  {services.android && (
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setServiceTier("android", "Standard")} className="btn">Standard</button>
                      <button type="button" onClick={() => setServiceTier("android", "Essential")} className="btn">Essential</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={!!services.ios} onChange={() => toggleService("ios")} />
                  <span>iOS Application PT</span>
                  {services.ios && (
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setServiceTier("ios", "Standard")} className="btn">Standard</button>
                      <button type="button" onClick={() => setServiceTier("ios", "Essential")} className="btn">Essential</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="allowed-emails">Emails to be granted access (comma separated)</Label>
              <Input id="allowed-emails" value={allowedEmails} onChange={(e) => setAllowedEmails(e.target.value)} />
            </div>

            <hr />

            <div className="grid gap-2">
              <Label htmlFor="admin-email">Admin contact email (will be created)</Label>
              <Input id="admin-email" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register organisation"}
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
