# Hướng dẫn Deploy lên VPS Ubuntu 22

## 1. Chuẩn bị VPS

```bash
# Cài Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

## 2. Upload code lên VPS

```bash
# Trên máy local
scp -r bib-register/ user@your-vps-ip:/home/user/
```

Hoặc dùng git:
```bash
git clone your-repo /home/user/bib-register
```

## 3. Cấu hình môi trường

```bash
cd /home/user/bib-register/backend
cp .env .env.production
nano .env.production
```

Cập nhật các giá trị sau trong `.env.production`:
- `DATABASE_URL` — thay đổi password mạnh hơn
- `JWT_SECRET` — chuỗi random dài ≥ 32 ký tự
- `SEPAY_API_TOKEN` — token thật từ SePay
- `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_NAME`, `SEPAY_ACCOUNT_NAME`
- `SEPAY_WEBHOOK_SECRET`
- `SMTP_USER`, `SMTP_PASS` — Gmail App Password
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`
- `FRONTEND_URL` — domain của bạn

## 4. Khởi động

```bash
cd /home/user/bib-register
docker compose up -d --build
```

## 5. Seed admin đầu tiên

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

Tài khoản mặc định:
- Email: `admin@bibregister.com`
- Password: `admin123456`

**Đổi password ngay sau khi đăng nhập!**

## 6. Cài HTTPS với Nginx + Certbot (ngoài Docker)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Tạo config nginx reverse proxy
sudo nano /etc/nginx/sites-available/bib-register
```

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bib-register /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

## 7. Cấu hình SePay Webhook

Trong dashboard SePay, thiết lập webhook URL:
```
https://yourdomain.com/api/payments/webhook/sepay
```

## 8. Xem logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```
