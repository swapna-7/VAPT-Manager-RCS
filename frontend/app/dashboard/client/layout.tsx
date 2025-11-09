import DashboardLayout from "@/components/dashboard-client";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


