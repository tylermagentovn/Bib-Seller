import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { VIETQR_BANKS } from "@/lib/banks";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Trash2, Landmark, RefreshCw } from "lucide-react";

type PaymentProvider = "PAYOS" | "SEPAY";

interface SepayConfig {
  paymentProvider: PaymentProvider;
  bankBin: string | null;
  accountNumber: string | null;
  accountName: string | null;
  webhookKey: string | null;
}

const sepaySchema = z.object({
  bankBin: z.string().regex(/^\d{6}$/, "Chọn ngân hàng"),
  accountNumber: z.string().trim().regex(/^[A-Za-z0-9]{1,19}$/, "Chỉ gồm chữ và số, tối đa 19 ký tự"),
  accountName: z.string().trim().min(1, "Bắt buộc").max(100),
});

type SepayForm = z.infer<typeof sepaySchema>;

function useRefreshAdmin() {
  const { login } = useAuth();
  return async () => {
    const token = localStorage.getItem("admin_token");
    if (token) await login(token);
  };
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button type="button" size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => navigator.clipboard.writeText(value)}>
      Copy
    </Button>
  );
}

function PaymentProviderCard() {
  const { admin } = useAuth();
  const refreshAdmin = useRefreshAdmin();
  const queryClient = useQueryClient();
  const current = admin?.paymentProvider ?? "PAYOS";

  const mutation = useMutation({
    mutationFn: (provider: PaymentProvider) => api.put("/auth/me/payment-provider", { provider }),
    onSuccess: async () => {
      await refreshAdmin();
      queryClient.invalidateQueries({ queryKey: ["sepay-config"] });
    },
  });

  const options: { value: PaymentProvider; label: string; description: string; disabled: boolean }[] = [
    { value: "PAYOS", label: "PayOS", description: "Thanh toán qua cổng PayOS", disabled: false },
    {
      value: "SEPAY",
      label: "SePay",
      description: "Khách chuyển khoản thẳng vào tài khoản ngân hàng của bạn, SePay báo về khi tiền vào",
      disabled: !admin?.hasSepayConfig,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4">
      <div>
        <div className="font-semibold text-gray-900">Cổng thanh toán đang dùng</div>
        <div className="text-sm text-gray-500">
          Áp dụng cho các đơn tạo mã thanh toán sau khi đổi. Đơn đang chờ thanh toán giữ nguyên mã QR đã tạo.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={o.disabled || mutation.isPending}
            onClick={() => o.value !== current && mutation.mutate(o.value)}
            className={cn(
              "text-left rounded-xl border-2 p-4 transition-colors",
              current === o.value ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300",
              o.disabled && "opacity-50 cursor-not-allowed hover:border-gray-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{o.label}</span>
              {current === o.value && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
            </div>
            <p className="text-xs text-gray-500 mt-1">{o.description}</p>
            {o.disabled && <p className="text-xs text-amber-600 mt-1">Lưu cấu hình SePay bên dưới trước</p>}
          </button>
        ))}
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-500">
          {(isAxiosError(mutation.error) && mutation.error.response?.data?.error) || "Không đổi được cổng thanh toán"}
        </p>
      )}
    </div>
  );
}

