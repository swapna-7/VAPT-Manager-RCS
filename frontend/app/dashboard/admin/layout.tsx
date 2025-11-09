import DashboardLayout from "@/components/dashboard-admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


