import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type Event } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Loader2, Calendar, MapPin } from "lucide-react";

const distanceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Bắt buộc"),
  price: z.number().positive("Phải > 0"),
  maxSlots: z.number().int().positive("Phải > 0"),
  bibStart: z.number().int().positive("Phải > 0"),
  bibEnd: z.number().int().positive("Phải > 0"),
});

const eventSchema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Chỉ dùng chữ thường, số, dấu gạch"),
  description: z.string().min(1, "Bắt buộc"),
  rules: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  distances: z.array(distanceSchema).min(1, "Cần ít nhất 1 cự ly"),
});

type FormData = z.infer<typeof eventSchema>;

export function AdminEventsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["admin-events"],
    queryFn: () => api.get("/events/admin/all").then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: "DRAFT", distances: [{ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "distances" });

  const openCreate = () => {
    reset({ status: "DRAFT", distances: [{ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100 }] });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (event: Event) => {
    reset({
      name: event.name,
      slug: event.slug,
      description: event.description,
      rules: event.rules ?? "",
      imageUrl: event.imageUrl ?? "",
      location: event.location ?? "",
      eventDate: event.eventDate ? event.eventDate.slice(0, 10) : "",
      status: event.status,
      distances: event.distances.map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        maxSlots: d.maxSlots,
        bibStart: d.bibStart,
        bibEnd: d.bibEnd,
      })),
    });
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
            <form onSubmit={handleSubmit((d: FormData) => saveMutation.mutate(d))} className="p-5 space-y-4">
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
                  <textarea
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[80px] resize-none"
                    {...register("description")}
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
                <div className="space-y-1.5">
                  <Label>Địa điểm</Label>
                  <Input {...register("location")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngày tổ chức</Label>
                  <Input type="date" {...register("eventDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>URL hình ảnh</Label>
                  <Input {...register("imageUrl")} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Trạng thái</Label>
                  <Select value={watch("status")} onValueChange={(v: any) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Nháp</SelectItem>
                      <SelectItem value="PUBLISHED">Đang mở</SelectItem>
                      <SelectItem value="CLOSED">Đã đóng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Distances */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Các cự ly</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ name: "", price: 0, maxSlots: 100, bibStart: 1, bibEnd: 100 })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm cự ly
                  </Button>
                </div>
                {errors.distances && <p className="text-xs text-red-500 mb-2">{errors.distances.message}</p>}
                {fields.map((field, i) => (
                  <div key={field.id} className="border rounded-xl p-3 mb-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Cự ly {i + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
                      <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label className="text-xs">Tên</Label>
                        <Input className="h-8 text-sm" {...register(`distances.${i}.name`)} placeholder="10KM" />
                      </div>
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
