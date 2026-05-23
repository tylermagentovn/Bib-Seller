import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type Event } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ"),
  dob: z.string().min(1, "Vui lòng nhập ngày sinh"),
  distanceId: z.string().min(1, "Vui lòng chọn cự ly"),
  emergencyName: z.string().min(2, "Vui lòng nhập tên người liên hệ"),
  emergencyPhone: z.string().min(9, "Số điện thoại không hợp lệ"),
  disclaimer: z.boolean().refine((v) => v, "Bạn phải đồng ý với điều khoản"),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedDistanceId, setSelectedDistanceId] = useState("");

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["event", slug],
    queryFn: () => api.get(`/events/${slug}`).then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedDistance = event?.distances.find((d) => d.id === selectedDistanceId);

  const mutation = useMutation({
    mutationFn: (data: Omit<FormData, "disclaimer">) =>
      api.post("/registrations", { ...data, eventId: event!.id }).then((r) => r.data),
    onSuccess: (reg) => {
      navigate(`/payment/${reg.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    const { disclaimer: _d, ...rest } = data;
    mutation.mutate(rest);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to={`/events/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
          </Link>
        </Button>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{event.name}</h1>
          <p className="text-gray-500 text-sm mb-6">Điền thông tin đăng ký tham gia sự kiện</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Distance */}
            <div className="space-y-1.5">
              <Label>Cự ly <span className="text-red-500">*</span></Label>
              <Select
                value={selectedDistanceId}
                onValueChange={(v) => {
                  setSelectedDistanceId(v);
                  setValue("distanceId", v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cự ly tham gia" />
                </SelectTrigger>
                <SelectContent>
                  {event.distances.map((d) => {
                    const isFull = (d._count?.registrations ?? 0) >= d.maxSlots;
                    return (
                      <SelectItem key={d.id} value={d.id} disabled={isFull}>
                        {d.name} — {formatCurrency(d.price)}
                        {isFull && <span className="ml-2 text-xs text-red-400">Đã hết slot</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.distanceId && <p className="text-xs text-red-500">{errors.distanceId.message}</p>}
            </div>

            {/* Full name */}
            <div className="space-y-1.5">
              <Label>Họ và tên <span className="text-red-500">*</span></Label>
              <Input placeholder="Nguyễn Văn A" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label>Số điện thoại <span className="text-red-500">*</span></Label>
              <Input placeholder="0901234567" type="tel" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input placeholder="email@example.com" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* DOB */}
            <div className="space-y-1.5">
              <Label>Ngày sinh <span className="text-red-500">*</span></Label>
              <Input type="date" {...register("dob")} />
              {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
            </div>

            <div className="border-t pt-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Người liên hệ khẩn cấp</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Họ tên <span className="text-red-500">*</span></Label>
                  <Input placeholder="Nguyễn Thị B" {...register("emergencyName")} />
                  {errors.emergencyName && <p className="text-xs text-red-500">{errors.emergencyName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input placeholder="0901234567" type="tel" {...register("emergencyPhone")} />
                  {errors.emergencyPhone && <p className="text-xs text-red-500">{errors.emergencyPhone.message}</p>}
                </div>
              </div>
            </div>

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
                  <span className="text-gray-600">Phí đăng ký ({selectedDistance.name})</span>
                  <span className="font-bold text-indigo-600">{formatCurrency(selectedDistance.price)}</span>
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                ) : (
                  "Đăng ký & Thanh toán"
                )}
              </Button>
              {mutation.isError && (
                <p className="text-xs text-red-500 text-center mt-2">
                  {(mutation.error as any)?.response?.data?.error ?? "Có lỗi xảy ra, vui lòng thử lại"}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
