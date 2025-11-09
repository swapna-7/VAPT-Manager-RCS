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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
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

    // Validate password confirmation
    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    // Validate that at least one email is provided
    const emailList = allowedEmails
      ? allowedEmails.split(",").map((s) => s.trim()).filter((email) => email.length > 0)
      : [];

    if (emailList.length === 0) {
      setError("Please provide at least one email address to grant access");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      // Insert organization (will be pending approval)
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

      // Create notifications for super admin approval
      const notifications = [
        {
          type: "organization_signup",
          actor_id: null, // No user created yet
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
        {
          type: "email_access_request",
          actor_id: null,
          payload: {
            organization_id: organizationId,
            emails: emailList,
            password: password, // Store password for super admin to use when creating accounts
            requested_by: contactEmail,
          } as any, // Type assertion needed for notification payload
        },
      ];
      
      const { error: notifError } = await supabase.from("notifications").insert(notifications);
      if (notifError) {
        console.error("notification insert error", notifError.message);
        throw new Error("Failed to create approval requests");
      }

      // Redirect to signup success
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
              <Label>Services required (Select multiple)</Label>
              <div className="flex flex-col gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={!!services.web} 
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setServices((s) => ({ ...s, web: "Standard" }));
                      } else {
                        setServices((s) => ({ ...s, web: null }));
                      }
                    }} 
                  />
                  <span className="flex-1">Web Application PT</span>
                  {services.web && (
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("web", "Standard")} 
                        className={`px-3 py-1 text-xs rounded ${services.web === "Standard" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Standard
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("web", "Essential")} 
                        className={`px-3 py-1 text-xs rounded ${services.web === "Essential" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Essential
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={!!services.android} 
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setServices((s) => ({ ...s, android: "Standard" }));
                      } else {
                        setServices((s) => ({ ...s, android: null }));
                      }
                    }} 
                  />
                  <span className="flex-1">Android Application PT</span>
                  {services.android && (
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("android", "Standard")} 
                        className={`px-3 py-1 text-xs rounded ${services.android === "Standard" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Standard
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("android", "Essential")} 
                        className={`px-3 py-1 text-xs rounded ${services.android === "Essential" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Essential
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={!!services.ios} 
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setServices((s) => ({ ...s, ios: "Standard" }));
                      } else {
                        setServices((s) => ({ ...s, ios: null }));
                      }
                    }} 
                  />
                  <span className="flex-1">iOS Application PT</span>
                  {services.ios && (
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("ios", "Standard")} 
                        className={`px-3 py-1 text-xs rounded ${services.ios === "Standard" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Standard
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setServiceTier("ios", "Essential")} 
                        className={`px-3 py-1 text-xs rounded ${services.ios === "Essential" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                      >
                        Essential
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr />
            <div className="grid gap-2">
              <Label htmlFor="allowed-emails">Emails to be granted access (comma separated) *</Label>
              <Input 
                id="allowed-emails" 
                type="text"
                placeholder="user1@example.com, user2@example.com"
                required
                value={allowedEmails} 
                onChange={(e) => setAllowedEmails(e.target.value)} 
              />
              <p className="text-xs text-gray-500">
                These emails will be sent for approval to the super admin. Once approved, accounts will be created with the password you provide below.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password for all accounts *</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-gray-500">
                This password will be used for all approved email accounts.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password-confirm">Confirm Password *</Label>
              <Input id="password-confirm" type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
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
