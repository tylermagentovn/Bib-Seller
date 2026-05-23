import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("admin_token");
      if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

// Types
export interface Distance {
  id: string;
  eventId: string;
  name: string;
  price: number;
  maxSlots: number;
  bibStart: number;
  bibEnd: number;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  rules: string | null;
  imageUrl: string | null;
  location: string | null;
  eventDate: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  distances: Distance[];
  createdAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  distanceId: string;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  emergencyName: string;
  emergencyPhone: string;
  bibNumber: number | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
  event: Event;
  distance: Distance;
  payment: Payment | null;
}

export interface Payment {
  id: string;
  registrationId: string;
  amount: number;
  sepayRef: string | null;
  status: "PENDING" | "PAID" | "EXPIRED";
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface QrData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  qrUrl: string;
}
