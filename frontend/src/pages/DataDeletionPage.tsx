export function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Yêu cầu Xóa Dữ liệu</h1>
      <p className="text-sm text-gray-500 mb-8">Data Deletion Instructions</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-blue-800 font-medium">
            Theo yêu cầu của Meta (Facebook), người dùng đã từng đăng nhập bằng Facebook có quyền yêu cầu xóa toàn bộ dữ liệu liên quan đến tài khoản của họ khỏi hệ thống Bib1s.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Dữ liệu Facebook chúng tôi lưu trữ</h2>
          <p>Khi bạn đăng nhập bằng Facebook, chúng tôi chỉ lưu:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Địa chỉ email từ tài khoản Facebook</li>
            <li>Họ và tên từ tài khoản Facebook</li>
            <li>Facebook User ID (dùng để nhận diện tài khoản)</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            Chúng tôi không lưu ảnh đại diện, danh sách bạn bè, bài đăng, tin nhắn hay token truy cập Facebook.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Cách yêu cầu xóa dữ liệu</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-gray-900">Gửi email yêu cầu</p>
                <p className="text-sm mt-1">
                  Gửi email đến{" "}
                  <a href="mailto:tylermagento@gmail.com" className="text-indigo-600 hover:underline font-medium">
                    tylermagento@gmail.com
                  </a>{" "}
                  với tiêu đề <strong>"Yêu cầu xóa dữ liệu Facebook"</strong>.
                </p>
                <p className="text-sm mt-1 text-gray-500">
                  Trong email, vui lòng cung cấp địa chỉ email đã dùng để đăng nhập Facebook trên Bib1s.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-gray-900">Xác nhận danh tính</p>
                <p className="text-sm mt-1 text-gray-500">
                  Chúng tôi có thể yêu cầu xác minh để đảm bảo chỉ chủ tài khoản mới có thể yêu cầu xóa.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-gray-900">Xử lý trong 30 ngày</p>
                <p className="text-sm mt-1 text-gray-500">
                  Chúng tôi sẽ xóa toàn bộ dữ liệu cá nhân và gửi email xác nhận trong vòng 30 ngày kể từ khi nhận được yêu cầu hợp lệ.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Phạm vi xóa dữ liệu</h2>
          <p>Khi xử lý yêu cầu, chúng tôi sẽ xóa:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Tài khoản người dùng và thông tin cá nhân</li>
            <li>Facebook ID và liên kết với Facebook</li>
            <li>Lịch sử đăng ký sự kiện (nếu được yêu cầu)</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            Lưu ý: Một số dữ liệu có thể được giữ lại theo yêu cầu pháp lý hoặc nghĩa vụ kế toán (ví dụ: hồ sơ giao dịch thanh toán).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Hủy liên kết Facebook mà không xóa tài khoản</h2>
          <p>
            Nếu bạn chỉ muốn hủy liên kết Facebook nhưng vẫn giữ tài khoản Bib1s, hãy đặt mật khẩu tại trang{" "}
            <a href="/account/profile" className="text-indigo-600 hover:underline">Hồ sơ cá nhân</a>{" "}
            và liên hệ với chúng tôi để gỡ liên kết Facebook ID.
          </p>
        </section>

        <section className="border-t pt-6">
          <p className="text-sm text-gray-500">
            Chính sách này tuân theo{" "}
            <a
              href="https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              yêu cầu xóa dữ liệu của Meta
            </a>
            . Xem thêm{" "}
            <a href="/privacy" className="text-indigo-600 hover:underline">Chính sách Bảo mật</a>{" "}
            của chúng tôi.
          </p>
        </section>
      </div>
    </div>
  );
}
