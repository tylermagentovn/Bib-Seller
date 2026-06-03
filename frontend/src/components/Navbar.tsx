import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bib1sLogo } from "./Bib1sLogo";
import { useUser } from "@/contexts/UserContext";
import { ChevronDown, LogOut, Ticket, User, Menu, X } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEventPage = location.pathname.startsWith("/events/");
  const containerClass = isEventPage ? "max-w-4xl" : "max-w-6xl";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className={`${containerClass} mx-auto px-4 h-16 flex items-center justify-between`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>
          <Bib1sLogo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600">
          <Link to="/" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-indigo-600 transition-colors">
            Sự kiện
          </Link>

          {user ? (
            <>
              <Link to="/account/bibs" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" /> Quản lý BIB
              </Link>
              <Link to="/account/profile" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Thông tin
              </Link>

              <div className="relative ml-1" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors max-w-[140px]"
                >
                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">
                      {(user.fullName || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate text-gray-700 text-sm">
                    {user.fullName || user.email.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-indigo-600 transition-colors">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors ml-1"
              >
                Đăng ký
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-3 mb-1 border-b">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-indigo-600">
                      {(user.fullName || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.fullName || user.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                <Link
                  to="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sự kiện
                </Link>
                <Link
                  to="/account/bibs"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Ticket className="h-4 w-4 text-gray-400" /> Quản lý BIB
                </Link>
                <Link
                  to="/account/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="h-4 w-4 text-gray-400" /> Thông tin cá nhân
                </Link>

                <div className="border-t pt-2 mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sự kiện
                </Link>
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors mt-1"
                >
                  Đăng ký tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
