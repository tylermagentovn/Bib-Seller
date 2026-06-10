export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Điều khoản Sử dụng</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: 10 tháng 6, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Chấp nhận điều khoản</h2>
          <p>
            Bằng việc truy cập và sử dụng nền tảng Bib1s tại <span className="font-medium">bib1s.com</span>, bạn đồng ý tuân thủ các điều khoản sử dụng này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Mô tả dịch vụ</h2>
          <p>
            Bib1s là nền tảng đăng ký sự kiện chạy bộ trực tuyến. Chúng tôi cung cấp:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Đăng ký tham gia các sự kiện chạy bộ</li>
            <li>Quản lý thông tin đăng ký và bib number</li>
            <li>Thanh toán trực tuyến qua các cổng thanh toán được hỗ trợ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Tài khoản người dùng</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Bạn phải cung cấp thông tin chính xác khi tạo tài khoản.</li>
            <li>Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động dưới tài khoản của mình.</li>
            <li>Mỗi người được sử dụng một tài khoản. Không được tạo tài khoản giả mạo.</li>
            <li>Bạn có thể đăng nhập bằng tài khoản Google hoặc Facebook theo điều khoản của các nền tảng đó.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Đăng ký sự kiện và thanh toán</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sau khi đăng ký và thanh toán thành công, bib number sẽ được xác nhận qua email.</li>
            <li>Chính sách hoàn tiền phụ thuộc vào từng ban tổ chức sự kiện cụ thể.</li>
            <li>Thông tin thanh toán được xử lý bởi cổng thanh toán thứ ba (PayOS). Chúng tôi không lưu trữ thông tin thẻ ngân hàng.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Hành vi bị cấm</h2>
          <p>Người dùng không được:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Đăng ký với thông tin giả mạo</li>
            <li>Cố gắng xâm phạm bảo mật hệ thống</li>
            <li>Sử dụng dịch vụ cho mục đích bất hợp pháp</li>
            <li>Can thiệp hoặc làm gián đoạn hoạt động bình thường của nền tảng</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Giới hạn trách nhiệm</h2>
          <p>
            Bib1s không chịu trách nhiệm về các thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ. Chúng tôi không chịu trách nhiệm về các quyết định của ban tổ chức sự kiện liên quan đến việc chấp nhận hoặc từ chối đăng ký.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Thay đổi dịch vụ</h2>
          <p>
            Chúng tôi có quyền thay đổi, tạm dừng hoặc chấm dứt dịch vụ bất kỳ lúc nào với thông báo hợp lý.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Luật áp dụng</h2>
          <p>
            Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại tòa án có thẩm quyền tại Việt Nam.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Liên hệ</h2>
          <p>
            Mọi câu hỏi về điều khoản sử dụng, vui lòng liên hệ:{" "}
            <a href="mailto:tylermagento@gmail.com" className="text-indigo-600 hover:underline">
              tylermagento@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
