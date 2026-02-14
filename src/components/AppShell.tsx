"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Home,
  Users,
  Calendar,
  Banknote,
  ClipboardList,
  Shield,
  LogOut,
} from "lucide-react";

const baseNavItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/households", label: "世帯", icon: Home },
  { href: "/deceased", label: "故人", icon: Users },
  { href: "/events", label: "イベント", icon: Calendar },
  { href: "/transactions", label: "取引", icon: Banknote },
  { href: "/tasks", label: "タスク", icon: ClipboardList },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navItems = user?.roleName === "Admin"
    ? [...baseNavItems, { href: "/admin/users", label: "ユーザー管理", icon: Shield }]
    : baseNavItems;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg text-indigo-700">檀家CRM</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-gray-500 mb-1">{user.displayName} ({user.roleName})</div>
          <button
            onClick={async () => { await logout(); router.push("/login"); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition"
          >
            <LogOut size={14} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
