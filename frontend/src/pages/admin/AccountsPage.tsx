import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuth, type AdminRole } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X, Loader2, ShieldCheck, UserCog, CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  hasPaymentConfig: boolean;
}

const createSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Tối thiểu 8 ký tự"),
  name: z.string().min(1, "Bắt buộc"),
  role: z.enum(["SUPER_ADMIN", "EVENT_MANAGER"]),
});

const paymentConfigSchema = z.object({
  clientId: z.string().min(1, "Bắt buộc"),
  apiKey: z.string().min(1, "Bắt buộc"),
  checksumKey: z.string().min(1, "Bắt buộc"),
});

type CreateForm = z.infer<typeof createSchema>;
type PaymentConfigForm = z.infer<typeof paymentConfigSchema>;

function MaskedField({ id, label, placeholder, register, error }: {
  id: keyof PaymentConfigForm;
  label: string;
  placeholder: string;
  register: ReturnType<typeof useForm<PaymentConfigForm>>["register"];
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="pr-10 font-mono text-sm"
          {...register(id)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PaymentConfigModal({ account, onClose }: { account: AdminAccount; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentConfigForm>({
    resolver: zodResolver(paymentConfigSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: PaymentConfigForm) =>
      api.put(`/auth/admins/${account.id}/payment-config`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      reset();
      onClose();
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete(`/auth/admins/${account.id}/payment-config`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">Cấu hình thanh toán</h2>
            <p className="text-sm text-gray-500">{account.name} · {account.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-4">
          <MaskedField id="clientId" label="Client ID" placeholder="Nhập Client ID từ PayOS" register={register} error={errors.clientId?.message} />
          <MaskedField id="apiKey" label="API Key" placeholder="Nhập API Key từ PayOS" register={register} error={errors.apiKey?.message} />
          <MaskedField id="checksumKey" label="Checksum Key" placeholder="Nhập Checksum Key từ PayOS" register={register} error={errors.checksumKey?.message} />

          {saveMutation.isError && (
            <p className="text-sm text-red-500">
              {(saveMutation.error as any)?.response?.data?.error ?? "Lỗi lưu cấu hình"}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {account.hasPaymentConfig ? "Cập nhật" : "Lưu cấu hình"}
            </Button>
            {account.hasPaymentConfig && (
              <Button
                type="button"
                variant="outline"
                className="text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                disabled={clearMutation.isPending}
                onClick={() => confirm(`Xóa cấu hình thanh toán của "${account.name}"?`) && clearMutation.mutate()}
              >
                {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminAccountsPage() {
  const { admin: currentAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [paymentConfigFor, setPaymentConfigFor] = useState<AdminAccount | null>(null);

  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const { data: accounts = [], isLoading } = useQuery<AdminAccount[]>({
    queryKey: ["admin-accounts"],
    queryFn: () => api.get("/auth/admins").then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "EVENT_MANAGER" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api.post("/auth/admins", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      setShowForm(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/admins/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-accounts"] }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      api.patch(`/auth/admins/${id}/role`, { role }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-accounts"] }),
  });

  const roleInfo = (role: AdminRole) =>
    role === "SUPER_ADMIN"
      ? { label: "Super Admin", icon: ShieldCheck, color: "text-indigo-600 bg-indigo-50" }
      : { label: "Quản lý sự kiện", icon: UserCog, color: "text-emerald-600 bg-emerald-50" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
          <p className="text-gray-500 text-sm mt-1">{accounts.length} tài khoản</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Tạo tài khoản
        </Button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">Tạo tài khoản mới</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Họ tên *</Label>
                <Input {...register("name")} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu *</Label>
                <Input type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select value={watch("role")} onValueChange={(v: any) => setValue("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENT_MANAGER">Quản lý sự kiện</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo tài khoản"}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-red-500 text-center">
                  {(createMutation.error as any)?.response?.data?.error ?? "Lỗi tạo tài khoản"}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Payment config modal */}
      {paymentConfigFor && (
        <PaymentConfigModal account={paymentConfigFor} onClose={() => setPaymentConfigFor(null)} />
      )}

      {/* Accounts list */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" /></div>
      ) : (
        <div className="bg-white rounded-2xl border divide-y">
          {accounts.map((account) => {
            const { label, icon: Icon, color } = roleInfo(account.role);
            const isSelf = account.id === currentAdmin?.id;
            return (
              <div key={account.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{account.name}</span>
                    {isSelf && <Badge variant="outline" className="text-xs">Bạn</Badge>}
                    {account.hasPaymentConfig ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Đã cấu hình TT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" /> Chưa cấu hình TT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{account.email}</p>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                  onClick={() => setPaymentConfigFor(account)}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Thanh toán
                </Button>

                {!isSelf && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={account.role}
                      onValueChange={(v: AdminRole) => roleMutation.mutate({ id: account.id, role: v })}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EVENT_MANAGER">Quản lý sự kiện</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => confirm(`Xóa tài khoản "${account.name}"?`) && deleteMutation.mutate(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="text-center py-12 text-gray-400">Chưa có tài khoản nào</div>
          )}
        </div>
      )}
    </div>
  );
}
