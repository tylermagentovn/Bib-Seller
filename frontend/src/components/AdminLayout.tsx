import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Calendar, Users, LogOut, Loader2, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bib1sLogo } from "./Bib1sLogo";

export function AdminLayout() {
  const { admin, logout, isLoading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Calendar, label: "Sự kiện", path: "/admin/events" },
    { icon: Users, label: "Đăng ký", path: "/admin/registrations" },
    ...(isSuperAdmin ? [{ icon: UserCog, label: "Tài khoản", path: "/admin/accounts" }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r flex flex-col fixed h-full">
        <div className="p-5 border-b">
          <Link to="/admin">
            <Bib1sLogo />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                location.pathname === path
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="text-xs text-gray-500 mb-1 truncate">{admin.name}</div>
          <div className="flex items-center gap-1 mb-3">
            <ShieldCheck className="h-3 w-3 text-indigo-400" />
            <span className="text-xs text-indigo-500 font-medium">
              {isSuperAdmin ? "Super Admin" : "Quản lý sự kiện"}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
