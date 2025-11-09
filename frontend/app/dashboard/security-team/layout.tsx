import DashboardLayout from "@/components/dashboard-security-team";

export default function SecurityTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


