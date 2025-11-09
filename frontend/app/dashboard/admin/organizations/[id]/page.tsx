import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Clock } from "lucide-react";
import OrganizationNotes from "@/components/organization-notes";
import OrganizationActivity from "@/components/organization-activity";
import { formatDateTime } from "@/lib/utils";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !organization) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/admin/organizations"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const services = organization.services as any;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/organizations"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg bg-purple-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-600 mt-1">Complete organization overview and tracking</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Active
        </span>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Contact Email</p>
                <p className="text-sm font-medium">{organization.contact_email || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{organization.contact_phone || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {formatDateTime(organization.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">
                  {organization.updated_at
                    ? formatDateTime(organization.updated_at)
                    : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address */}
      {organization.address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700">{organization.address}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {services && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {services.web && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Web</span>
                  <span className="text-sm font-medium">{services.web}</span>
                </div>
              )}
              {services.android && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Android</span>
                  <span className="text-sm font-medium">{services.android}</span>
                </div>
              )}
              {services.ios && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">iOS</span>
                  <span className="text-sm font-medium">{services.ios}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationNotes organizationId={id} initialNotes={organization.notes || ""} />
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationActivity organizationId={id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


