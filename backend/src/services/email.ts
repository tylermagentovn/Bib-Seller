import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface TeamMemberEmailInfo {
  memberIndex: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
}

interface ConfirmationEmailData {
  to: string;
  fullName: string | null;
  eventName: string;
  distanceName: string;
  bibNumber: number;
  registrationId: string;
  eventDate?: string | null;
  location?: string | null;
  phone?: string | null;
  dob?: string | null;
  idNumber?: string | null;
  shirtSize?: string | null;
  bloodType?: string | null;
  medicalConditions?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  teamMembers?: TeamMemberEmailInfo[];
}

export async function sendConfirmationEmail(data: ConfirmationEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 8px 0 0; opacity: 0.85; }
        .body { padding: 32px; }
        .bib-box { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; text-align: center; color: white; margin: 24px 0; }
        .bib-box .label { font-size: 14px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
        .bib-box .number { font-size: 56px; font-weight: 900; line-height: 1; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .info-table td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .info-table td:first-child { color: #888; font-size: 14px; width: 40%; }
        .info-table td:last-child { font-weight: 600; }
        .footer { background: #f9f9f9; padding: 24px 32px; text-align: center; color: #999; font-size: 13px; }
        .footer a { color: #6366f1; text-decoration: none; }
        .footer .brand { font-weight: 600; color: #555; margin-bottom: 6px; }
        .footer .contact { margin: 6px 0; }
        .footer .unsub { margin-top: 12px; font-size: 12px; border-top: 1px solid #eee; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Đăng ký thành công!</h1>
          <p>Chào mừng bạn đến với ${data.eventName}</p>
        </div>
        <div class="body">
          <p>Xin chào <strong>${data.fullName ?? "Bạn"}</strong>,</p>
          <p>Đăng ký của bạn đã được xác nhận. Đây là thông tin BIB của bạn:</p>
          <div class="bib-box">
            <div class="label">Số BIB của bạn</div>
            <div class="number">${data.bibNumber}</div>
          </div>
          <table class="info-table">
            <tr><td>Sự kiện</td><td>${data.eventName}</td></tr>
            <tr><td>Cự ly</td><td>${data.distanceName}</td></tr>
            ${data.eventDate ? `<tr><td>Ngày tổ chức</td><td>${data.eventDate}</td></tr>` : ""}
            ${data.location ? `<tr><td>Địa điểm</td><td>${data.location}</td></tr>` : ""}
            <tr><td>Mã đăng ký</td><td>#${data.registrationId.slice(-8).toUpperCase()}</td></tr>
            ${data.fullName ? `<tr><td>Họ tên</td><td>${data.fullName}</td></tr>` : ""}
            ${data.dob ? `<tr><td>Ngày sinh</td><td>${data.dob}</td></tr>` : ""}
            ${data.phone ? `<tr><td>Điện thoại</td><td>${data.phone}</td></tr>` : ""}
            ${data.idNumber ? `<tr><td>Số CCCD</td><td>${data.idNumber}</td></tr>` : ""}
            ${data.shirtSize ? `<tr><td>Size áo</td><td>${data.shirtSize}</td></tr>` : ""}
            ${data.bloodType ? `<tr><td>Nhóm máu</td><td>${data.bloodType}</td></tr>` : ""}
            ${data.medicalConditions ? `<tr><td>Bệnh lý</td><td>${data.medicalConditions}</td></tr>` : ""}
            ${(data.emergencyName || data.emergencyPhone) ? `<tr><td>Liên hệ khẩn cấp</td><td>${[data.emergencyName, data.emergencyPhone].filter(Boolean).join(" — ")}</td></tr>` : ""}
          </table>
          ${data.teamMembers && data.teamMembers.length > 0 ? `
          <h3 style="margin: 28px 0 12px; color: #444; font-size: 15px; border-top: 1px solid #f0f0f0; padding-top: 20px;">Thành viên nhóm</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f5f3ff;">
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">#</th>
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">Họ tên</th>
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">Liên hệ</th>
            </tr>
            ${data.teamMembers.map(m => `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px 10px; color: #888;">${m.memberIndex}</td>
              <td style="padding: 8px 10px; font-weight: 600;">${m.fullName}</td>
              <td style="padding: 8px 10px; color: #555;">${[m.phone, m.email].filter(Boolean).join(" / ") || "—"}</td>
            </tr>`).join("")}
          </table>
          ` : ""}
          <p style="color:#666; font-size:14px;">Vui lòng mang theo email này hoặc số BIB vào ngày thi đấu. Chúc bạn thi đấu thật tốt!</p>
        </div>
        <div class="footer">
          <div class="brand">Bib1s - Giải pháp quản lý giải đấu thể thao chuyên nghiệp</div>
          <div class="contact">📞 <a href="tel:0918226017">0918 226 017</a></div>
          <div class="contact">📘 <a href="https://facebook.com/bib1s" target="_blank">facebook.com/bib1s</a></div>
          <div class="unsub">Email này được gửi tự động. Vui lòng không trả lời.<br/>
            <a href="${process.env.FRONTEND_URL ?? "http://localhost:5173"}/unsubscribe?email=${encodeURIComponent(data.to)}">Hủy nhận email</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.to,
    subject: `${data.eventName} - Xác nhận lựa chọn số BIB`,
    html,
  });
}

interface RegistrationSuccessEmailData {
  to: string;
  fullName: string | null;
  registrationId: string;
  eventName: string;
  continueUrl: string;
  teamMembers?: TeamMemberEmailInfo[];
}

export async function sendRegistrationSuccessEmail(data: RegistrationSuccessEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; }
        .header p { margin: 8px 0 0; opacity: 0.85; }
        .body { padding: 32px; }
        .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
        .footer { background: #f9f9f9; padding: 24px 32px; text-align: center; color: #999; font-size: 13px; }
        .footer a { color: #6366f1; text-decoration: none; }
        .footer .brand { font-weight: 600; color: #555; margin-bottom: 6px; }
        .footer .contact { margin: 6px 0; }
        .footer .unsub { margin-top: 12px; font-size: 12px; border-top: 1px solid #eee; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Đăng ký thành công!</h1>
          <p>${data.eventName}</p>
        </div>
        <div class="body">
          <p>Xin chào <strong>${data.fullName ?? "Bạn"}</strong>,</p>
          <p>Đăng ký của bạn đã được xác nhận. Tiếp theo, bạn cần <strong>ký bản miễn trừ trách nhiệm</strong> và <strong>quay số BIB</strong> để hoàn tất.</p>
          <p>Mã đăng ký: <strong>#${data.registrationId.slice(-8).toUpperCase()}</strong></p>
          ${data.teamMembers && data.teamMembers.length > 0 ? `
          <h3 style="margin: 24px 0 12px; color: #444; font-size: 15px; border-top: 1px solid #f0f0f0; padding-top: 20px;">Thành viên nhóm</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f5f3ff;">
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">#</th>
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">Họ tên</th>
              <th style="padding: 8px 10px; text-align: left; color: #6366f1; font-weight: 600;">Liên hệ</th>
            </tr>
            ${data.teamMembers.map(m => `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px 10px; color: #888;">${m.memberIndex}</td>
              <td style="padding: 8px 10px; font-weight: 600;">${m.fullName}</td>
              <td style="padding: 8px 10px; color: #555;">${[m.phone, m.email].filter(Boolean).join(" / ") || "—"}</td>
            </tr>`).join("")}
          </table>
          ` : ""}
          <p style="text-align: center; margin: 28px 0;">
            <a class="btn" href="${data.continueUrl}">Ký miễn trừ &amp; Quay số BIB →</a>
          </p>
          <p style="color: #888; font-size: 13px;">Nếu nút không hoạt động, sao chép đường dẫn sau vào trình duyệt:<br/><a href="${data.continueUrl}">${data.continueUrl}</a></p>
        </div>
        <div class="footer">
          <div class="brand">Bib1s - Giải pháp quản lý giải đấu thể thao chuyên nghiệp</div>
          <div class="contact">📞 <a href="tel:0918226017">0918 226 017</a></div>
          <div class="contact">📘 <a href="https://facebook.com/bib1s" target="_blank">facebook.com/bib1s</a></div>
          <div class="unsub">Email này được gửi tự động. Vui lòng không trả lời.<br/>
            <a href="${process.env.FRONTEND_URL ?? "http://localhost:5173"}/unsubscribe?email=${encodeURIComponent(data.to)}">Hủy nhận email</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.to,
    subject: `${data.eventName} - Thanh toán đơn hàng #${data.registrationId.slice(-8).toUpperCase()} thành công`,
    html,
  });
}
