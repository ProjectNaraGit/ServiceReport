# Service Report Platform

Portal internal untuk mengelola laporan service PT. Kanda Medical Solutions Indonesia. Aplikasi ini memadukan:**

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Axios (cookies httpOnly)
- **Backend**: Go 1.21 (Gin, GORM) + MySQL + JWT + html2canvas/jsPDF/pdf-lib untuk cetak PDF
- **Infrastructure target**: Hostinger VPS (KVM, Ubuntu 22.04) dengan `systemd`, Nginx reverse proxy, dan Let’s Encrypt SSL

Role hierarchy (MASTER_ADMIN → ADMIN → TEKNISI) diimplementasikan melalui middleware backend dan kontrol UI di frontend.

---

## 1. Struktur Repo & Teknologi

```
Web Service Report /
├── backend/                # Go modules, Gin HTTP server
│   ├── cmd/server          # main.go entry point
│   ├── internal/
│   │   ├── config          # env loader, app settings
│   │   ├── database        # connection, migration helpers, seeder
│   │   ├── domain          # bounded contexts (auth, user, report)
│   │   ├── middleware      # auth, role guard
│   │   └── server          # router, http server bootstrap
│   └── pkg                 # bcrypt, jwt, response helper
├── frontend/
│   ├── src
│   │   ├── components      # dashboard widgets, modals, forms
│   │   ├── hooks           # useAuth, useDocumentTitle, dsb
│   │   ├── lib             # API client, media resolver
│   │   ├── pages           # admin + teknisi screens
│   │   └── routes          # react-router config
│   └── vite.config.ts / package.json
└── README.md
```

Fitur utama:

- CRUD user & laporan dengan akses berbasis role
- Draft, upload foto (before/after/problem) & lampiran PDF
- Cetak report 2 halaman + merge lampiran PDF (html2canvas + jsPDF + pdf-lib)
- QR & WhatsApp/email share untuk survei layanan
- Auto-refresh data teknisi/admin (backend GET endpoints) untuk indikator online (per requirement).

---

## 2. Database Schema (MySQL)

Skema standar di bawah dapat dijalankan via `mysql -u root -p < schema.sql`.

```sql
CREATE TABLE roles (
  id TINYINT PRIMARY KEY,
  name VARCHAR(32) UNIQUE,
  description VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id TINYINT NOT NULL,
  parent_id BIGINT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (parent_id) REFERENCES users(id)
);

CREATE TABLE service_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dispatch_no VARCHAR(32) UNIQUE,
  admin_id BIGINT NOT NULL,
  teknisi_id BIGINT NULL,
  customer_name VARCHAR(120),
  customer_address VARCHAR(255),
  customer_contact VARCHAR(120),
  device_name VARCHAR(100),
  serial_number VARCHAR(100),
  device_location VARCHAR(120),
  complaint TEXT,
  action_taken TEXT,
  status ENUM('open','progress','done') DEFAULT 'open',
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (teknisi_id) REFERENCES users(id)
);

CREATE TABLE report_photos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  report_id BIGINT,
  type ENUM('before','after','other') DEFAULT 'other',
  file_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES service_reports(id) ON DELETE CASCADE
);

CREATE TABLE report_status_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  report_id BIGINT,
  changed_by BIGINT,
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

Seeder pertama (lihat `internal/database/seeder.go`) menggunakan `SEED_MASTER_EMAIL` & `SEED_MASTER_PASSWORD` untuk membuat akun MASTER_ADMIN default.

---

## 3. Environment Variables

### Backend `.env`

```env
APP_NAME=Service Report
SERVER_PORT=8080
DB_DSN=user:pass@tcp(127.0.0.1:3306)/service_reports?parseTime=true&loc=Local
JWT_SECRET=super-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=24h
UPLOAD_DIR=./uploads
FRONTEND_URL=http://localhost:5173
SEED_MASTER_EMAIL=master@corp.com
SEED_MASTER_PASSWORD=ChangeMe123!

# SMTP (ubah di production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM="Service Report <your-gmail-address@gmail.com>"
```

Catatan:

- Untuk Gmail gunakan **App Password** (https://myaccount.google.com/apppasswords).
- Di VPS Hostinger, gunakan kredensial MySQL & SMTP perusahaan.

### Frontend `.env`

Pada root `frontend/` buat `.env`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Saat deploy, ganti dengan domain HTTPS API (misal `https://api.domainanda.com/api/v1`). Semua request Axios memakai nilai ini (lihat `src/lib/api.ts`).

---

## 4. Menjalankan di Lokal

### Prasyarat

- Go ≥ 1.21
- Node.js ≥ 20
- MySQL 8 / MariaDB
- npm / pnpm

### Backend

```bash
cp backend/.env.example backend/.env   # sesuaikan nilai
mysql -u root -p -e "CREATE DATABASE service_reports;"   # jika belum ada
cd backend
go mod download
go run ./cmd/server
```

Server berjalan di `http://localhost:8080/api/v1`.

### Frontend

