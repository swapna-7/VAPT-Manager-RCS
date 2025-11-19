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
import { Plus, Trash2, Shield, ArrowLeft, Building2, Mail, Phone, MapPin, Lock, CheckCircle } from "lucide-react";

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

  // File objects for upload
  const [webUserMatrixFile, setWebUserMatrixFile] = useState<File | null>(null);
  const [webCredentialsFile, setWebCredentialsFile] = useState<File | null>(null);
  const [androidUserMatrixFile, setAndroidUserMatrixFile] = useState<File | null>(null);
  const [androidCredentialsFile, setAndroidCredentialsFile] = useState<File | null>(null);
  const [iosUserMatrixFile, setIosUserMatrixFile] = useState<File | null>(null);
  const [iosCredentialsFile, setIosCredentialsFile] = useState<File | null>(null);

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

  const uploadFile = async (file: File, orgId: string, category: string): Promise<string> => {
    const supabase = createClient();
    const timestamp = Date.now();
    const filePath = `${orgId}/${category}/${timestamp}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('organization-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-files')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
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
      // Create a temporary org ID for file uploads
      const tempOrgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create copies of details to update with URLs
      const updatedWebDetails = { ...webDetails };
      const updatedAndroidDetails = { ...androidDetails };
      const updatedIosDetails = { ...iosDetails };
      
      // Upload files and get URLs
      try {
        if (webUserMatrixFile) {
          console.log('Uploading web user matrix...');
          const url = await uploadFile(webUserMatrixFile, tempOrgId, 'web-user-matrix');
          console.log('Web user matrix uploaded:', url);
          updatedWebDetails.userMatrix = url;
        }
        if (webCredentialsFile) {
          console.log('Uploading web credentials...');
          const url = await uploadFile(webCredentialsFile, tempOrgId, 'web-credentials');
          console.log('Web credentials uploaded:', url);
          updatedWebDetails.credentials = url;
        }
        if (androidUserMatrixFile) {
          console.log('Uploading android user matrix...');
          const url = await uploadFile(androidUserMatrixFile, tempOrgId, 'android-user-matrix');
          console.log('Android user matrix uploaded:', url);
          updatedAndroidDetails.userMatrix = url;
        }
        if (androidCredentialsFile) {
          console.log('Uploading android credentials...');
          const url = await uploadFile(androidCredentialsFile, tempOrgId, 'android-credentials');
          console.log('Android credentials uploaded:', url);
          updatedAndroidDetails.credentials = url;
        }
        if (iosUserMatrixFile) {
          console.log('Uploading ios user matrix...');
          const url = await uploadFile(iosUserMatrixFile, tempOrgId, 'ios-user-matrix');
          console.log('iOS user matrix uploaded:', url);
          updatedIosDetails.userMatrix = url;
        }
        if (iosCredentialsFile) {
          console.log('Uploading ios credentials...');
          const url = await uploadFile(iosCredentialsFile, tempOrgId, 'ios-credentials');
          console.log('iOS credentials uploaded:', url);
          updatedIosDetails.credentials = url;
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload files');
        setIsLoading(false);
        return;
      }

      // Send organization payload to server to create org & notifications
      const payload = {
        name: orgName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        services: {
          web: services.web
            ? { tier: services.web, details: updatedWebDetails }
            : null,
          android: services.android
            ? { tier: services.android, details: updatedAndroidDetails }
            : null,
          ios: services.ios
            ? { tier: services.ios, details: updatedIosDetails }
            : null,
        },
        users: validUsers,
        password,
      };

      const resp = await fetch('/api/org-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to create organization');
      }

      // Redirect to signup success
      router.push('/auth/sign-up-success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="w-full max-w-5xl mx-auto overflow-hidden shadow-2xl border-0">
        <CardHeader className="bg-purple-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMC4yIiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30"></div>
          
          <div className="relative z-10">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
       
            
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Client Organization Sign Up
            </CardTitle>
            <CardDescription className="text-purple-100 text-base">
              Register your organization and required security services
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSignUp} className="flex flex-col gap-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Organization Details</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="org-name" className="text-sm font-medium text-gray-700">Organization Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="org-name" 
                    required 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Your Company Name"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-email" className="text-sm font-medium text-gray-700">Contact Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="contact-email" 
                    type="email" 
                    required 
                    value={contactEmail} 
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-phone" className="text-sm font-medium text-gray-700">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="contact-phone" 
                    value={contactPhone} 
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Textarea
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                    placeholder="123 Main St, City, State, ZIP"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Security Services</h3>
              <Label className="text-sm text-gray-600">Select required services (one or more)</Label>
              <div className="flex flex-col gap-4 p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
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
                    <div className="ml-6 space-y-3 mt-3 p-3 bg-blue-50 rounded border border-blue-200 ">
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
                        <Input
                          id="web-user-matrix"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.web}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setWebUserMatrixFile(file);
                              setWebDetails({...webDetails, userMatrix: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {webUserMatrixFile && <p className="text-xs text-green-600">✓ {webUserMatrixFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all user roles and their access levels (CSV, PDF, Word, Excel)</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="web-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Input
                          id="web-credentials"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.web}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setWebCredentialsFile(file);
                              setWebDetails({...webDetails, credentials: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {webCredentialsFile && <p className="text-xs text-green-600">✓ {webCredentialsFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all test credentials for different user roles (CSV, PDF, Word, Excel)</p>
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
                        <Input
                          id="android-user-matrix"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.android}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAndroidUserMatrixFile(file);
                              setAndroidDetails({...androidDetails, userMatrix: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {androidUserMatrixFile && <p className="text-xs text-green-600">✓ {androidUserMatrixFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all user roles and their access levels (CSV, PDF, Word, Excel)</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="android-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Input
                          id="android-credentials"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.android}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAndroidCredentialsFile(file);
                              setAndroidDetails({...androidDetails, credentials: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {androidCredentialsFile && <p className="text-xs text-green-600">✓ {androidCredentialsFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all test credentials for different user roles (CSV, PDF, Word, Excel)</p>
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
                        <Input
                          id="ios-user-matrix"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.ios}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIosUserMatrixFile(file);
                              setIosDetails({...iosDetails, userMatrix: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {iosUserMatrixFile && <p className="text-xs text-green-600">✓ {iosUserMatrixFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all user roles and their access levels (CSV, PDF, Word, Excel)</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ios-credentials" className="text-sm font-medium">All User Level Login Credentials *</Label>
                        <Input
                          id="ios-credentials"
                          type="file"
                          accept=".csv,.pdf,.doc,.docx,.xls,.xlsx"
                          required={!!services.ios}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIosCredentialsFile(file);
                              setIosDetails({...iosDetails, credentials: file.name});
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {iosCredentialsFile && <p className="text-xs text-green-600">✓ {iosCredentialsFile.name}</p>}
                        <p className="text-xs text-gray-600">Upload file with all test credentials for different user roles (CSV, PDF, Word, Excel)</p>
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
              
              <div className="space-y-3 max-h-auto overflow-y-visible">
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

            <div className="space-y-4 pt-6 border-t-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Security</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password for all accounts *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-xs text-gray-600 flex items-start gap-2">
                  <CheckCircle className={`h-4 w-4 mt-0.5 ${password.length >= 6 ? 'text-green-500' : 'text-gray-400'}`} />
                  This password will be used for all approved email accounts (minimum 6 characters).
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password-confirm" className="text-sm font-medium text-gray-700">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password-confirm" 
                    type="password" 
                    required 
                    value={passwordConfirm} 
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>
                {passwordConfirm && (
                  <p className="text-xs flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${password === passwordConfirm ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={password === passwordConfirm ? 'text-green-600' : 'text-red-600'}>
                      {password === passwordConfirm ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering Organization...
                </div>
              ) : (
                "Register Organization"
              )}
            </Button>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
              <Lock className="h-3.5 w-3.5" />
              <span>Your data is encrypted and secure</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
