import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { RichTextEditor } from "@/components/RichTextEditor";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type Event, type FieldConfig, type FieldVisibility, type CustomFieldDef, type CustomFieldType } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Loader2, Calendar, MapPin, Upload, Settings2, ChevronUp, ChevronDown } from "lucide-react";

type CustomFieldForm = Omit<CustomFieldDef, "eventId"> & { id?: string };

const FIELD_CONFIG_ITEMS: { key: keyof FieldConfig; label: string }[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "gender", label: "Giới tính" },
  { key: "dob", label: "Ngày sinh" },
  { key: "phone", label: "Số điện thoại" },
  { key: "email", label: "Email" },
  { key: "idNumber", label: "Số CCCD" },
  { key: "shirtSize", label: "Size áo" },
  { key: "bloodType", label: "Nhóm máu" },
  { key: "medicalConditions", label: "Bệnh lý" },
  { key: "emergencyName", label: "Tên liên hệ khẩn cấp" },
  { key: "emergencyPhone", label: "SDT liên hệ khẩn cấp" },
  { key: "address", label: "Địa chỉ" },
  { key: "nationality", label: "Quốc tịch" },
];

const DEFAULT_FIELD_CONFIG: FieldConfig = {
  fullName: "required",
  gender: "hidden",
  dob: "required",
  phone: "required",
  email: "required",
  idNumber: "hidden",
  shirtSize: "hidden",
  bloodType: "hidden",
  medicalConditions: "hidden",
  emergencyName: "required",
  emergencyPhone: "required",
  address: "hidden",
  nationality: "hidden",
};

const MEMBER_FIELD_CONFIG_ITEMS: { key: keyof FieldConfig; label: string }[] = [
  { key: "phone", label: "Số điện thoại" },
  { key: "email", label: "Email" },
  { key: "gender", label: "Giới tính" },
  { key: "dob", label: "Ngày sinh" },
  { key: "idNumber", label: "Số CCCD" },
  { key: "shirtSize", label: "Size áo" },
  { key: "bloodType", label: "Nhóm máu" },
  { key: "medicalConditions", label: "Bệnh lý" },
  { key: "emergencyName", label: "Tên liên hệ khẩn cấp" },
  { key: "emergencyPhone", label: "SDT liên hệ khẩn cấp" },
  { key: "address", label: "Địa chỉ" },
  { key: "nationality", label: "Quốc tịch" },
];

const DEFAULT_MEMBER_FIELD_CONFIG: FieldConfig = {
  phone: "required",
  email: "optional",
  gender: "optional",
  dob: "required",
  idNumber: "optional",
  shirtSize: "optional",
  bloodType: "hidden",
  medicalConditions: "hidden",
  emergencyName: "optional",
  emergencyPhone: "optional",
  address: "hidden",
  nationality: "hidden",
};

const distanceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Bắt buộc"),
  price: z.number().min(0, "Phải ≥ 0"),
  maxSlots: z.number().int().positive("Phải > 0"),
  bibStart: z.number().int().positive("Phải > 0"),
  bibEnd: z.number().int().positive("Phải > 0"),
  type: z.enum(["SOLO", "RELAY"]),
  teamSize: z.number().int().min(2, "Tối thiểu 2 thành viên").optional().nullable(),
});

const eventSchema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Chỉ dùng chữ thường, số, dấu gạch"),
  description: z.string().min(1, "Bắt buộc"),
  rules: z.string().optional(),
  disclaimer: z.string().optional(),
  imageUrl: z.string().optional(),
  shirtSizeImageUrl: z.string().optional(),
  raceKitImageUrl: z.string().optional(),
  raceKitDescription: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "PRIVATE"]),
  password: z.string().optional(),
  allowMultipleRegistrations: z.boolean(),
  allowGuestRegistration: z.boolean(),
  requireDisclaimer: z.boolean(),
  requireBibSpin: z.boolean(),
  distances: z.array(distanceSchema).min(1, "Cần ít nhất 1 cự ly"),
});

type FormData = z.infer<typeof eventSchema>;

