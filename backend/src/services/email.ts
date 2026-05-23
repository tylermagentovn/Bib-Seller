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

interface ConfirmationEmailData {
  to: string;
  fullName: string;
  eventName: string;
  distanceName: string;
  bibNumber: number;
  registrationId: string;
  eventDate?: string | null;
  location?: string | null;
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
        .footer { background: #f9f9f9; padding: 20px 32px; text-align: center; color: #999; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Đăng ký thành công!</h1>
          <p>Chào mừng bạn đến với ${data.eventName}</p>
        </div>
        <div class="body">
          <p>Xin chào <strong>${data.fullName}</strong>,</p>
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
          </table>
          <p style="color:#666; font-size:14px;">Vui lòng mang theo email này hoặc số BIB vào ngày thi đấu. Chúc bạn thi đấu thật tốt!</p>
        </div>
        <div class="footer">
          Email này được gửi tự động từ hệ thống BIB Register. Vui lòng không trả lời email này.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.to,
    subject: `[BIB #${data.bibNumber}] Xác nhận đăng ký ${data.eventName}`,
    html,
  });
}
