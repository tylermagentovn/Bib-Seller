import { type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

import { AdminLoginPage } from "@/pages/admin/LoginPage";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { AdminEventsPage } from "@/pages/admin/EventsPage";
import { AdminRegistrationsPage } from "@/pages/admin/RegistrationsPage";
import { AdminAccountsPage } from "@/pages/admin/AccountsPage";

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
        </Routes>
      </div>
      <footer className="bg-white border-t py-4 text-center text-xs text-gray-400">
        Copyright by Bib1s 2026
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
            </Route>
            <Route path="/*" element={<PublicLayout />} />
          </Routes>
        </UserProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
