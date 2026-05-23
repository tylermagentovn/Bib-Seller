import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type Registration, type QrData } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Clock, Copy, Check } from "lucide-react";

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ payment: Registration["payment"]; qrData: QrData }>({
    queryKey: ["payment", id],
    queryFn: () => api.get(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  // Poll registration status every 3 seconds
  const { data: registration } = useQuery<Registration>({
    queryKey: ["registration", id],
    queryFn: () => api.get(`/registrations/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: (query) => {
      const reg = query.state.data;
      return reg?.status === "PAID" ? false : 3000;
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!data?.payment?.expiresAt) return;
    const update = () => {
      const diff = Math.floor((new Date(data.payment!.expiresAt).getTime() - Date.now()) / 1000);
      setTimeLeft(Math.max(0, diff));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [data?.payment?.expiresAt]);

  // Redirect on payment success
  useEffect(() => {
    if (registration?.status === "PAID") {
      navigate(`/payment/${id}/success`);
    }
  }, [registration?.status, id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data || !registration) return null;

  const { qrData } = data;
  const minutesLeft = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const secondsLeft = timeLeft !== null ? timeLeft % 60 : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
          <p className="text-gray-500 mt-1">Quét mã QR để hoàn tất đăng ký</p>
        </div>

        {/* Timer */}
        {timeLeft !== null && timeLeft > 0 && (
          <div className={`flex items-center justify-center gap-2 rounded-xl p-3 mb-6 text-sm font-medium ${timeLeft < 120 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
            <Clock className="h-4 w-4" />
            Còn {minutesLeft}:{String(secondsLeft).padStart(2, "0")} để hoàn tất thanh toán
          </div>
        )}
        {timeLeft === 0 && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-6 text-sm text-center font-medium">
            Đơn đăng ký đã hết hạn. Vui lòng đăng ký lại.
          </div>
        )}

        {/* QR Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
          <div className="text-center mb-4">
            <img
              src={qrData.qrUrl}
              alt="QR Code thanh toán"
              className="w-56 h-56 mx-auto rounded-xl object-contain"
            />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Ngân hàng</span>
              <span className="font-medium">{qrData.bankName}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Số tài khoản</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{qrData.accountNumber}</span>
                <button onClick={() => copyToClipboard(qrData.accountNumber)} className="text-indigo-500 hover:text-indigo-700">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Tên tài khoản</span>
              <span className="font-medium">{qrData.accountName}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Số tiền</span>
              <span className="font-bold text-indigo-600 text-base">{formatCurrency(qrData.amount)}</span>
            </div>
            <div className="flex justify-between py-2 items-start">
              <span className="text-gray-500">Nội dung CK</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-right">{qrData.description}</span>
                <button onClick={() => copyToClipboard(qrData.description)} className="text-indigo-500 hover:text-indigo-700">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="bg-white rounded-2xl border p-4 flex items-center gap-3">
          <div className="flex-shrink-0">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Đang chờ thanh toán...</p>
            <p className="text-xs text-gray-500">Tự động chuyển sang trang tiếp theo sau khi thanh toán thành công</p>
          </div>
        </div>

        {/* Registration info */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Mã đăng ký: #{registration.id.slice(-8).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
