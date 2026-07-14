import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, userApi, type Event, type FieldConfig, type FieldVisibility, type CustomFieldDef } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { MEMBER_FIELD_DEFS, GENDERS, SHIRT_SIZES, BLOOD_TYPES, COUNTRIES, type MemberFieldDef } from "@/lib/memberFields";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Users, Plus, X } from "lucide-react";

const DEFAULT_FIELD_CONFIG: Required<FieldConfig> = {
  fullName: "required",
  phone: "required",
  gender: "hidden",
  email: "required",
  dob: "required",
  idNumber: "hidden",
  shirtSize: "hidden",
  bloodType: "hidden",
  medicalConditions: "hidden",
  emergencyName: "required",
  emergencyPhone: "required",
  address: "hidden",
  nationality: "hidden",
};

function vis(cfg: FieldConfig, key: keyof FieldConfig): FieldVisibility {
  return cfg[key] ?? DEFAULT_FIELD_CONFIG[key];
}

type MemberFormData = {
  fullName: string;
  phone: string;
  gender?: string;
  email?: string;
  dob?: string;
  idNumber?: string;
  shirtSize?: string;
  bloodType?: string;
  medicalConditions?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  address?: string;
  nationality?: string;
};

type FormData = {
  distanceId: string;
  disclaimer: boolean;
  fullName?: string;
  phone?: string;
  gender?: string;
  email?: string;
  dob?: string;
  idNumber?: string;
  shirtSize?: string;
  bloodType?: string;
  medicalConditions?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  address?: string;
  nationality?: string;
  teamMembers?: MemberFormData[];
};

const str = (msg: string) => z.string({ error: msg });

function buildMemberItemSchema(memberCfg: FieldConfig) {
  const phoneVis = vis(memberCfg, "phone");
  const emailVis = vis(memberCfg, "email");
  const fields: Record<string, z.ZodTypeAny> = {
    fullName: str("Vui lòng nhập họ tên").min(2, "Họ tên phải có ít nhất 2 ký tự"),
    phone: phoneVis === "hidden"
      ? z.string().optional()
      : phoneVis === "required"
        ? str("Vui lòng nhập số điện thoại").min(9, "Số điện thoại không hợp lệ")
        : z.string().optional(),
    email: emailVis === "hidden"
      ? z.string().optional()
      : emailVis === "required"
        ? str("Vui lòng nhập email").email("Email không hợp lệ")
        : z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  };
  for (const def of MEMBER_FIELD_DEFS) {
    const visibility = vis(memberCfg, def.configKey);
    if (visibility === "required") {
      const msg = def.errorMessage ?? `Vui lòng nhập ${def.label.toLowerCase()}`;
      const minLen = def.minLength ?? 1;
      fields[def.key] = str(msg).min(minLen, msg);
    } else {
      fields[def.key] = z.string().optional();
    }
  }
  return z.object(fields);
}

