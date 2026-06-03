import axios from "axios";

// Admin API — uses admin_token
export const api = axios.create({ baseURL: "/api" });

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

// User API — uses user_token
export const userApi = axios.create({ baseURL: "/api" });

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("user_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

userApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("user_token");
    }
    return Promise.reject(err);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  idNumber: string | null;
  shirtSize: string | null;
  bloodType: string | null;
  medicalConditions: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  createdAt: string;
}

export type FieldVisibility = "required" | "optional" | "hidden";

export interface FieldConfig {
  fullName?: FieldVisibility;
  phone?: FieldVisibility;
  gender?: FieldVisibility;
  email?: FieldVisibility;
  dob?: FieldVisibility;
  idNumber?: FieldVisibility;
  shirtSize?: FieldVisibility;
  bloodType?: FieldVisibility;
  medicalConditions?: FieldVisibility;
  emergencyName?: FieldVisibility;
  emergencyPhone?: FieldVisibility;
}

export interface TeamMember {
  id: string;
  registrationId: string;
  memberIndex: number;
  fullName: string;
  phone: string;
  gender: string | null;
  email: string | null;
  dob: string | null;
  idNumber: string | null;
  shirtSize: string | null;
  bloodType: string | null;
  medicalConditions: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  createdAt: string;
}

export interface Distance {
  id: string;
  eventId: string;
  name: string;
  price: number;
  maxSlots: number;
  bibStart: number;
  bibEnd: number;
  type: "SOLO" | "RELAY";
  teamSize: number | null;
  _count?: { registrations: number };
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  rules: string | null;
  disclaimer: string | null;
  imageUrl: string | null;
  shirtSizeImageUrl: string | null;
  raceKitImageUrl: string | null;
  raceKitDescription: string | null;
  location: string | null;
  eventDate: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  fieldConfig: FieldConfig | null;
  distances: Distance[];
  createdAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  distanceId: string;
  fullName: string;
  phone: string;
  gender: string | null;
  email: string;
  dob: string;
  emergencyName: string | null;
  emergencyPhone: string | null;
  idNumber: string | null;
  shirtSize: string | null;
  bloodType: string | null;
  medicalConditions: string | null;
  bibNumber: number | null;
  disclaimerSignature: string | null;
  disclaimerSignedAt: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
  event: Event;
  distance: Distance;
  payment: Payment | null;
  teamMembers: TeamMember[];
}

export interface Payment {
  id: string;
  registrationId: string;
  amount: number;
  payosOrderCode: string | null;
  checkoutUrl: string | null;
  qrCode: string | null;
  payosRef: string | null;
  status: "PENDING" | "PAID" | "EXPIRED";
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PaymentResponse {
  payment: Payment;
  checkoutUrl: string | null;
  qrCode: string | null;
  bankBin: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  description: string;
}
