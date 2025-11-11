"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Bell,
  Shield,
  CircleCheckBig,
  UserLock,
  LogOut
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log("Fetching notifications for user:", user.id);
        const { data: notifications, error } = await supabase
          .from("notifications")
          .select("id, read")
          .eq("user_id", user.id)
          .eq("read", false);
        
        if (error) {
          console.error("Error fetching notifications:", error);
        } else {
          console.log("Unread notifications:", notifications);
          setUnreadCount(notifications?.length || 0);
        }
      }
    };
    
    fetchUnreadCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "User Management", icon: Users },
    { href: "/dashboard/admin/organizations", label: "Organizations", icon: Building2 },
    { href: "/dashboard/admin/security-teams", label: "Security Teams", icon: Shield },
    { href: "/dashboard/admin/vulnerabilities", label: "Vulnerabilities", icon: CircleCheckBig },
    { href: "/dashboard/admin/verifications", label: "Verification Queue", icon: UserLock },
    { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              <div>
                <h1 className="font-bold text-lg text-gray-900">VAPT Manager</h1>
                <p className="text-sm text-purple-600">Admin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-purple-50 text-purple-600 border-l-4 border-purple-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {item.label === "Notifications" && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                        )}
                      </div>
                      <span className="font-medium flex-1">{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