function buildSchema(cfg: FieldConfig, isRelay: boolean, memberCfg: FieldConfig) {
  const req = (key: keyof FieldConfig) => vis(cfg, key) === "required";
  const show = (key: keyof FieldConfig) => vis(cfg, key) !== "hidden";
  const memberItemSchema = buildMemberItemSchema(memberCfg);

  const base = {
    distanceId: str("Vui lòng chọn cự ly").min(1, "Vui lòng chọn cự ly"),
    disclaimer: z.boolean().refine((v) => v, "Bạn phải đồng ý với điều khoản"),
  };

  const registrantFields = {
    fullName: show("fullName")
      ? req("fullName") ? str("Vui lòng nhập họ tên").min(2, "Họ tên phải có ít nhất 2 ký tự") : z.string().optional()
      : z.string().optional(),
    phone: show("phone")
      ? req("phone") ? str("Vui lòng nhập số điện thoại").min(9, "Số điện thoại không hợp lệ") : z.string().optional()
      : z.string().optional(),
    gender: show("gender")
      ? req("gender") ? str("Vui lòng chọn giới tính").min(1, "Vui lòng chọn giới tính") : z.string().optional()
      : z.string().optional(),
    email: show("email")
      ? req("email")
        ? str("Vui lòng nhập email").email("Email không hợp lệ")
        : z.string().email("Email không hợp lệ").optional().or(z.literal(""))
      : z.string().optional(),
    dob: show("dob")
      ? req("dob") ? str("Vui lòng nhập ngày sinh").min(1, "Vui lòng nhập ngày sinh") : z.string().optional()
      : z.string().optional(),
    idNumber: show("idNumber")
      ? req("idNumber") ? str("Vui lòng nhập số CCCD").min(1, "Vui lòng nhập số CCCD") : z.string().optional()
      : z.string().optional(),
    shirtSize: show("shirtSize")
      ? req("shirtSize") ? str("Vui lòng chọn size áo").min(1, "Vui lòng chọn size áo") : z.string().optional()
      : z.string().optional(),
    bloodType: show("bloodType")
      ? req("bloodType") ? str("Vui lòng chọn nhóm máu").min(1, "Vui lòng chọn nhóm máu") : z.string().optional()
      : z.string().optional(),
    medicalConditions: show("medicalConditions")
      ? req("medicalConditions") ? str("Vui lòng nhập thông tin bệnh lý").min(1, "Vui lòng nhập thông tin bệnh lý") : z.string().optional()
      : z.string().optional(),
    emergencyName: show("emergencyName")
      ? req("emergencyName") ? str("Vui lòng nhập tên người liên hệ khẩn cấp").min(2, "Vui lòng nhập tên người liên hệ khẩn cấp") : z.string().optional()
      : z.string().optional(),
    emergencyPhone: show("emergencyPhone")
      ? req("emergencyPhone") ? str("Vui lòng nhập số điện thoại liên hệ khẩn cấp").min(9, "Số điện thoại không hợp lệ") : z.string().optional()
      : z.string().optional(),
    address: show("address")
      ? req("address") ? str("Vui lòng nhập địa chỉ").min(1, "Vui lòng nhập địa chỉ") : z.string().optional()
      : z.string().optional(),
    nationality: show("nationality")
      ? req("nationality") ? str("Vui lòng chọn quốc tịch").min(1, "Vui lòng chọn quốc tịch") : z.string().optional()
      : z.string().optional(),
  };

  return z.object({
    ...base,
    ...registrantFields,
    teamMembers: isRelay ? z.array(memberItemSchema) : z.array(memberItemSchema).optional(),
  });
}

