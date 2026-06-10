import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-indigo-600 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Trang không tồn tại</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Địa chỉ bạn truy cập không tìm thấy. Có thể đường dẫn đã thay đổi hoặc bị xóa.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
