import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type Registration } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Waves, Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SPIN_DURATION = 2500;

export function PaymentSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [currentBib, setCurrentBib] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isCancelled = searchParams.get("cancel") === "true";
  const isSuccess = searchParams.get("code") === "00" && !isCancelled;

  const { data: registration, isLoading } = useQuery<Registration>({
    queryKey: ["registration", id],
    queryFn: () => api.get(`/registrations/${id}`).then((r) => r.data),
    enabled: !!id,
    // Poll until PAID (webhook may arrive slightly after redirect)
    refetchInterval: (query) => {
      const reg = query.state.data;
      if (isCancelled) return false;
      return reg?.status === "PAID" ? false : 2000;
    },
  });

  useEffect(() => {
    if (registration?.bibNumber) {
      setCurrentBib(registration.bibNumber);
      setConfirmed(true);
    }
  }, [registration?.bibNumber]);

  const spinMutation = useMutation({
    mutationFn: () => api.get(`/payments/bib/spin/${id}`).then((r) => r.data),
    onMutate: () => setIsSpinning(true),
    onSuccess: (data: { bibNumber: number }) => {
      const start = Date.now();
      const min = registration!.distance.bibStart;
      const max = registration!.distance.bibEnd;
      const animate = () => {
        const elapsed = Date.now() - start;
        if (elapsed < SPIN_DURATION) {
          setCurrentBib(Math.floor(Math.random() * (max - min + 1)) + min);
          setTimeout(animate, 80);
        } else {
          setCurrentBib(data.bibNumber);
          setIsSpinning(false);
        }
      };
      animate();
    },
    onError: () => setIsSpinning(false),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      api.post(`/payments/bib/confirm/${id}`, { bibNumber: currentBib }).then((r) => r.data),
    onSuccess: () => setConfirmed(true),
  });

  // Cancelled payment
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Thanh toán bị hủy</h1>
          <p className="text-gray-500 text-sm mb-6">Bạn đã hủy thanh toán. Đơn đăng ký vẫn còn hiệu lực cho đến khi hết hạn.</p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to={`/payment/${id}`}>Thanh toán lại</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Về trang chủ</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for payment confirmation (webhook not yet received)
  if (isLoading || (isSuccess && registration?.status !== "PAID")) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-gray-600 font-medium">Đang xác nhận thanh toán...</p>
        <p className="text-gray-400 text-sm">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (!registration) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán thành công!</h1>
          <p className="text-gray-500 mt-1">
            {confirmed ? "Số BIB của bạn đã được xác nhận" : "Giờ hãy quay số BIB của bạn"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Sự kiện</span>
            <span className="font-medium text-right max-w-[60%]">{registration.event.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cự ly</span>
            <span className="font-medium">{registration.distance.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Họ tên</span>
            <span className="font-medium">{registration.fullName}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-500">Đã thanh toán</span>
            <span className="font-bold text-green-600">{formatCurrency(registration.payment?.amount ?? 0)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
          <div className="mb-2 text-sm font-medium text-gray-500 uppercase tracking-widest">Số BIB</div>

          <div className={`text-8xl font-black my-6 transition-all duration-100 ${isSpinning ? "text-indigo-300 scale-110" : confirmed ? "text-indigo-600" : currentBib ? "text-indigo-600" : "text-gray-200"}`}>
            {currentBib ?? "???"}
          </div>

          {!confirmed && (
            <div className="text-xs text-gray-400 mb-6">
              BIB {registration.distance.bibStart} – {registration.distance.bibEnd}
            </div>
          )}

          {confirmed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                BIB #{currentBib} đã được xác nhận!
              </div>
              <p className="text-sm text-gray-500">
                Email xác nhận đã được gửi đến <strong>{registration.email}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => spinMutation.mutate()}
                disabled={isSpinning}
                variant={currentBib ? "outline" : "default"}
              >
                {isSpinning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang quay...</>
                ) : currentBib ? (
                  <><RefreshCw className="h-4 w-4" /> Quay lại</>
                ) : (
                  <><Waves className="h-4 w-4" /> Quay số BIB</>
                )}
              </Button>

              {currentBib && !isSpinning && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Đang xác nhận...</>
                  ) : (
                    `Xác nhận BIB #${currentBib}`
                  )}
                </Button>
              )}
              {confirmMutation.isError && (
                <p className="text-xs text-red-500">
                  {(confirmMutation.error as any)?.response?.data?.error ?? "Lỗi xác nhận, hãy thử lại"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