```bash
cd frontend
cp .env.example .env    # buat jika belum ada, isi VITE_API_URL
npm install
npm run dev
```

Vite dev server default di `http://localhost:5173`. Login memakai akun seeder, lalu sesuaikan data master/admin/teknisi.

---

## 5. Workflow Teknis & Fitur Khas

- **Auto update judul tab**: `useDocumentTitle` memastikan judul seperti `Service Report 20260126-202613 (Dispatch no)` sesuai dispatch aktif.
- **Upload foto**: teknisi bisa upload hingga 6 foto problem/before/after (file disimpan pada `UPLOAD_DIR`).
- **Lampiran PDF**: ADMIN/TEKNISI dapat unggah file PDF. Di modal cetak, operator memilih lampiran PDF yang otomatis digabung dengan hasil render 2 halaman (library `html2canvas` + `jsPDF` + `pdf-lib`).
- **Share survei**: Tombol WhatsApp/Email/QR menggunakan `qrSurvey.png` (Safari-friendly) dan link Google Forms sesuai requirement.
- **Auto refresh list**: Halaman Users memanggil endpoint GET setiap 5 detik untuk indikator online.

---

## 6. Deployment ke Hostinger KVM VPS

### 6.1. Persiapan VPS

```bash
ssh root@IP_VPS
sudo apt update && sudo apt upgrade -y
sudo apt install build-essential git curl nginx ufw -y
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Clone repo:

```bash
cd /root
git clone https://github.com/HadHanns/ServiceReport.git
```

### 6.2. Backend (Go)

```bash
sudo snap install go --classic
cd /root/ServiceReport/backend
cp .env.example .env   # isi kredensial production
go build -o service-report ./cmd/server
```

Buat service `/etc/systemd/system/service-report.service`:

```ini
[Unit]
Description=Service Report API
After=network.target

[Service]
User=www-data
WorkingDirectory=/root/ServiceReport/backend
ExecStart=/root/ServiceReport/backend/service-report
Restart=always
EnvironmentFile=/root/ServiceReport/backend/.env

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now service-report
sudo systemctl status service-report
```

### 6.3. Frontend build

```bash
cd /root/ServiceReport/frontend
cp .env.example .env   # set VITE_API_URL production (https://api.domainanda.com/api/v1)
npm install
npm run build
sudo mkdir -p /var/www/service-report
sudo rsync -a dist/ /var/www/service-report/
```

### 6.4. Nginx Reverse Proxy

- API `api.domainanda.com`:

```
server {
  listen 80;
  server_name api.domainanda.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

- Frontend `app.domainanda.com`:

```
server {
  listen 80;
  server_name app.domainanda.com;
  root /var/www/service-report;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass https://api.domainanda.com/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Akftifkan sites, test config, reload:

```bash
sudo ln -s /etc/nginx/sites-available/service-report-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/service-report-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6.5. SSL (Let’s Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.domainanda.com -d app.domainanda.com
sudo systemctl status certbot.timer   # pastikan auto-renew aktif
```

### 6.6. Checklist produksi

- [ ] `.env` berisi kredensial DB/SMTP produksi
- [ ] `service-report` aktif (lihat `journalctl -u service-report -f` untuk logs)
- [ ] `/var/www/service-report` berisi hasil `npm run build`
- [ ] Nginx + SSL berjalan (tes `https://app.domainanda.com`)
- [ ] Firewall hanya membuka 22/80/443

---

## 7. Troubleshooting & FAQ

| Issue | Solusi |
| --- | --- |
| Backend tidak start | Jalankan `journalctl -u service-report -xe`, cek koneksi DB & `DB_DSN`. Pastikan migrasi sudah jalan. |
| Upload lampiran gagal | Pastikan `UPLOAD_DIR` writable oleh `www-data`, cek batas ukuran Nginx (`client_max_body_size`). |
| Frontend tetap memukul API lama | Pastikan `VITE_API_URL` di `.env` sesuai, rebuild (`npm run build`) lalu rsync ulang. |
| Cetak PDF blank | Pastikan domain sudah HTTPS (beberapa browser blokir canvas cross-origin tanpa SSL) dan semua gambar bisa diakses publik. |
| Git push minta kredensial lama | Hapus cache `git credential-osxkeychain erase` lalu set `git config user.name/user.email` baru. |

---

## 8. Testing Checklist

- ✅ Login/logout semua role
- ✅ MASTER_ADMIN membuat admin baru & auto-refresh Users page
- ✅ ADMIN membuat teknisi, assign laporan, unggah lampiran
- ✅ TEKNISI update progres, upload foto, finalize, cetak + merge PDF
- ✅ Notifikasi share survei via WhatsApp/Email/QR
- ✅ Deploy script berjalan (service-report aktif, Nginx + SSL OK)

Jika membutuhkan fitur tambahan (notifikasi realtime, integrasi maps, multi bahasa, dsb.) tinggal lanjutkan pengembangan pada folder backend/frontend sesuai struktur ini.
