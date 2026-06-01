import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Registration } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Pencil, ChevronLeft, ChevronRight, Search,
  X, User, Phone, Mail, Calendar, Shield, CreditCard,
  PenLine, Users, CheckCircle, Clock, Download, Trash2, RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 20;

function ChangeStatusModal({ reg, onConfirm, onCancel, isPending }: {
  reg: Registration;
  onConfirm: (status: "PENDING" | "PAID" | "CANCELLED") => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [newStatus, setNewStatus] = useState<"PENDING" | "PAID" | "CANCELLED">(reg.status);

  const statusLabel = (s: string) => {
    if (s === "PAID") return "Đã thanh toán";
    if (s === "CANCELLED") return "Đã hủy";
    return "Chờ thanh toán";
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Cập nhật trạng thái</h3>
            <p className="text-sm text-gray-500">{reg.fullName}</p>
          </div>
        </div>
        <div className="mb-5">
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Trạng thái mới</label>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
            <SelectTrigger>
              <SelectValue>{statusLabel(newStatus)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
              <SelectItem value="PAID">Đã thanh toán</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
          {newStatus === "PAID" && (
            <p className="text-xs text-gray-400 mt-1.5">Trạng thái payment sẽ được cập nhật thành Đã TT tự động.</p>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Hủy</Button>
          <Button
            onClick={() => onConfirm(newStatus)}
            disabled={isPending || newStatus === reg.status}
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Đang lưu...</> : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ reg, onClose, onEditBib, onEditStatus }: {
  reg: Registration;
  onClose: () => void;
  onEditBib: () => void;
  onEditStatus: () => void;
}) {
  const statusBadge = (s: string) => {
    if (s === "PAID") return <Badge variant="success">Đã thanh toán</Badge>;
    if (s === "CANCELLED") return <Badge variant="destructive">Đã hủy</Badge>;
    return <Badge variant="warning">Chờ thanh toán</Badge>;
  };

  const payStatusBadge = (s: string) => {
    if (s === "PAID") return <Badge variant="success">Đã TT</Badge>;
    if (s === "EXPIRED") return <Badge variant="destructive">Hết hạn</Badge>;
    return <Badge variant="warning">Chờ</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{reg.fullName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {statusBadge(reg.status)}
              {reg.bibNumber && (
                <span className="text-sm font-mono font-bold text-indigo-600">BIB #{reg.bibNumber}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={onEditStatus}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Đổi TT
            </Button>
            <Button size="sm" variant="outline" onClick={onEditBib}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa BIB
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Sự kiện / Cự ly */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sự kiện</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sự kiện</span>
                <span className="font-medium text-right max-w-[60%]">{reg.event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cự ly</span>
                <span className="font-medium">{reg.distance.name} ({reg.distance.type === "RELAY" ? "Tiếp sức" : "Cá nhân"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày đăng ký</span>
                <span className="font-medium">{formatDate(reg.createdAt)}</span>
              </div>
            </div>
          </section>

          {/* Thông tin cá nhân */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin cá nhân</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex justify-between w-full">
                  <span className="text-gray-500">Họ tên</span>
                  <span className="font-medium">{reg.fullName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex justify-between w-full">
                  <span className="text-gray-500">Ngày sinh</span>
                  <span className="font-medium">{formatDate(reg.dob)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex justify-between w-full">
                  <span className="text-gray-500">Điện thoại</span>
                  <span className="font-medium">{reg.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex justify-between w-full">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-right break-all max-w-[60%]">{reg.email}</span>
                </div>
              </div>
              <div className="border-t pt-3 mt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Liên hệ khẩn cấp</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Họ tên</span>
                  <span className="font-medium">{reg.emergencyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Điện thoại</span>
                  <span className="font-medium">{reg.emergencyPhone}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Thành viên nhóm (Relay) */}
          {reg.teamMembers && reg.teamMembers.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Thành viên nhóm ({reg.teamMembers.length} người)
              </h3>
              <div className="space-y-2.5">
                {reg.teamMembers.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-xl p-4 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                        {m.memberIndex}
                      </span>
                      <span className="font-semibold text-gray-900">{m.fullName}</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 pl-7">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>
                        {m.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ngày sinh: {formatDate(m.dob)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Thông tin thanh toán */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Thanh toán
            </h3>
            {reg.payment ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Trạng thái</span>
                  {payStatusBadge(reg.payment.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-bold text-green-600">{formatCurrency(reg.payment.amount)}</span>
                </div>
                {reg.payment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thời gian TT</span>
                    <span className="font-medium">{new Date(reg.payment.paidAt).toLocaleString("vi-VN")}</span>
                  </div>
                )}
                {reg.payment.payosRef && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã tham chiếu</span>
                    <span className="font-mono text-xs text-gray-700">{reg.payment.payosRef}</span>
                  </div>
                )}
                {reg.payment.payosOrderCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order code</span>
                    <span className="font-mono text-xs text-gray-700">{reg.payment.payosOrderCode}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Hết hạn</span>
                  <span className="text-xs text-gray-600">{new Date(reg.payment.expiresAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4">Không có thông tin thanh toán</p>
            )}
          </section>

          {/* Chữ ký miễn trừ trách nhiệm */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5" /> Chữ ký miễn trừ trách nhiệm
            </h3>
            {reg.disclaimerSignedAt ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Đã ký lúc {new Date(reg.disclaimerSignedAt).toLocaleString("vi-VN")}</span>
                </div>
                {reg.disclaimerSignature && (
                  <div className="border rounded-xl overflow-hidden bg-white p-2">
                    <img
                      src={reg.disclaimerSignature}
                      alt="Chữ ký"
                      className="w-full object-contain max-h-36"
                      style={{ background: "white" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                Chưa ký
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ reg, onConfirm, onCancel, isPending }: {
  reg: Registration;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Xác nhận xóa</h3>
            <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Bạn có chắc muốn xóa đăng ký của{" "}
          <span className="font-semibold">{reg.fullName}</span>?
          Toàn bộ thông tin thanh toán liên quan cũng sẽ bị xóa.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Hủy</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Đang xóa...</> : "Xóa"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [newBib, setNewBib] = useState("");
  const [search, setSearch] = useState("");
  const [detailReg, setDetailReg] = useState<Registration | null>(null);
  const [deletingReg, setDeletingReg] = useState<Registration | null>(null);
  const [changingStatusReg, setChangingStatusReg] = useState<Registration | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sendContinueMutation = useMutation({
    mutationFn: (ids: string[]) => api.post(`/registrations/admin/send-continue`, { ids }).then((r) => r.data),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      alert("Đã gửi email đến những đăng ký phù hợp");
    },
    onError: (err) => {
      console.error(err);
      alert("Gửi email thất bại");
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/registrations/admin/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registrations", { page, status: statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return api.get(`/registrations/admin/all?${params}`).then((r) => r.data);
    },
  });

  const bibMutation = useMutation({
    mutationFn: ({ id, bibNumber }: { id: string; bibNumber: number }) =>
      api.patch(`/registrations/${id}/bib`, { bibNumber }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      setEditingReg(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/registrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      setDeletingReg(null);
      setDetailReg(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PENDING" | "PAID" | "CANCELLED" }) =>
      api.patch(`/registrations/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      setChangingStatusReg(null);
    },
  });

  const registrations: Registration[] = data?.registrations ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? registrations.filter(
        (r) =>
          r.fullName.toLowerCase().includes(search.toLowerCase()) ||
          r.email.toLowerCase().includes(search.toLowerCase()) ||
          r.phone.includes(search)
      )
    : registrations;

  const statusBadge = (status: string) => {
    if (status === "PAID") return <Badge variant="success">Đã TT</Badge>;
    if (status === "CANCELLED") return <Badge variant="destructive">Đã hủy</Badge>;
    return <Badge variant="warning">Chờ TT</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách đăng ký</h1>
          <p className="text-gray-500 text-sm mt-1">{total} tổng cộng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => {
            if (selectedIds.length === 0) { alert('Chọn ít nhất một đăng ký'); return; }
            if (!confirm(`Gửi email tiếp tục cho ${selectedIds.length} đăng ký?`)) return;
            sendContinueMutation.mutate(selectedIds);
          }} disabled={sendContinueMutation.isPending}>
            Gửi mail đăng ký
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Đang xuất...</>
            : <><Download className="h-4 w-4 mr-1.5" /> Xuất CSV</>
          }
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên, email, SĐT..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="PENDING">Chờ TT</SelectItem>
            <SelectItem value="PAID">Đã TT</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === registrations.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(registrations.map((r) => r.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="text-left p-4 font-medium text-gray-600">Họ tên</th>
                <th className="text-left p-4 font-medium text-gray-600">Sự kiện / Cự ly</th>
                <th className="text-left p-4 font-medium text-gray-600">Liên hệ</th>
                <th className="text-left p-4 font-medium text-gray-600">BIB</th>
                <th className="text-left p-4 font-medium text-gray-600">Trạng thái</th>
                <th className="text-left p-4 font-medium text-gray-600">Ngày đăng ký</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không có dữ liệu</td></tr>
              ) : filtered.map((reg) => (
                <tr
                  key={reg.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setDetailReg(reg)}
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(reg.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => e.target.checked ? [...prev, reg.id] : prev.filter((id) => id !== reg.id));
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{reg.fullName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(reg.dob)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-900">{reg.event?.name}</div>
                    <div className="text-xs text-gray-400">{reg.distance?.name} — {formatCurrency(reg.distance?.price ?? 0)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-900">{reg.phone}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[140px]">{reg.email}</div>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    {editingReg?.id === reg.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 w-20 text-xs"
                          type="number"
                          value={newBib}
                          onChange={(e) => setNewBib(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => bibMutation.mutate({ id: reg.id, bibNumber: Number(newBib) })}
                          disabled={bibMutation.isPending}
                        >
                          {bibMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingReg(null)}>
                          Hủy
                        </Button>
                      </div>
                    ) : (
                      <span className={`font-mono font-bold ${reg.bibNumber ? "text-indigo-600" : "text-gray-300"}`}>
                        {reg.bibNumber ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="p-4">{statusBadge(reg.status)}</td>
                  <td className="p-4 text-gray-500 text-xs">{formatDate(reg.createdAt)}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => { setEditingReg(reg); setNewBib(String(reg.bibNumber ?? "")); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeletingReg(reg)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-gray-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      {detailReg && (
        <DetailModal
          reg={detailReg}
          onClose={() => setDetailReg(null)}
          onEditBib={() => {
            setEditingReg(detailReg);
            setNewBib(String(detailReg.bibNumber ?? ""));
            setDetailReg(null);
          }}
          onEditStatus={() => {
            setChangingStatusReg(detailReg);
            setDetailReg(null);
          }}
        />
      )}

      {changingStatusReg && (
        <ChangeStatusModal
          reg={changingStatusReg}
          isPending={statusMutation.isPending}
          onConfirm={(status) => statusMutation.mutate({ id: changingStatusReg.id, status })}
          onCancel={() => setChangingStatusReg(null)}
        />
      )}

      {/* Confirm delete */}
      {deletingReg && (
        <ConfirmDeleteModal
          reg={deletingReg}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingReg.id)}
          onCancel={() => setDeletingReg(null)}
        />
      )}
    </div>
  );
}
