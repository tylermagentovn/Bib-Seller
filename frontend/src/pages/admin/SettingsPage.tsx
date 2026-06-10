import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";

const configSchema = z.object({
  clientId: z.string().min(1, "Bắt buộc"),
  apiKey: z.string().min(1, "Bắt buộc"),
  checksumKey: z.string().min(1, "Bắt buộc"),
});

type ConfigForm = z.infer<typeof configSchema>;

function MaskedInput({ id, placeholder, register, error }: {
  id: keyof ConfigForm;
  placeholder: string;
  register: ReturnType<typeof useForm<ConfigForm>>["register"];
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
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
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function AdminSettingsPage() {
  const { admin, login } = useAuth();
  const queryClient = useQueryClient();
  const [cleared, setCleared] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: ConfigForm) => api.put("/auth/me/payment-config", data),
    onSuccess: async () => {
      const token = localStorage.getItem("admin_token");
      if (token) await login(token);
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      reset();
      setCleared(false);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete("/auth/me/payment-config"),
    onSuccess: async () => {
      const token = localStorage.getItem("admin_token");
      if (token) await login(token);
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      setCleared(true);
    },
  });

  const hasConfig = admin?.hasPaymentConfig && !cleared;
  const webhookUrl = `${window.location.origin}/api/payments/webhook/payos`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500 text-sm mt-1">Cấu hình cổng thanh toán PayOS cho sự kiện của bạn</p>
      </div>

      <div className="bg-white rounded-2xl border divide-y">
        {/* Header */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Cổng thanh toán PayOS</div>
            <div className="text-sm text-gray-500">Thông tin API dùng để tạo link thanh toán cho sự kiện của bạn</div>
          </div>
          {hasConfig ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã cấu hình
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" /> Chưa cấu hình
            </span>
          )}
        </div>

        {/* Webhook URL info */}
        <div className="p-5 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-1.5">URL Webhook (cấu hình trong dashboard PayOS của bạn)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 font-mono text-gray-700 break-all">
              {webhookUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="shrink-0 text-xs"
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Config form */}
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <MaskedInput id="clientId" placeholder="Nhập Client ID từ PayOS" register={register} error={errors.clientId?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">API Key</Label>
            <MaskedInput id="apiKey" placeholder="Nhập API Key từ PayOS" register={register} error={errors.apiKey?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checksumKey">Checksum Key</Label>
            <MaskedInput id="checksumKey" placeholder="Nhập Checksum Key từ PayOS" register={register} error={errors.checksumKey?.message} />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-red-500">
              {(saveMutation.error as any)?.response?.data?.error ?? "Lỗi lưu cấu hình"}
            </p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-sm text-emerald-600">Đã lưu cấu hình thành công.</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {hasConfig ? "Cập nhật cấu hình" : "Lưu cấu hình"}
            </Button>
            {hasConfig && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                disabled={clearMutation.isPending}
                onClick={() => confirm("Xóa cấu hình thanh toán? Sự kiện của bạn sẽ dùng cài đặt mặc định của hệ thống.") && clearMutation.mutate()}
              >
                {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Xóa cấu hình
              </Button>
            )}
          </div>
        </form>

        {/* Info note */}
        <div className="p-5 text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
          Nếu chưa cấu hình, hệ thống sẽ dùng tài khoản PayOS mặc định. Khi đã cấu hình, tất cả thanh toán của sự kiện do bạn tạo sẽ chạy qua tài khoản PayOS của bạn.
        </div>
      </div>
    </div>
  );
}
