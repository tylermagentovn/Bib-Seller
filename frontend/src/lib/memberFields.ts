import type { LucideIcon } from "lucide-react";
import { Calendar, BadgeCheck, Shirt, Droplets, HeartPulse, Shield } from "lucide-react";
import type { FieldConfig } from "@/lib/api";

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Không biết"];

export type MemberFieldType = "text" | "tel" | "date" | "select" | "textarea";

export interface MemberFieldDef {
  key: string;
  label: string;
  type: MemberFieldType;
  options?: readonly string[];
  defaultValue: string;
  configKey: keyof FieldConfig;
  placeholder?: string;
  minLength?: number;
  errorMessage?: string;
  sectionLabel?: string;
  displayIcon?: LucideIcon;
}

export const MEMBER_FIELD_DEFS: MemberFieldDef[] = [
  {
    key: "dob",
    label: "Ngày sinh",
    type: "date",
    defaultValue: "",
    configKey: "dob",
    errorMessage: "Vui lòng nhập ngày sinh",
    displayIcon: Calendar,
  },
  {
    key: "idNumber",
    label: "Số CCCD",
    type: "text",
    defaultValue: "",
    configKey: "idNumber",
    placeholder: "012345678901",
    errorMessage: "Vui lòng nhập số CCCD",
    displayIcon: BadgeCheck,
  },
  {
    key: "shirtSize",
    label: "Size áo",
    type: "select",
    defaultValue: "_none_",
    configKey: "shirtSize",
    options: SHIRT_SIZES,
    errorMessage: "Vui lòng chọn size áo",
    displayIcon: Shirt,
  },
  {
    key: "bloodType",
    label: "Nhóm máu",
    type: "select",
    defaultValue: "_none_",
    configKey: "bloodType",
    options: BLOOD_TYPES,
    errorMessage: "Vui lòng chọn nhóm máu",
    displayIcon: Droplets,
  },
  {
    key: "medicalConditions",
    label: "Bệnh lý",
    type: "textarea",
    defaultValue: "",
    configKey: "medicalConditions",
    placeholder: "Bệnh lý hoặc tình trạng sức khỏe cần lưu ý (nếu có)",
    errorMessage: "Vui lòng nhập thông tin bệnh lý",
    displayIcon: HeartPulse,
  },
  {
    key: "emergencyName",
    label: "Họ tên",
    type: "text",
    defaultValue: "",
    configKey: "emergencyName",
    placeholder: "Nguyễn Thị B",
    minLength: 2,
    errorMessage: "Vui lòng nhập tên người liên hệ",
    sectionLabel: "Người liên hệ khẩn cấp",
    displayIcon: Shield,
  },
  {
    key: "emergencyPhone",
    label: "Số điện thoại",
    type: "tel",
    defaultValue: "",
    configKey: "emergencyPhone",
    placeholder: "0901234567",
    minLength: 9,
    errorMessage: "Số điện thoại không hợp lệ",
    displayIcon: Shield,
  },
];

export function normalizeFieldValue(def: MemberFieldDef, value: string): string | null {
  if (def.type === "select") return value === "_none_" ? null : value || null;
  return value || null;
}

export function initFieldValue(def: MemberFieldDef, value: string | null): string {
  if (def.type === "select") return value ?? "_none_";
  if (def.key === "dob") return value ? value.slice(0, 10) : "";
  return value ?? "";
}
