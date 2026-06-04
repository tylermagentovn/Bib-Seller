import { useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hủy đăng ký thành công</h1>
        {email && (
          <p className="text-gray-500 mb-1">
            Địa chỉ <strong>{email}</strong> sẽ không còn nhận email từ chúng tôi.
          </p>
        )}
        <p className="text-gray-400 text-sm">
          Nếu đây là nhầm lẫn, vui lòng liên hệ{" "}
          <a href="https://facebook.com/bib1s" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            facebook.com/bib1s
          </a>
          {" "}hoặc gọi <a href="tel:0918226017" className="text-indigo-600 hover:underline">0918 226 017</a>.
        </p>
      </div>
    </div>
  );
}
