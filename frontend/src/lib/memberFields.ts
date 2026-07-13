import type { LucideIcon } from "lucide-react";
import { Calendar, BadgeCheck, Shirt, Droplets, HeartPulse, Shield, CircleUser, MapPin, Globe } from "lucide-react";
import type { FieldConfig } from "@/lib/api";

export const GENDERS = ["Nam", "Nữ", "Khác"] as const;
export const SHIRT_SIZES = [
  "Nam - XS", "Nam - S", "Nam - M", "Nam - L", "Nam - XL", "Nam - XXL",
  "Nữ - XS", "Nữ - S", "Nữ - M", "Nữ - L", "Nữ - XL", "Nữ - XXL",
  "Kids - XS", "Kids - S", "Kids - M", "Kids - L", "Kids - XL", "Kids - XXL",
  "Kids - 4", "Kids - 5", "Kids - 6", "Kids - 7", "Kids - 8", "Kids - 9", "Kids - 10", "Kids - 11", "Kids - 12", "Kids - 13"
];
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Không biết"];
export const COUNTRIES = [
  "Việt Nam", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh",
  "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Yemen",
  "Zambia", "Zimbabwe",
] as const;

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
    key: "gender",
    label: "Giới tính",
    type: "select",
    defaultValue: "_none_",
    configKey: "gender",
    options: GENDERS,
    errorMessage: "Vui lòng chọn giới tính",
    displayIcon: CircleUser,
  },
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
    key: "address",
    label: "Địa chỉ",
    type: "text",
    defaultValue: "",
    configKey: "address",
    placeholder: "Số nhà, đường, quận/huyện, tỉnh/thành phố",
    errorMessage: "Vui lòng nhập địa chỉ",
    displayIcon: MapPin,
  },
  {
    key: "nationality",
    label: "Quốc tịch",
    type: "select",
    defaultValue: "_none_",
    configKey: "nationality",
    options: COUNTRIES,
    errorMessage: "Vui lòng chọn quốc tịch",
    displayIcon: Globe,
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
