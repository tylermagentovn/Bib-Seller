import { type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { Navbar } from "@/components/Navbar";
import { AdminLayout } from "@/components/AdminLayout";

import { HomePage } from "@/pages/HomePage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PaymentPage } from "@/pages/PaymentPage";
import { PaymentSuccessPage } from "@/pages/PaymentSuccessPage";
import { UserLoginPage } from "@/pages/UserLoginPage";
import { UserRegisterPage } from "@/pages/UserRegisterPage";
import { BibsPage } from "@/pages/account/BibsPage";
import { ProfilePage } from "@/pages/account/ProfilePage";
import { UnsubscribePage } from "@/pages/UnsubscribePage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { TermsPage } from "@/pages/TermsPage";
import { DataDeletionPage } from "@/pages/DataDeletionPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { AdminLoginPage } from "@/pages/admin/LoginPage";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { AdminEventsPage } from "@/pages/admin/EventsPage";
import { AdminRegistrationsPage } from "@/pages/admin/RegistrationsPage";
import { AdminAccountsPage } from "@/pages/admin/AccountsPage";
import { AdminSettingsPage } from "@/pages/admin/SettingsPage";

function RequireUser({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/events/:slug/register" element={<RegisterPage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route path="/payment/:id/success" element={<PaymentSuccessPage />} />
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/register" element={<UserRegisterPage />} />
          <Route path="/account/bibs" element={<RequireUser><BibsPage /></RequireUser>} />
          <Route path="/account/profile" element={<RequireUser><ProfilePage /></RequireUser>} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <footer className="bg-white border-t py-5 text-center text-xs text-gray-400 space-y-2">
        <div className="flex justify-center gap-4">
          <Link to="/privacy" className="hover:text-gray-600 hover:underline">Chính sách Bảo mật</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-gray-600 hover:underline">Điều khoản Sử dụng</Link>
        </div>
        <div>Copyright by Bib1s 2026</div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
        <UserProvider>
          <Routes>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="registrations" element={<AdminRegistrationsPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            <Route path="/*" element={<PublicLayout />} />
          </Routes>
        </UserProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