export function AdminEventsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["admin-events"],
    queryFn: () => api.get("/events/admin/all").then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: "DRAFT", password: "", shirtSizeImageUrl: "", raceKitImageUrl: "", raceKitDescription: "", allowMultipleRegistrations: false, allowGuestRegistration: false, requireDisclaimer: true, requireBibSpin: true, distances: [{ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "distances" });
  const [uploading, setUploading] = useState(false);
  const [uploadingRace, setUploadingRace] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [shirtUploadedUrls, setShirtUploadedUrls] = useState<string[]>([]);
  const [raceKitUploadedUrls, setRaceKitUploadedUrls] = useState<string[]>([]);
  const [coverUploadedUrl, setCoverUploadedUrl] = useState("");
  const shirtInputRef = useRef<HTMLInputElement>(null);
  const raceKitInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [shirtSizeUrl, setShirtSizeUrl] = useState("");
  const [raceKitUrl, setRaceKitUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>({ ...DEFAULT_FIELD_CONFIG });
  const [memberFieldConfigs, setMemberFieldConfigs] = useState<(FieldConfig | null)[]>([]);
  const [memberFieldModalIndex, setMemberFieldModalIndex] = useState<number | null>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldForm[]>([]);

  const openCreate = () => {
    reset({ status: "DRAFT", password: "", raceKitDescription: "", allowMultipleRegistrations: false, allowGuestRegistration: false, requireDisclaimer: true, requireBibSpin: true, distances: [{ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100, type: "SOLO", teamSize: null }] });
    setShirtSizeUrl("");
    setRaceKitUrl("");
    setCoverUrl("");
    setShirtUploadedUrls([]);
    setRaceKitUploadedUrls([]);
    setCoverUploadedUrl("");
    setFieldConfig({ ...DEFAULT_FIELD_CONFIG });
    setMemberFieldConfigs([null]);
    setCustomFieldDefs([]);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (event: Event) => {
    reset({
      name: event.name,
      slug: event.slug,
      description: event.description,
      rules: event.rules ?? "",
      disclaimer: event.disclaimer ?? "",
      imageUrl: event.imageUrl ?? "",
      shirtSizeImageUrl: (event as any).shirtSizeImageUrl ?? "",
      raceKitImageUrl: (event as any).raceKitImageUrl ?? "",
      raceKitDescription: (event as any).raceKitDescription ?? "",
      location: event.location ?? "",
      eventDate: event.eventDate ? event.eventDate.slice(0, 10) : "",
      status: event.status,
      password: event.password ?? "",
      allowMultipleRegistrations: (event as any).allowMultipleRegistrations ?? false,
      allowGuestRegistration: (event as any).allowGuestRegistration ?? false,
      requireDisclaimer: (event as any).requireDisclaimer ?? true,
      requireBibSpin: (event as any).requireBibSpin ?? true,
      distances: event.distances.map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        maxSlots: d.maxSlots,
        bibStart: d.bibStart,
        bibEnd: d.bibEnd,
        type: d.type ?? "SOLO",
        teamSize: d.teamSize ?? null,
      })),
    });
    setShirtSizeUrl((event as any).shirtSizeImageUrl ?? "");
    setRaceKitUrl((event as any).raceKitImageUrl ?? "");
    setCoverUrl(event.imageUrl ?? "");
    setShirtUploadedUrls([]);
    setRaceKitUploadedUrls([]);
    setCoverUploadedUrl("");
    setFieldConfig({ ...DEFAULT_FIELD_CONFIG, ...(event.fieldConfig ?? {}) });
    setMemberFieldConfigs(event.distances.map((d) =>
      d.type === "RELAY" ? { ...DEFAULT_MEMBER_FIELD_CONFIG, ...(d.memberFieldConfig ?? {}) } : null
    ));
    setCustomFieldDefs((event.customFieldDefs ?? []).map((d) => ({
      id: d.id,
      label: d.label,
      type: d.type,
      options: d.options ?? null,
      required: d.required,
      includeInEmail: d.includeInEmail,
      includeInExport: d.includeInExport,
      order: d.order,
    })));
    setEditing(event);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing
        ? api.put(`/events/${editing.id}`, data).then((r) => r.data)
        : api.post("/events", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
  });

  const statusLabel = (s: string) => {
    if (s === "PUBLISHED") return { label: "Đang mở", variant: "success" as const };
    if (s === "CLOSED") return { label: "Đã đóng", variant: "secondary" as const };
    if (s === "PRIVATE") return { label: "Riêng tư", variant: "secondary" as const };
    return { label: "Nháp", variant: "outline" as const };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sự kiện</h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} sự kiện</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Tạo sự kiện</Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editing ? "Sửa sự kiện" : "Tạo sự kiện mới"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => {
              const payload = {
                ...d,
                imageUrl: coverUrl,
                shirtSizeImageUrl: shirtSizeUrl,
                raceKitImageUrl: raceKitUrl,
                fieldConfig,
                distances: d.distances.map((dist, i) => ({
                  ...dist,
                  memberFieldConfig: dist.type === "RELAY" ? (memberFieldConfigs[i] ?? DEFAULT_MEMBER_FIELD_CONFIG) : null,
                })),
                customFieldDefs: customFieldDefs.map((f, i) => ({ ...f, order: i })),
              };
              saveMutation.mutate(payload as any);
            })} className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tên sự kiện *</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Slug (URL) *</Label>
                  <Input {...register("slug")} placeholder="ten-su-kien-2025" />
                  {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Mô tả *</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Quy định</Label>
                  <textarea
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[60px] resize-none"
                    {...register("rules")}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Bản miễn trừ trách nhiệm</Label>
                  <textarea
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[100px] resize-none"
                    placeholder="Nội dung miễn trừ trách nhiệm (người đăng ký sẽ phải đọc và ký sau khi thanh toán)"
                    {...register("disclaimer")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Địa điểm</Label>
                  <Input {...register("location")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngày tổ chức</Label>
                  <Input type="date" {...register("eventDate")} />
                </div>
                {/* Cover image — full row */}
                <div className="space-y-2 md:col-span-2 border rounded-xl p-4 bg-gray-50">
                  <Label className="text-sm font-medium">Ảnh bìa sự kiện</Label>
                  <div className="flex gap-2">
                    <Input
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ml-1.5">{uploadingCover ? "Đang tải..." : "Tải ảnh lên"}</span>
                    </Button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingCover(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                          const url = res.data.url as string;
                          setCoverUrl(url);
                          setCoverUploadedUrl(url);
                        } catch (err) {
                          console.error(err);
                          alert("Upload thất bại");
                        } finally {
                          setUploadingCover(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  {coverUploadedUrl && (
                    <img src={coverUploadedUrl} alt="Cover preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                  )}
                </div>
                {/* Shirt size image — full row */}
                <div className="space-y-2 md:col-span-2 border rounded-xl p-4 bg-gray-50">
                  <Label className="text-sm font-medium">Ảnh bảng size áo</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shirtSizeUrl}
                      onChange={(e) => setShirtSizeUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={uploading}
                      onClick={() => shirtInputRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ml-1.5">{uploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                    </Button>
                    <input
                      ref={shirtInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        setUploading(true);
                        try {
                          const urls = await Promise.all(files.map(async (f) => {
                            const fd = new FormData();
                            fd.append("file", f);
                            const res = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                            return res.data.url as string;
                          }));
                          setShirtSizeUrl(urls.join(","));
                          setShirtUploadedUrls(urls);
                        } catch (err) {
                          console.error(err);
                          alert("Upload thất bại");
                        } finally {
                          setUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  {shirtUploadedUrls.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Đã tải lên {shirtUploadedUrls.length} ảnh — bấm để chọn URL:</p>
                      {shirtUploadedUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setShirtSizeUrl(url)}
                          className="block w-full text-left text-xs text-indigo-600 hover:text-indigo-800 truncate bg-white border rounded px-2 py-1"
                        >
                          {url}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Race kit image + description — full row */}
                <div className="space-y-2 md:col-span-2 border rounded-xl p-4 bg-gray-50">
                  <Label className="text-sm font-medium">Race Kit</Label>
                  <div className="flex gap-2">
                    <Input
                      value={raceKitUrl}
                      onChange={(e) => setRaceKitUrl(e.target.value)}
                      placeholder="https://... (ảnh race kit)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={uploadingRace}
                      onClick={() => raceKitInputRef.current?.click()}
                    >
                      {uploadingRace ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ml-1.5">{uploadingRace ? "Đang tải..." : "Tải ảnh lên"}</span>
                    </Button>
                    <input
                      ref={raceKitInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        setUploadingRace(true);
                        try {
                          const urls = await Promise.all(files.map(async (f) => {
                            const fd = new FormData();
                            fd.append("file", f);
                            const res = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                            return res.data.url as string;
                          }));
                          setRaceKitUrl(urls.join(","));
                          setRaceKitUploadedUrls(urls);
                        } catch (err) {
                          console.error(err);
                          alert("Upload thất bại");
                        } finally {
                          setUploadingRace(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  {raceKitUploadedUrls.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Đã tải lên {raceKitUploadedUrls.length} ảnh — bấm để chọn URL:</p>
                      {raceKitUploadedUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRaceKitUrl(url)}
                          className="block w-full text-left text-xs text-indigo-600 hover:text-indigo-800 truncate bg-white border rounded px-2 py-1"
                        >
                          {url}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 pt-1">
                    <Label className="text-xs text-gray-500">Mô tả Race Kit</Label>
                    <textarea
                      className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[60px] resize-none"
                      placeholder="Mô tả nội dung race kit..."
                      {...register("raceKitDescription")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Trạng thái</Label>
                  <Select value={watch("status")} onValueChange={(v: any) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Nháp</SelectItem>
                      <SelectItem value="PUBLISHED">Đang mở</SelectItem>
                      <SelectItem value="CLOSED">Đã đóng</SelectItem>
                      <SelectItem value="PRIVATE">Riêng tư (có mật khẩu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {watch("status") === "PRIVATE" && (
                  <div className="space-y-1.5">
                    <Label>Mật khẩu sự kiện *</Label>
                    <Input
                      {...register("password")}
                      type="text"
                      placeholder="Nhập mật khẩu để truy cập sự kiện..."
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Cho phép đăng ký nhiều lần</Label>
                  <Select
                    value={watch("allowMultipleRegistrations") ? "yes" : "no"}
                    onValueChange={(v) => setValue("allowMultipleRegistrations", v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Không — mỗi user 1 lần</SelectItem>
                      <SelectItem value="yes">Có — không giới hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isSuperAdmin && (
                  <div className="space-y-1.5">
                    <Label>Cho phép đăng ký không cần đăng nhập</Label>
                    <Select
                      value={watch("allowGuestRegistration") ? "yes" : "no"}
                      onValueChange={(v) => setValue("allowGuestRegistration", v === "yes")}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">Không — yêu cầu đăng nhập</SelectItem>
                        <SelectItem value="yes">Có — cho phép đăng ký khách</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Yêu cầu ký miễn trừ trách nhiệm</Label>
                  <Select
                    value={watch("requireDisclaimer") ? "yes" : "no"}
                    onValueChange={(v) => setValue("requireDisclaimer", v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Có — người dùng phải ký</SelectItem>
                      <SelectItem value="no">Không — bỏ qua bước ký</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Yêu cầu quay số BIB</Label>
                  <Select
                    value={watch("requireBibSpin") ? "yes" : "no"}
                    onValueChange={(v) => setValue("requireBibSpin", v === "yes")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Có — người dùng tự quay BIB</SelectItem>
                      <SelectItem value="no">Không — bỏ qua bước quay BIB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field config */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-base">Cấu hình form đăng ký</Label>
                <p className="text-xs text-gray-400">Chọn trạng thái hiển thị cho từng trường trong form đăng ký người tham gia</p>
                <div className="space-y-2">
                  {FIELD_CONFIG_ITEMS.map(({ key, label }) => {
                    const current = fieldConfig[key] ?? DEFAULT_FIELD_CONFIG[key] ?? "hidden";
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 min-w-0 flex-1 truncate">{label}</span>
                        <div className="flex rounded-lg border overflow-hidden shrink-0 text-xs font-medium">
                          {(["required", "optional", "hidden"] as FieldVisibility[]).map((vis) => (
                            <button
                              key={vis}
                              type="button"
                              onClick={() => setFieldConfig((prev) => ({ ...prev, [key]: vis }))}
                              className={`px-2.5 py-1 transition-colors ${
                                current === vis
                                  ? vis === "required"
                                    ? "bg-indigo-600 text-white"
                                    : vis === "optional"
                                    ? "bg-amber-500 text-white"
                                    : "bg-gray-400 text-white"
                                  : "bg-white text-gray-400 hover:bg-gray-50"
                              }`}
                            >
                              {vis === "required" ? "Bắt buộc" : vis === "optional" ? "Tùy chọn" : "Ẩn"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distances */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Các cự ly</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    append({ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100, type: "SOLO", teamSize: null });
                    setMemberFieldConfigs((prev) => [...prev, null]);
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm cự ly
                  </Button>
                </div>
                {errors.distances && <p className="text-xs text-red-500 mb-2">{errors.distances.message}</p>}
                {fields.map((field, i) => (
                  <div key={field.id} className="border rounded-xl p-3 mb-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Cự ly {i + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => {
                          remove(i);
                          setMemberFieldConfigs((prev) => prev.filter((_, idx) => idx !== i));
                        }} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
                      <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label className="text-xs">Tên</Label>
                        <Input className="h-8 text-sm" {...register(`distances.${i}.name`)} placeholder="10KM" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Loại</Label>
                        <Select
                          value={watch(`distances.${i}.type`) ?? "SOLO"}
                          onValueChange={(v) => {
                            setValue(`distances.${i}.type`, v as "SOLO" | "RELAY");
                            if (v === "RELAY") {
                              setMemberFieldConfigs((prev) => {
                                const next = [...prev];
                                next[i] = next[i] ?? { ...DEFAULT_MEMBER_FIELD_CONFIG };
                                return next;
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOLO">Solo</SelectItem>
                            <SelectItem value="RELAY">Nhóm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {watch(`distances.${i}.type`) === "RELAY" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Số TV</Label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={watch(`distances.${i}.teamSize`) == null}
                              onChange={(e) => setValue(`distances.${i}.teamSize`, e.target.checked ? null : 2)}
                            />
                            <span className="text-xs text-gray-600">Tùy chọn (≤6)</span>
                          </label>
                          {watch(`distances.${i}.teamSize`) != null && (
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              placeholder="4"
                              min={2}
                              max={6}
                              value={watch(`distances.${i}.teamSize`) ?? ""}
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setValue(`distances.${i}.teamSize`, isNaN(v) ? 2 : v);
                              }}
                            />
                          )}
                          {errors.distances?.[i]?.teamSize && <p className="text-xs text-red-500">{errors.distances[i].teamSize?.message}</p>}
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Giá (VNĐ)</Label>
                        <Input className="h-8 text-sm" type="number" {...register(`distances.${i}.price`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max slot</Label>
                        <Input className="h-8 text-sm" type="number" {...register(`distances.${i}.maxSlots`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">BIB từ</Label>
                        <Input className="h-8 text-sm" type="number" {...register(`distances.${i}.bibStart`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">BIB đến</Label>
                        <Input className="h-8 text-sm" type="number" {...register(`distances.${i}.bibEnd`, { valueAsNumber: true })} />
                      </div>
                    </div>
                    {watch(`distances.${i}.type`) === "RELAY" && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setMemberFieldModalIndex(i)}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Cấu hình form thành viên
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Fields */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Trường tùy chỉnh</Label>
                    <p className="text-xs text-gray-400 mt-0.5">Thêm thông tin bổ sung cho form đăng ký</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCustomFieldDefs((prev) => [...prev, {
                      label: "",
                      type: "TEXT" as CustomFieldType,
                      options: null,
                      required: false,
                      includeInEmail: false,
                      includeInExport: true,
                      order: prev.length,
                    } as CustomFieldForm])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm trường
                  </Button>
                </div>
                {customFieldDefs.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2">Chưa có trường tùy chỉnh nào.</p>
                )}
                {customFieldDefs.map((field, i) => (
                  <div key={i} className="border rounded-xl p-3 bg-gray-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Trường {i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={i === 0} onClick={() => setCustomFieldDefs((prev) => {
                          const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next;
                        })} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" disabled={i === customFieldDefs.length - 1} onClick={() => setCustomFieldDefs((prev) => {
                          const next = [...prev]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; return next;
                        })} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setCustomFieldDefs((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-1 text-red-400 hover:text-red-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tên trường *</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="VD: Tên công ty"
                          value={field.label}
                          onChange={(e) => setCustomFieldDefs((prev) => {
                            const next = [...prev]; next[i] = { ...next[i], label: e.target.value }; return next;
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Loại</Label>
                        <Select value={field.type} onValueChange={(v) => setCustomFieldDefs((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], type: v as CustomFieldType, options: (v === "SELECT" || v === "CHECKBOX") ? (next[i].options ?? []) : null };
                          return next;
                        })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Văn bản</SelectItem>
                            <SelectItem value="NUMBER">Số</SelectItem>
                            <SelectItem value="SELECT">Chọn một</SelectItem>
                            <SelectItem value="CHECKBOX">Chọn nhiều</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(field.type === "SELECT" || field.type === "CHECKBOX") && (
                      <div className="space-y-1">
                        <Label className="text-xs">Các lựa chọn</Label>
                        <div className="space-y-1">
                          {(field.options ?? []).map((opt, oi) => (
                            <div key={oi} className="flex gap-1">
                              <Input
                                className="h-7 text-sm"
                                placeholder={`Option ${oi + 1}`}
                                value={opt}
                                onChange={(e) => setCustomFieldDefs((prev) => {
                                  const next = [...prev];
                                  const opts = [...(next[i].options ?? [])];
                                  opts[oi] = e.target.value;
                                  next[i] = { ...next[i], options: opts };
                                  return next;
                                })}
                              />
                              <button
                                type="button"
                                onClick={() => setCustomFieldDefs((prev) => {
                                  const next = [...prev];
                                  const opts = (next[i].options ?? []).filter((_, idx) => idx !== oi);
                                  next[i] = { ...next[i], options: opts };
                                  return next;
                                })}
                                className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCustomFieldDefs((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], options: [...(next[i].options ?? []), ""] };
                              return next;
                            })}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-0.5"
                          >
                            <Plus className="h-3 w-3" /> Thêm option
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-4 flex-wrap">
                      {([
                        { key: "required", label: "Bắt buộc" },
                        { key: "includeInEmail", label: "Trong email" },
                        { key: "includeInExport", label: "Trong CSV" },
                      ] as const).map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!field[key]}
                            onChange={(e) => setCustomFieldDefs((prev) => {
                              const next = [...prev]; next[i] = { ...next[i], [key]: e.target.checked }; return next;
                            })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-red-500 text-center">
                  {(saveMutation.error as any)?.response?.data?.error ?? "Lỗi lưu dữ liệu"}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Member field config modal */}
      {memberFieldModalIndex !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-base">Cấu hình form thành viên</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cự ly {memberFieldModalIndex + 1} — Nhóm</p>
              </div>
              <button onClick={() => setMemberFieldModalIndex(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-xs text-gray-400 mb-3">Họ tên thành viên luôn bắt buộc. Các trường còn lại có thể tùy chỉnh.</p>
              {MEMBER_FIELD_CONFIG_ITEMS.map(({ key, label }) => {
                const cfg = memberFieldConfigs[memberFieldModalIndex] ?? DEFAULT_MEMBER_FIELD_CONFIG;
                const current = cfg[key] ?? DEFAULT_MEMBER_FIELD_CONFIG[key] ?? "hidden";
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 flex-1">{label}</span>
                    <div className="flex rounded-lg border overflow-hidden shrink-0 text-xs font-medium">
                      {(["required", "optional", "hidden"] as FieldVisibility[]).map((vis) => (
                        <button
                          key={vis}
                          type="button"
                          onClick={() => setMemberFieldConfigs((prev) => {
                            const next = [...prev];
                            next[memberFieldModalIndex] = { ...(next[memberFieldModalIndex] ?? DEFAULT_MEMBER_FIELD_CONFIG), [key]: vis };
                            return next;
                          })}
                          className={`px-2.5 py-1 transition-colors ${
                            current === vis
                              ? vis === "required" ? "bg-indigo-600 text-white"
                                : vis === "optional" ? "bg-amber-500 text-white"
                                : "bg-gray-400 text-white"
                              : "bg-white text-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          {vis === "required" ? "Bắt buộc" : vis === "optional" ? "Tùy chọn" : "Ẩn"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end p-4 border-t">
              <Button onClick={() => setMemberFieldModalIndex(null)}>Xong</Button>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const { label, variant } = statusLabel(event.status);
            return (
              <div key={event.id} className="bg-white rounded-2xl border p-5 flex items-start gap-4">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt="" className="w-20 h-14 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 bg-indigo-100 rounded-xl flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{event.name}</span>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    {event.eventDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(event.eventDate)}</span>}
                    {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
                    <span>{event.distances?.length ?? 0} cự ly</span>
                    <span>{event._count?.registrations ?? 0} đăng ký</span>
                    {event.allowMultipleRegistrations && (
                      <span className="text-amber-500">Đăng ký nhiều lần</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(event)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => confirm("Xóa sự kiện này?") && deleteMutation.mutate(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có sự kiện nào</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
