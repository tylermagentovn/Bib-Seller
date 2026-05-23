import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Registration } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 20;

export function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [newBib, setNewBib] = useState("");
  const [search, setSearch] = useState("");

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
                <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="p-4">
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
                  <td className="p-4">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { setEditingReg(reg); setNewBib(String(reg.bibNumber ?? "")); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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
    </div>
  );
}
