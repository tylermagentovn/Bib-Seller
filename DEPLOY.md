# Hướng dẫn Deploy lên VPS Ubuntu 22 (Nginx + PM2)

## Yêu cầu hệ thống

- Ubuntu 22.04
- 1 CPU, 1 GB RAM (bật swap 1GB trước khi deploy)
- Domain đã trỏ A record về IP của VPS

---

## 0. Bật Swap (quan trọng với VPS 1GB RAM)

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 1. Chuẩn bị VPS

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Git
sudo apt install -y git
```

---

## 2. Cấu hình PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE bib_register;
CREATE USER bib_user WITH PASSWORD 'Kinightaka123';
GRANT ALL PRIVILEGES ON DATABASE bib_register TO bib_user;
\q
```

---

## 3. Clone code về VPS

```bash
git clone <repo_url> /var/www/bib-register
cd /var/www/bib-register
```

---

## 4. Cấu hình Backend

```bash
cd /var/www/bib-register/backend
```

Tạo file `.env`:

```env
DATABASE_URL="postgresql://bib_user:Kinightaka123@localhost:5432/bib_register"
JWT_SECRET="hkvihXbc1w3oagoscr4YaWkETcoLd8VBD6UxD329x1O"
PORT=3001
NODE_ENV=production

# SePay
SEPAY_API_TOKEN=
SEPAY_BANK_ACCOUNT=
SEPAY_BANK_NAME=
SEPAY_ACCOUNT_NAME=
SEPAY_WEBHOOK_SECRET=

# PayOS
PAYOS_CLIENT_ID=""
PAYOS_API_KEY=""
PAYOS_CHECKSUM_KEY=""

# Email (Gmail App Password)
SMTP_USER=
SMTP_PASS=

# Google Sheets (nếu dùng)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=

FRONTEND_URL=https://yourdomain.com
```

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
```

Start với PM2:

```bash
pm2 start dist/index.js --name bib-backend
pm2 save
pm2 startup
# Chạy lệnh mà pm2 startup in ra màn hình
```

---

## 5. Seed admin lần đầu

```bash
cd /var/www/bib-register/backend
npx tsx prisma/seed.ts
```

Tài khoản mặc định:
- Email: `admin@bibregister.com`
- Password: `admin123456`

> **Đổi password ngay sau khi đăng nhập!**

---

## 6. Build Frontend

```bash
cd /var/www/bib-register/frontend
```

Tạo file `.env.production`:

```env
VITE_API_URL=https://yourdomain.com/api
```

```bash
npm install
npm run build
```

---

## 7. Cấu hình Nginx

Tạo file `/etc/nginx/sites-available/bib-register`:

```nginx
server {
    listen 80;
    server_name bib1s.com www.bib1s.com;

    # Serve frontend (React SPA)
    root /var/www/bib-register/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded files từ backend
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
    }

    # Proxy API sang backend
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload file size
    client_max_body_size 20M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bib-register /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS với Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bib1s.com -d www.bib1s.com
sudo certbot renew --dry-run
```

---

## 9. Cấu hình SePay Webhook

Trong dashboard SePay, thiết lập webhook URL:

```
https://yourdomain.com/api/payments/webhook/sepay
```

---

## 10. Kiểm tra sau deploy

```bash
pm2 status                          # backend đang chạy
pm2 logs bib-backend --lines 50     # không có lỗi
sudo systemctl status nginx         # nginx OK
```

Truy cập trình duyệt:
- `https://yourdomain.com` — frontend load
- `https://yourdomain.com/api/events` — API trả data JSON

---

## Workflow cập nhật code (sau lần đầu)

```bash
cd /var/www/bib-register
git pull

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart bib-backend

# Frontend
cd ../frontend
npm install
npm run build
```

> Làm backend xong mới làm frontend — tránh OOM trên VPS 1GB RAM.

---

## Xem logs

```bash
pm2 logs bib-backend          # logs backend realtime
pm2 logs bib-backend --lines 100  # 100 dòng gần nhất
sudo tail -f /var/log/nginx/error.log   # nginx error
sudo tail -f /var/log/nginx/access.log  # nginx access
```