function MemberFieldInput({
  def, index, register, watch, setValue, errors, show, fieldLabel,
}: {
  def: MemberFieldDef;
  index: number;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  show: (key: keyof FieldConfig) => boolean;
  fieldLabel: (key: keyof FieldConfig, defaultLabel: string) => React.ReactNode;
}) {
  if (!show(def.configKey)) return null;
  const fieldPath = `teamMembers.${index}.${def.key}`;
  const error = errors.teamMembers?.[index]?.[def.key];

  return (
    <>
      {def.sectionLabel && (
        <div className="space-y-3 pt-2 border-t border-indigo-100">
          <p className="text-xs font-medium text-gray-600">{def.sectionLabel}</p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-sm">{fieldLabel(def.configKey, def.label)}</Label>
        {def.type === "select" ? (
          <Select
            value={watch(fieldPath) ?? ""}
            onValueChange={(v: string) => setValue(fieldPath, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Chọn ${def.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : def.type === "textarea" ? (
          <textarea
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[70px] resize-none"
            placeholder={def.placeholder}
            {...register(fieldPath)}
          />
        ) : (
          <Input type={def.type} placeholder={def.placeholder} {...register(fieldPath)} />
        )}
        {error && <p className="text-xs text-red-500">{error.message}</p>}
      </div>
    </>
  );
}

const EMPTY_MEMBER = {
  fullName: "", phone: "", email: "",
  ...Object.fromEntries(MEMBER_FIELD_DEFS.map((f) => [f.key, f.defaultValue])),
};

export function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: userLoading } = useUser();

  const storedPassword = slug ? sessionStorage.getItem(`event-pw-${slug}`) : null;

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<Event>({
    queryKey: ["event", slug, storedPassword],
    queryFn: () => {
      const config = storedPassword ? { headers: { "x-event-password": storedPassword } } : {};
      return api.get(`/events/${slug}`, config).then((r) => r.data);
    },
    retry: false,
  });

  const eventErrCode = (eventError as any)?.response?.data?.error as string | undefined;

  // Redirect to event page if private and not unlocked
  useEffect(() => {
    if (eventErrCode === "PRIVATE_EVENT" || eventErrCode === "WRONG_PASSWORD") {
      navigate(`/events/${slug}`, { replace: true });
    }
  }, [eventErrCode, slug]);

  // Redirect to login if not authenticated and event doesn't allow guest registration
  useEffect(() => {
    if (!userLoading && !user && event && !event.allowGuestRegistration) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [user, userLoading, event]);

  if (userLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!event) return null;
  if (!event.allowGuestRegistration && !user) return null;

  return <RegisterForm event={event} user={user ?? null} />;
}

function RegisterForm({ event, user }: { event: Event; user: import("@/lib/api").User | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = (event.fieldConfig as FieldConfig) ?? {};
  const show = (key: keyof FieldConfig) => vis(cfg, key) !== "hidden";
  const isReq = (key: keyof FieldConfig) => vis(cfg, key) === "required";

  const customDefs: CustomFieldDef[] = event.customFieldDefs ?? [];
  const [customValues, setCustomValues] = useState<Record<string, string | string[]>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const isRelayRef = useRef(false);
  const cfgRef = useRef(cfg);
  const memberCfgRef = useRef<FieldConfig>({});
  cfgRef.current = cfg;

  const resolver = useCallback(
    ((data: any, ctx: any, opts: any) =>
      zodResolver(buildSchema(cfgRef.current, isRelayRef.current, memberCfgRef.current))(data, ctx, opts)) as any,
    []
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver });

  const { fields: memberFields, replace: replaceMembers, append: appendMember, remove: removeMember } = useFieldArray({
    control,
    name: "teamMembers",
  });

  // Auto-fill from user profile (once on mount)
  const autoFilled = useRef(false);
  useEffect(() => {
    if (autoFilled.current || !user) return;
    autoFilled.current = true;
    if (user.fullName) setValue("fullName", user.fullName);
    if (user.phone) setValue("phone", user.phone);
    if (user.gender) setValue("gender", user.gender);
    if (user.email) setValue("email", user.email);
    if (user.dob) setValue("dob", user.dob.slice(0, 10));
    if (user.idNumber) setValue("idNumber", user.idNumber);
    if (user.shirtSize) setValue("shirtSize", user.shirtSize);
    if (user.bloodType) setValue("bloodType", user.bloodType);
    if (user.medicalConditions) setValue("medicalConditions", user.medicalConditions);
    if (user.emergencyName) setValue("emergencyName", user.emergencyName);
    if (user.emergencyPhone) setValue("emergencyPhone", user.emergencyPhone);
  }, []);

  const selectedDistanceId = watch("distanceId") ?? "";
  const selectedDistance = event.distances.find((d) => d.id === selectedDistanceId);
  const isRelay = selectedDistance?.type === "RELAY";
  const isFlexibleRelay = isRelay && selectedDistance?.teamSize == null;

  // Keep refs in sync with current render
  isRelayRef.current = isRelay;
  const memberCfg = (selectedDistance?.memberFieldConfig as FieldConfig) ?? {};
  const memberShow = (key: keyof FieldConfig) => vis(memberCfg, key) !== "hidden";
  const memberIsReq = (key: keyof FieldConfig) => vis(memberCfg, key) === "required";
  const memberFieldLabel = (key: keyof FieldConfig, defaultLabel: string) => (
    <>{defaultLabel}{memberIsReq(key) && <span className="text-red-500"> *</span>}</>
  );
  memberCfgRef.current = memberCfg;

  useEffect(() => {
    if (!selectedDistance) return;
    if (selectedDistance.type === "RELAY") {
      const size = selectedDistance.teamSize ?? 1;
      replaceMembers(Array.from({ length: size }, () => ({ ...EMPTY_MEMBER })));
    } else {
      replaceMembers([]);
    }
  }, [selectedDistanceId]);

  const mutation = useMutation({
    mutationFn: (data: Omit<FormData, "disclaimer">) =>
      userApi.post("/registrations", { ...data, eventId: event.id }).then((r) => r.data),
    onSuccess: (reg) => {
      if (reg.status === "PAID") {
        navigate(`/payment/${reg.id}/success?code=00`);
      } else {
        navigate(`/payment/${reg.id}`);
      }
    },
  });

  const onSubmit = (data: FormData) => {
    // Validate custom fields
    const errs: Record<string, string> = {};
    for (const def of customDefs) {
      const val = customValues[def.id];
      if (def.required) {
        if (!val || (Array.isArray(val) ? val.length === 0 : val.trim() === "")) {
          errs[def.id] = "Trường này là bắt buộc";
        }
      }
    }
    if (Object.keys(errs).length > 0) {
      setCustomErrors(errs);
      return;
    }
    setCustomErrors({});

    const customFieldValues = customDefs.map((def) => {
      const val = customValues[def.id] ?? "";
      return {
        fieldDefId: def.id,
        value: Array.isArray(val) ? JSON.stringify(val) : val,
      };
    }).filter((v) => v.value !== "" && v.value !== "[]");

    const { disclaimer: _d, ...rest } = data;
    mutation.mutate({ ...rest, customFieldValues } as any);
  };

  const fieldLabel = (key: keyof FieldConfig, defaultLabel: string) => (
    <>
      {defaultLabel}
      {isReq(key) && <span className="text-red-500"> *</span>}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to={`/events/${event.slug}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
          </Link>
        </Button>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{event.name}</h1>
          <p className="text-gray-500 text-sm mb-6">Điền thông tin đăng ký tham gia sự kiện</p>

          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-4">
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="font-medium underline">
                Đăng nhập
              </Link>{" "}
              để tự động điền thông tin và theo dõi đơn đăng ký của bạn.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Distance */}
            <div className="space-y-1.5">
              <Label>Cự ly <span className="text-red-500">*</span></Label>
              <Select
                value={selectedDistanceId}
                onValueChange={(v) => setValue("distanceId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cự ly tham gia" />
                </SelectTrigger>
                <SelectContent>
                  {event.distances.map((d) => {
                    const isFull = (d._count?.registrations ?? 0) >= d.maxSlots;
                    return (
                      <SelectItem key={d.id} value={d.id} disabled={isFull}>
                        {d.name}
                        {d.type === "RELAY" && (
                          <span className="ml-1 text-xs text-indigo-500">
                            {d.teamSize == null ? "(Nhóm tùy chọn)" : `(Nhóm ${d.teamSize} người)`}
                          </span>
                        )}
                        {" "}— {formatCurrency(d.price)}
                        {isFull && <span className="ml-2 text-xs text-red-400">Đã hết slot</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.distanceId && <p className="text-xs text-red-500">{errors.distanceId.message}</p>}
            </div>

            {/* ── Registrant / team-leader fields — driven by event fieldConfig ── */}
            {show("fullName") && (
              <div className="space-y-1.5">
                <Label>
                  {isRelay
                    ? <>Họ và tên đội trưởng{isReq("fullName") && <span className="text-red-500"> *</span>}</>
                    : fieldLabel("fullName", "Họ và tên")}
                </Label>
                <Input placeholder="Nguyễn Văn A" {...register("fullName")} />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>
            )}
            {show("phone") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("phone", "Số điện thoại")}</Label>
                <Input placeholder="0901234567" type="tel" {...register("phone")} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>
            )}
            {show("email") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("email", "Email")}</Label>
                <Input placeholder="email@example.com" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
            )}
            {show("gender") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("gender", "Giới tính")}</Label>
                <Select value={watch("gender") ?? ""} onValueChange={(v) => setValue("gender", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
              </div>
            )}
            {show("dob") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("dob", "Ngày sinh")}</Label>
                <Input type="date" {...register("dob")} />
                {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
              </div>
            )}
            {show("idNumber") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("idNumber", "Số CCCD")}</Label>
                <Input placeholder="012345678901" {...register("idNumber")} />
                {errors.idNumber && <p className="text-xs text-red-500">{errors.idNumber.message}</p>}
              </div>
            )}
            {show("shirtSize") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("shirtSize", "Size áo")}</Label>
                <Select value={watch("shirtSize") ?? ""} onValueChange={(v) => setValue("shirtSize", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn size áo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.shirtSize && <p className="text-xs text-red-500">{errors.shirtSize.message}</p>}
              </div>
            )}
            {show("bloodType") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("bloodType", "Nhóm máu")}</Label>
                <Select value={watch("bloodType") ?? ""} onValueChange={(v) => setValue("bloodType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm máu" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.bloodType && <p className="text-xs text-red-500">{errors.bloodType.message}</p>}
              </div>
            )}
            {show("medicalConditions") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("medicalConditions", "Bệnh lý")}</Label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[70px] resize-none"
                  placeholder="Các bệnh lý hoặc tình trạng sức khỏe cần lưu ý (nếu có)"
                  {...register("medicalConditions")}
                />
                {errors.medicalConditions && <p className="text-xs text-red-500">{errors.medicalConditions.message}</p>}
              </div>
            )}
            {show("address") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("address", "Địa chỉ")}</Label>
                <Input placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" {...register("address")} />
                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
              </div>
            )}
            {show("nationality") && (
              <div className="space-y-1.5">
                <Label>{fieldLabel("nationality", "Quốc tịch")}</Label>
                <Select value={watch("nationality") ?? ""} onValueChange={(v) => setValue("nationality", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn quốc tịch" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.nationality && <p className="text-xs text-red-500">{errors.nationality.message}</p>}
              </div>
            )}
            {(show("emergencyName") || show("emergencyPhone")) && (
              <div className="border-t pt-5">
                <p className="text-sm font-medium text-gray-700 mb-4">Người liên hệ khẩn cấp</p>
                <div className="space-y-4">
                  {show("emergencyName") && (
                    <div className="space-y-1.5">
                      <Label>{fieldLabel("emergencyName", "Họ tên")}</Label>
                      <Input placeholder="Nguyễn Thị B" {...register("emergencyName")} />
                      {errors.emergencyName && <p className="text-xs text-red-500">{errors.emergencyName.message}</p>}
                    </div>
                  )}
                  {show("emergencyPhone") && (
                    <div className="space-y-1.5">
                      <Label>{fieldLabel("emergencyPhone", "Số điện thoại")}</Label>
                      <Input placeholder="0901234567" type="tel" {...register("emergencyPhone")} />
                      {errors.emergencyPhone && <p className="text-xs text-red-500">{errors.emergencyPhone.message}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Team members (RELAY only) ── */}
            {isRelay && memberFields.length > 0 && (
              <div className="border-t pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm font-medium text-gray-700">
                      Thông tin thành viên đội{" "}
                      {isFlexibleRelay
                        ? `(${memberFields.length}/6 người)`
                        : `(${selectedDistance?.teamSize} người)`}
                    </p>
                  </div>
                  {isFlexibleRelay && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 text-indigo-600 border-indigo-200"
                      disabled={memberFields.length >= 6}
                      onClick={() => appendMember({ ...EMPTY_MEMBER })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Thêm thành viên
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  {memberFields.map((field, i) => (
                    <div key={field.id} className="border rounded-xl p-4 bg-indigo-50/40">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-indigo-700">Thành viên {i + 1}</p>
                        {isFlexibleRelay && memberFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMember(i)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {/* Always required */}
                        <div className="space-y-1.5">
                          <Label className="text-sm">Họ và tên <span className="text-red-500">*</span></Label>
                          <Input placeholder="Nguyễn Văn A" {...register(`teamMembers.${i}.fullName`)} />
                          {errors.teamMembers?.[i]?.fullName && (
                            <p className="text-xs text-red-500">{errors.teamMembers[i].fullName?.message}</p>
                          )}
                        </div>
                        {memberShow("phone") && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">{memberFieldLabel("phone", "Số điện thoại")}</Label>
                            <Input placeholder="0901234567" type="tel" {...register(`teamMembers.${i}.phone`)} />
                            {errors.teamMembers?.[i]?.phone && (
                              <p className="text-xs text-red-500">{errors.teamMembers[i].phone?.message}</p>
                            )}
                          </div>
                        )}

                        {/* memberFieldConfig-driven fields */}
                        {memberShow("email") && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">{memberFieldLabel("email", "Email")}</Label>
                            <Input placeholder="email@example.com" type="email" {...register(`teamMembers.${i}.email`)} />
                            {errors.teamMembers?.[i]?.email && (
                              <p className="text-xs text-red-500">{errors.teamMembers[i].email?.message}</p>
                            )}
                          </div>
                        )}
                        {MEMBER_FIELD_DEFS.map((def) => (
                          <MemberFieldInput
                            key={def.key}
                            def={def}
                            index={i}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                            errors={errors}
                            show={memberShow}
                            fieldLabel={memberFieldLabel}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {customDefs.length > 0 && (
              <div className="space-y-4 border-t pt-5">
                <p className="text-sm font-semibold text-gray-700">Thông tin bổ sung</p>
                {customDefs.map((def) => (
                  <div key={def.id} className="space-y-1.5">
                    <Label className="text-sm">
                      {def.label}{def.required && <span className="text-red-500"> *</span>}
                    </Label>
                    {def.type === "TEXT" && (
                      <Input
                        value={(customValues[def.id] as string) ?? ""}
                        onChange={(e) => setCustomValues((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      />
                    )}
                    {def.type === "NUMBER" && (
                      <Input
                        type="number"
                        value={(customValues[def.id] as string) ?? ""}
                        onChange={(e) => setCustomValues((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      />
                    )}
                    {def.type === "SELECT" && (
                      <Select
                        value={(customValues[def.id] as string) ?? ""}
                        onValueChange={(v) => setCustomValues((prev) => ({ ...prev, [def.id]: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn một..." /></SelectTrigger>
                        <SelectContent>
                          {(def.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {def.type === "CHECKBOX" && (
                      <div className="space-y-2">
                        {(def.options ?? []).map((opt) => {
                          const arr = (customValues[def.id] as string[]) ?? [];
                          return (
                            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={arr.includes(opt)}
                                onCheckedChange={(checked) => {
                                  setCustomValues((prev) => {
                                    const current = (prev[def.id] as string[]) ?? [];
                                    return {
                                      ...prev,
                                      [def.id]: checked ? [...current, opt] : current.filter((v) => v !== opt),
                                    };
                                  });
                                }}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {customErrors[def.id] && (
                      <p className="text-xs text-red-500">{customErrors[def.id]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="disclaimer"
                  checked={watch("disclaimer") ?? false}
                  onCheckedChange={(checked) => setValue("disclaimer", checked === true)}
                />
                <Label htmlFor="disclaimer" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                  Tôi đồng ý với <span className="text-indigo-600 font-medium">điều khoản và điều kiện</span>. Tôi tự nguyện tham gia sự kiện và miễn trách nhiệm cho ban tổ chức trong trường hợp xảy ra tai nạn không lường trước.
                </Label>
              </div>
              {errors.disclaimer && <p className="text-xs text-red-500 mt-2 ml-7">{errors.disclaimer.message}</p>}
            </div>

            {/* Submit */}
            <div className="pt-2">
              {selectedDistance && (
                <div className="flex justify-between text-sm mb-4 bg-indigo-50 rounded-xl p-3">
                  <span className="text-gray-600">
                    Phí đăng ký ({selectedDistance.name}
                    {isRelay && ` — Nhóm ${isFlexibleRelay ? `${memberFields.length} người` : `${selectedDistance.teamSize} người`}`})
                  </span>
                  <span className="font-bold text-indigo-600">{formatCurrency(selectedDistance.price)}</span>
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                ) : selectedDistance?.price === 0 ? (
                  "Đăng ký miễn phí"
                ) : (
                  "Tiếp tục để thanh toán"
                )}
              </Button>
              {mutation.isError && (
                (mutation.error as any)?.response?.data?.error === "ALREADY_REGISTERED" ? (
                  <div className="text-center mt-2">
                    <p className="text-xs text-amber-600">Bạn đã đăng ký sự kiện này rồi.</p>
                    <Link to="/account/bibs" className="text-xs text-indigo-600 underline">
                      Xem thông tin đăng ký của bạn →
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-red-500 text-center mt-2">
                    {(mutation.error as any)?.response?.data?.error ?? "Có lỗi xảy ra, vui lòng thử lại"}
                  </p>
                )
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