function SepayConfigCard() {
  const { admin } = useAuth();
  const refreshAdmin = useRefreshAdmin();
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["sepay-config"],
    queryFn: () => api.get<SepayConfig>("/auth/me/sepay-config").then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SepayForm>({
    resolver: zodResolver(sepaySchema),
    defaultValues: { bankBin: "", accountNumber: "", accountName: "" },
  });

  useEffect(() => {
    if (config) {
      reset({ bankBin: config.bankBin ?? "", accountNumber: config.accountNumber ?? "", accountName: config.accountName ?? "" });
    }
  }, [config, reset]);

  const onConfigChanged = async (cfg: SepayConfig) => {
    queryClient.setQueryData(["sepay-config"], cfg);
    await refreshAdmin();
  };

  const saveMutation = useMutation({
    mutationFn: (data: SepayForm) => api.put<SepayConfig>("/auth/me/sepay-config", data).then((r) => r.data),
    onSuccess: onConfigChanged,
  });

  const rotateMutation = useMutation({
    mutationFn: () => api.post<SepayConfig>("/auth/me/sepay-config/rotate-key").then((r) => r.data),
    onSuccess: onConfigChanged,
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete("/auth/me/sepay-config"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sepay-config"] });
      await refreshAdmin();
    },
  });

  const configured = !!config?.accountNumber;
  const webhookUrl = `${window.location.origin}/api/payments/webhook/sepay/${admin?.id ?? ""}`;

  return (
    <div className="bg-white rounded-2xl border divide-y">
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Landmark className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">Chuyển khoản qua SePay</div>
          <div className="text-sm text-gray-500">Tài khoản ngân hàng nhận tiền và webhook xác nhận thanh toán</div>
        </div>
        {configured ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đã cấu hình
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            <AlertCircle className="h-3.5 w-3.5" /> Chưa cấu hình
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Ngân hàng</Label>
          <Select value={watch("bankBin")} onValueChange={(v) => setValue("bankBin", v, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Chọn ngân hàng nhận tiền" /></SelectTrigger>
            <SelectContent>
              {VIETQR_BANKS.map((b) => (
                <SelectItem key={b.bin} value={b.bin}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bankBin && <p className="text-xs text-red-500">{errors.bankBin.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountNumber">Số tài khoản</Label>
          <Input id="accountNumber" placeholder="Số tài khoản đã liên kết với SePay" className="font-mono" {...register("accountNumber")} />
          {errors.accountNumber && <p className="text-xs text-red-500">{errors.accountNumber.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountName">Chủ tài khoản</Label>
          <Input id="accountName" placeholder="NGUYEN VAN A" {...register("accountName")} />
          {errors.accountName && <p className="text-xs text-red-500">{errors.accountName.message}</p>}
        </div>

        {saveMutation.isError && (
          <p className="text-sm text-red-500">
            {isAxiosError(saveMutation.error) && saveMutation.error.response?.status === 400 ? "Thông tin không hợp lệ" : "Lỗi lưu cấu hình"}
          </p>
        )}
        {saveMutation.isSuccess && <p className="text-sm text-emerald-600">Đã lưu cấu hình SePay.</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {configured ? "Cập nhật cấu hình" : "Lưu cấu hình"}
          </Button>
          {configured && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              disabled={clearMutation.isPending}
              onClick={() =>
                confirm("Xóa cấu hình SePay? Cổng thanh toán sẽ chuyển về PayOS.") && clearMutation.mutate()
              }
            >
              {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Xóa cấu hình
            </Button>
          )}
        </div>
      </form>

      {configured && config?.webhookKey && (
        <div className="p-5 bg-gray-50 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">URL Webhook</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 font-mono text-gray-700 break-all">{webhookUrl}</code>
              <CopyButton value={webhookUrl} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">API Key (kiểu chứng thực "API Key" trong SePay)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 font-mono text-gray-700 break-all">
                {showKey ? config.webhookKey : "•".repeat(24)}
              </code>
              <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setShowKey((v) => !v)}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <CopyButton value={config.webhookKey} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 text-xs"
                disabled={rotateMutation.isPending}
                onClick={() =>
                  confirm("Tạo API Key mới? Key cũ ngừng hoạt động ngay, bạn phải cập nhật lại trong SePay.") &&
                  rotateMutation.mutate()
                }
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tạo key mới
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 text-xs text-gray-500 bg-gray-50 rounded-b-2xl space-y-1.5">
        <p className="font-medium text-gray-600">Cách kết nối</p>
        <p>1. Liên kết đúng tài khoản ngân hàng ở trên với SePay.</p>
        <p>
          2. Trong SePay, vào WebHooks → Thêm webhook: dán URL Webhook, chọn kiểu chứng thực API Key và dán API Key,
          content type application/json, sự kiện "Có tiền vào".
        </p>
        <p>3. Chọn SePay ở mục "Cổng thanh toán đang dùng".</p>
        <p>
          Hệ thống tự sinh nội dung chuyển khoản dạng <span className="font-mono">BIBXXXXXXXX</span> và tự nhận diện mã này.
          Nếu SePay hỏi có bỏ qua giao dịch không có mã thanh toán, chọn Không.
        </p>
      </div>
    </div>
  );
}

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
  const webhookUrl = admin?.id
    ? `${window.location.origin}/api/payments/webhook/payos/${admin.id}`
    : `${window.location.origin}/api/payments/webhook/payos`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500 text-sm mt-1">Cấu hình cổng thanh toán cho sự kiện của bạn</p>
      </div>

      <PaymentProviderCard />

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

      <SepayConfigCard />
    </div>
  );
}
