import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { userApi, type Registration } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronUp, Pencil, X, CheckCircle, Clock, XCircle } from "lucide-react";

const STATUS_MAP = {
  PAID: { label: "Đã thanh toán", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  PENDING: { label: "Chờ thanh toán", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Đã hủy", icon: XCircle, color: "bg-red-100 text-red-600" },
} as const;

type EditForm = { fullName: string; phone: string; email: string; emergencyName: string; emergencyPhone: string };

function EditModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm<EditForm>({
    defaultValues: {
      fullName: reg.fullName ?? "",
      phone: reg.phone ?? "",
      email: reg.email ?? "",
      emergencyName: reg.emergencyName ?? "",
      emergencyPhone: reg.emergencyPhone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EditForm) =>
      userApi.put(`/users/me/registrations/${reg.id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900">Sửa thông tin đăng ký</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Họ và tên</Label>
            <Input {...register("fullName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Số điện thoại</Label>
            <Input type="tel" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Người liên hệ khẩn cấp</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Họ tên</Label>
                <Input {...register("emergencyName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input type="tel" {...register("emergencyPhone")} />
              </div>
            </div>
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-500">{(mutation.error as any)?.response?.data?.error ?? "Lỗi, vui lòng thử lại"}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Đang lưu...</> : "Lưu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BibCard({ reg }: { reg: Registration }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const status = STATUS_MAP[reg.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{reg.event.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{reg.distance.name}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {reg.bibNumber && (
            <div className="text-right">
              <p className="text-xs text-gray-400">BIB</p>
              <p className="text-lg font-black text-indigo-600">{reg.bibNumber}</p>
            </div>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400">Họ tên</p><p className="font-medium">{reg.fullName || "—"}</p></div>
            <div><p className="text-xs text-gray-400">Điện thoại</p><p className="font-medium">{reg.phone || "—"}</p></div>
            <div><p className="text-xs text-gray-400">Email</p><p className="font-medium truncate">{reg.email || "—"}</p></div>
            <div><p className="text-xs text-gray-400">Ngày đăng ký</p><p className="font-medium">{formatDate(reg.createdAt)}</p></div>
            {reg.emergencyName && (
              <div><p className="text-xs text-gray-400">Liên hệ KT</p><p className="font-medium">{reg.emergencyName}</p></div>
            )}
            {reg.emergencyPhone && (
              <div><p className="text-xs text-gray-400">SĐT KT</p><p className="font-medium">{reg.emergencyPhone}</p></div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <span className="text-gray-500">Đã thanh toán: </span>
              <span className="font-bold text-indigo-600">{formatCurrency(reg.payment?.amount ?? 0)}</span>
            </div>
            {reg.status === "PENDING" && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/payment/${reg.id}`}>Thanh toán</Link>
              </Button>
            )}
          </div>

          {reg.status !== "CANCELLED" && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Sửa thông tin
            </Button>
          )}
        </div>
      )}

      {editing && <EditModal reg={reg} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function BibsPage() {
  const { data: registrations = [], isLoading } = useQuery<Registration[]>({
    queryKey: ["my-registrations"],
    queryFn: () => userApi.get("/users/me/registrations").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý BIB</h1>
      <p className="text-sm text-gray-500 mb-6">Danh sách các sự kiện bạn đã đăng ký</p>

      {registrations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Chưa có đăng ký nào</p>
          <Button asChild variant="outline">
            <Link to="/">Xem sự kiện</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => <BibCard key={reg.id} reg={reg} />)}
        </div>
      )}
    </div>
  );
}
