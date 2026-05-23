import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<{ checkoutUrl: string }>({
    queryKey: ["payment", id],
    queryFn: () => api.get(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: 2,
  });

  useEffect(() => {
    if (data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  }, [data?.checkoutUrl]);

  if (isLoading || data?.checkoutUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-gray-500 text-sm">Đang chuyển đến trang thanh toán...</p>
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

  return null;
}
