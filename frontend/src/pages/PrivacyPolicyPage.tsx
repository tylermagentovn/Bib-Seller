export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Chính sách Bảo mật</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: 10 tháng 6, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Giới thiệu</h2>
          <p>
            Bib1s ("chúng tôi") vận hành nền tảng đăng ký sự kiện chạy bộ tại{" "}
            <span className="font-medium">bib1s.com</span>. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Thông tin chúng tôi thu thập</h2>
          <h3 className="font-medium text-gray-800 mb-2">2.1 Khi đăng ký tài khoản trực tiếp</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Họ và tên</li>
            <li>Địa chỉ email</li>
            <li>Mật khẩu (được mã hóa bcrypt, không lưu dạng văn bản thuần)</li>
          </ul>

          <h3 className="font-medium text-gray-800 mt-4 mb-2">2.2 Khi đăng nhập bằng Google hoặc Facebook</h3>
          <p>Nếu bạn chọn đăng nhập qua Google hoặc Facebook, chúng tôi chỉ nhận các thông tin sau từ nhà cung cấp đó:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Địa chỉ email</li>
            <li>Họ và tên</li>
            <li>ID định danh từ nhà cung cấp (Google ID hoặc Facebook ID)</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            Chúng tôi không nhận ảnh đại diện, danh sách bạn bè, bài đăng, tin nhắn hay bất kỳ dữ liệu nào khác từ tài khoản mạng xã hội của bạn.
          </p>

          <h3 className="font-medium text-gray-800 mt-4 mb-2">2.3 Khi đăng ký sự kiện</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Thông tin cá nhân theo yêu cầu của từng sự kiện (ngày sinh, giới tính, số điện thoại, v.v.)</li>
            <li>Thông tin thanh toán (xử lý qua cổng thanh toán thứ ba — chúng tôi không lưu số thẻ)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Mục đích sử dụng thông tin</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tạo và quản lý tài khoản người dùng</li>
            <li>Xử lý đăng ký và thanh toán sự kiện</li>
            <li>Gửi email xác nhận đăng ký và thông tin sự kiện</li>
            <li>Hỗ trợ khách hàng khi cần thiết</li>
          </ul>
          <p className="mt-2">Chúng tôi <strong>không</strong> bán, cho thuê hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Bảo mật dữ liệu</h2>
          <p>
            Dữ liệu được lưu trữ trên máy chủ bảo mật. Mật khẩu được mã hóa bằng bcrypt. Kết nối đến hệ thống sử dụng HTTPS. Chúng tôi hạn chế quyền truy cập vào dữ liệu cá nhân cho những nhân viên cần thiết để vận hành dịch vụ.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Quyền của bạn</h2>
          <p>Bạn có quyền:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Truy cập thông tin cá nhân chúng tôi đang lưu về bạn</li>
            <li>Yêu cầu chỉnh sửa thông tin không chính xác</li>
            <li>Yêu cầu xóa tài khoản và toàn bộ dữ liệu cá nhân</li>
            <li>Hủy đăng ký nhận email thông báo bất kỳ lúc nào</li>
          </ul>
          <p className="mt-2">
            Để thực hiện các quyền này, vui lòng liên hệ:{" "}
            <a href="mailto:tylermagento@gmail.com" className="text-indigo-600 hover:underline">
              tylermagento@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookie</h2>
          <p>
            Chúng tôi sử dụng cookie phiên (session cookie) để duy trì trạng thái đăng nhập. Không sử dụng cookie theo dõi hay quảng cáo của bên thứ ba.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Thay đổi chính sách</h2>
          <p>
            Chúng tôi có thể cập nhật chính sách này khi cần thiết. Thay đổi quan trọng sẽ được thông báo qua email hoặc thông báo trên trang web.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Liên hệ</h2>
          <p>
            Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ:{" "}
            <a href="mailto:tylermagento@gmail.com" className="text-indigo-600 hover:underline">
              tylermagento@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
