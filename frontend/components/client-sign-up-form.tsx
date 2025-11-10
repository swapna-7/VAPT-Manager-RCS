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
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type ServicesState = {
  web?: "Standard" | "Essential" | null;
  android?: "Standard" | "Essential" | null;
  ios?: "Standard" | "Essential" | null;
};

type UserAccess = {
  name: string;
  email: string;
  role: string;
};

type WebServiceDetails = {
  scopeUrl: string;
  userMatrix: string;
  credentials: string;
};

type AndroidServiceDetails = {
  sslPinnedApk: string;
  sslUnpinnedApk: string;
  userMatrix: string;
  credentials: string;
};

type IosServiceDetails = {
  testflightPinned: string;
  testflightUnpinned: string;
  ipaFile: string;
  userMatrix: string;
  credentials: string;
};

export function ClientSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([{ name: "", email: "", role: "" }]);
  const [services, setServices] = useState<ServicesState>({});
  
  // Service-specific details
  const [webDetails, setWebDetails] = useState<WebServiceDetails>({
    scopeUrl: "",
    userMatrix: "",
    credentials: ""
  });
  const [androidDetails, setAndroidDetails] = useState<AndroidServiceDetails>({
    sslPinnedApk: "",
    sslUnpinnedApk: "",
    userMatrix: "",
    credentials: ""
  });
  const [iosDetails, setIosDetails] = useState<IosServiceDetails>({
    testflightPinned: "",
    testflightUnpinned: "",
    ipaFile: "",
    userMatrix: "",
    credentials: ""
  });
  
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

  const addUserAccess = () => {
    setUserAccesses([...userAccesses, { name: "", email: "", role: "" }]);
  };

  const removeUserAccess = (index: number) => {
    if (userAccesses.length > 1) {
      setUserAccesses(userAccesses.filter((_, i) => i !== index));
    }
  };

  const updateUserAccess = (index: number, field: "name" | "email" | "role", value: string) => {
    const updated = [...userAccesses];
    updated[index][field] = value;
    setUserAccesses(updated);
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

    // Validate that at least one user is provided
    const validUsers = userAccesses.filter(u => u.name.trim() && u.email.trim() && u.role.trim());
    
    if (validUsers.length === 0) {
      setError("Please provide at least one user with name, email, and role");
      setIsLoading(false);
      return;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const user of validUsers) {
      if (!emailRegex.test(user.email)) {
        setError(`Invalid email format: ${user.email}`);
        setIsLoading(false);
        return;
      }
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
              web: services.web ? {
                tier: services.web,
                details: webDetails
              } : null,
              android: services.android ? {
                tier: services.android,
                details: androidDetails
              } : null,
              ios: services.ios ? {
                tier: services.ios,
                details: iosDetails
              } : null,
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
              web: services.web ? {
                tier: services.web,
                details: webDetails
              } : null,
              android: services.android ? {
                tier: services.android,
                details: androidDetails
              } : null,
              ios: services.ios ? {
                tier: services.ios,
                details: iosDetails
              } : null,
            }
          },
        },
        {
          type: "email_access_request",
          actor_id: null,
          payload: {
            organization_id: organizationId,
            users: validUsers, // Now includes name, email, and role
            password: password,
            requested_by: contactEmail,
          } as any,
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
              <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50">
                {/* Web Application PT */}
                <div className="border bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
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
                    <span className="flex-1 font-semibold">Web Application PT</span>
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
                  
                  {services.web && (
                    <div className="ml-6 space-y-3 mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="grid gap-2">
                        <Label htmlFor="web-scope-url" className="text-sm font-medium">Scope URL (Staging Environment) *</Label>
                        <Input
                          id="web-scope-url"
                          type="url"
                          placeholder="https://staging.example.com"
                          required={!!services.web}
                          value={webDetails.scopeUrl}
                          onChange={(e) => setWebDetails({...webDetails, scopeUrl: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="web-user-matrix" className="text-sm font-medium">User Matrix *</Label>
                        <Textarea
                          id="web-user-matrix"
                          placeholder="List all users with their privileges/access to functions&#10;Example:&#10;Admin User: Full access to all modules&#10;Standard User: Read-only access&#10;Guest User: Limited dashboard view"
                          rows={4}
                          required={!!services.web}
                          value={webDetails.userMatrix}
                          onChange={(e) => setWebDetails({...webDetails, userMatrix: e.target.value})}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-600">Describe all user roles and their access levels</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="web-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Textarea
                          id="web-credentials"
                          placeholder="Provide credentials for all user levels&#10;Example:&#10;Admin: admin@example.com / adminPass123&#10;User: user@example.com / userPass123"
                          rows={4}
                          required={!!services.web}
                          value={webDetails.credentials}
                          onChange={(e) => setWebDetails({...webDetails, credentials: e.target.value})}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-600">List all test credentials for different user roles</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Android Application PT */}
                <div className="border bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
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
                    <span className="flex-1 font-semibold">Android Application PT</span>
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
                  
                  {services.android && (
                    <div className="ml-6 space-y-3 mt-3 p-3 bg-green-50 rounded border border-green-200">
                      <div className="grid gap-2">
                        <Label htmlFor="android-pinned-apk" className="text-sm font-medium">SSL Pinned APK File/URL *</Label>
                        <Input
                          id="android-pinned-apk"
                          type="text"
                          placeholder="https://drive.google.com/... or file name"
                          required={!!services.android}
                          value={androidDetails.sslPinnedApk}
                          onChange={(e) => setAndroidDetails({...androidDetails, sslPinnedApk: e.target.value})}
                        />
                        <p className="text-xs text-gray-600">Provide download link or upload details for SSL pinned APK</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="android-unpinned-apk" className="text-sm font-medium">SSL Unpinned APK File/URL *</Label>
                        <Input
                          id="android-unpinned-apk"
                          type="text"
                          placeholder="https://drive.google.com/... or file name"
                          required={!!services.android}
                          value={androidDetails.sslUnpinnedApk}
                          onChange={(e) => setAndroidDetails({...androidDetails, sslUnpinnedApk: e.target.value})}
                        />
                        <p className="text-xs text-gray-600">Provide download link or upload details for SSL unpinned APK</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="android-user-matrix" className="text-sm font-medium">User Matrix *</Label>
                        <Textarea
                          id="android-user-matrix"
                          placeholder="List all users with their privileges/access to functions"
                          rows={4}
                          required={!!services.android}
                          value={androidDetails.userMatrix}
                          onChange={(e) => setAndroidDetails({...androidDetails, userMatrix: e.target.value})}
                          className="resize-none"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="android-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Textarea
                          id="android-credentials"
                          placeholder="Provide credentials for all user levels"
                          rows={4}
                          required={!!services.android}
                          value={androidDetails.credentials}
                          onChange={(e) => setAndroidDetails({...androidDetails, credentials: e.target.value})}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* iOS Application PT */}
                <div className="border bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
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
                    <span className="flex-1 font-semibold">iOS Application PT</span>
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
                  
                  {services.ios && (
                    <div className="ml-6 space-y-3 mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                      <div className="grid gap-2">
                        <Label htmlFor="ios-testflight-pinned" className="text-sm font-medium">TestFlight iOS Invite (SSL Pinned) *</Label>
                        <Input
                          id="ios-testflight-pinned"
                          type="text"
                          placeholder="https://testflight.apple.com/join/..."
                          required={!!services.ios}
                          value={iosDetails.testflightPinned}
                          onChange={(e) => setIosDetails({...iosDetails, testflightPinned: e.target.value})}
                        />
                        <p className="text-xs text-gray-600">TestFlight invite link for SSL pinned version</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ios-testflight-unpinned" className="text-sm font-medium">TestFlight iOS Invite (SSL Unpinned) *</Label>
                        <Input
                          id="ios-testflight-unpinned"
                          type="text"
                          placeholder="https://testflight.apple.com/join/..."
                          required={!!services.ios}
                          value={iosDetails.testflightUnpinned}
                          onChange={(e) => setIosDetails({...iosDetails, testflightUnpinned: e.target.value})}
                        />
                        <p className="text-xs text-gray-600">TestFlight invite link for SSL unpinned version</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ios-ipa-file" className="text-sm font-medium">IPA File/URL *</Label>
                        <Input
                          id="ios-ipa-file"
                          type="text"
                          placeholder="https://drive.google.com/... or file name"
                          required={!!services.ios}
                          value={iosDetails.ipaFile}
                          onChange={(e) => setIosDetails({...iosDetails, ipaFile: e.target.value})}
                        />
                        <p className="text-xs text-gray-600">Provide download link or upload details for IPA file</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ios-user-matrix" className="text-sm font-medium">User Matrix *</Label>
                        <Textarea
                          id="ios-user-matrix"
                          placeholder="List all users with their privileges/access to functions"
                          rows={4}
                          required={!!services.ios}
                          value={iosDetails.userMatrix}
                          onChange={(e) => setIosDetails({...iosDetails, userMatrix: e.target.value})}
                          className="resize-none"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ios-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Textarea
                          id="ios-credentials"
                          placeholder="Provide credentials for all user levels"
                          rows={4}
                          required={!!services.ios}
                          value={iosDetails.credentials}
                          onChange={(e) => setIosDetails({...iosDetails, credentials: e.target.value})}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr />
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>User Access Details *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUserAccess}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Provide the name, email, and role for each user who needs access. These will be sent for approval to the super admin.
              </p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {userAccesses.map((user, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">User {index + 1}</span>
                      {userAccesses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUserAccess(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor={`user-name-${index}`}>Full Name *</Label>
                      <Input
                        id={`user-name-${index}`}
                        type="text"
                        placeholder="e.g., John Doe"
                        required
                        value={user.name}
                        onChange={(e) => updateUserAccess(index, "name", e.target.value)}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor={`user-email-${index}`}>Email Address *</Label>
                      <Input
                        id={`user-email-${index}`}
                        type="email"
                        placeholder="e.g., john.doe@example.com"
                        required
                        value={user.email}
                        onChange={(e) => updateUserAccess(index, "email", e.target.value)}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor={`user-role-${index}`}>Role/Designation *</Label>
                      <Input
                        id={`user-role-${index}`}
                        type="text"
                        placeholder="e.g., Admin, Manager, Developer"
                        required
                        value={user.role}
                        onChange={(e) => updateUserAccess(index, "role", e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        User's role in the organization (Admin, Manager, etc.)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
