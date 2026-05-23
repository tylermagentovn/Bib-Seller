import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type PaymentResponse } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<PaymentResponse>({
    queryKey: ["payment", id],
    queryFn: () => api.get(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.payment?.status;
      if (status === "PAID" || status === "EXPIRED") return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (data?.payment?.status === "PAID") {
      navigate(`/payment/${id}/success?code=00`, { replace: true });
    }
  }, [data?.payment?.status, id, navigate]);

  useEffect(() => {
    if (!data?.payment?.expiresAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(data.payment.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.payment?.expiresAt]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-gray-500 text-sm">Đang tạo mã QR...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-700 font-medium">Không thể tạo liên kết thanh toán</p>
        <div className="flex gap-3">
          <Button onClick={() => refetch()}>Thử lại</Button>
          <Button variant="outline" onClick={() => navigate("/")}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  if (!data?.qrCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-gray-500 text-sm">Đang tải...</p>
      </div>
    );
  }

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const seconds = timeLeft !== null ? timeLeft % 60 : null;
  const isExpired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-sm w-full text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Quét mã QR để thanh toán</h1>
        <p className="text-3xl font-black text-indigo-600 mb-5">
          {formatCurrency(data.payment.amount)}
        </p>

        <div className="flex justify-center mb-5">
          <div className={`p-3 rounded-xl border-2 ${isExpired ? "opacity-30 border-gray-200" : "border-indigo-100"}`}>
            <QRCodeSVG value={data.qrCode} size={200} />
          </div>
        </div>

        {isExpired ? (
          <div className="mb-4">
            <p className="text-red-500 font-medium text-sm mb-3">Mã QR đã hết hạn</p>
            <Button onClick={() => refetch()} size="sm">Tạo mã mới</Button>
          </div>
        ) : (
          <>
            {minutes !== null && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-4">
                <Clock className="h-4 w-4" />
                <span>
                  Hết hạn sau{" "}
                  <span className={`font-semibold ${minutes === 0 ? "text-red-500" : "text-gray-700"}`}>
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Đang chờ xác nhận...</span>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Mở app ngân hàng → Quét QR → Xác nhận thanh toán.
          <br />
          Trang tự động chuyển khi thanh toán thành công.
        </p>

        {data.checkoutUrl && (
          <a
            href={data.checkoutUrl}
            className="block mt-4 text-xs text-indigo-500 underline underline-offset-2"
          >
            Hoặc thanh toán qua trang PayOS
          </a>
        )}
      </div>
    </div>
  );
}
