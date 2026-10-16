# 🚀 Panduan Deployment Produksi (Production Deployment Guide)

Dokumen ini memuat panduan komprehensif untuk melakukan deployment awal dan pembaruan (*rolling update*) aplikasi **JEJAK API** pada server Linux / VPS (Ubuntu 22.04 LTS atau sejenisnya).

---

## ⚡ 1. Panduan Pembaruan Cepat (Rolling Update)

Jalankan perintah berikut di direktori proyek pada server untuk menarik pembaruan kode terbaru dari Git, memperbarui build frontend, memastikan ubin PMTiles termuat, me-restart backend, dan memverifikasi kesehatan sistem:

```bash
git pull origin main
docker compose up -d --build backend
cd frontend && npm install && npm run build
sudo systemctl reload nginx
```

---

## 🔬 2. Penjelasan Tahapan Eksekusi

Prosedur pembaruan di atas menjalankan tahapan terstruktur:

| Langkah | Perintah | Fungsi & Penjelasan |
| :---: | :--- | :--- |
| **1** | `git pull origin main` | Menarik commit dan pembaruan kode terbaru dari branch `main` GitHub. |
| **2** | `docker compose up -d --build backend` | Membangun ulang dan me-restart container backend FastAPI + DuckDB di latar belakang. |
| **3** | `cd frontend && npm install && npm run build` | Mengompilasi kode React + Vite ke aset statis optimal di `dist/` serta menyalin ubin vektor PMTiles. |
| **4** | `sudo systemctl reload nginx` | Memuat ulang konfigurasi web server Nginx tanpa downtime. |
| **5** | `curl -sf http://localhost:8000/api/health` | Melakukan verifikasi *health-check* mandiri: memastikan FastAPI berjalan normal. |

---

## ⚙️ 3. Konfigurasi Nginx VPS (Reverse Proxy & HTTP Range)

Jika Anda mengatur konfigurasi virtual host Nginx untuk JEJAK API (misal: `/etc/nginx/sites-available/jejak-api`), pastikan blok konfigurasi memiliki dukungan **HTTP Byte-Range** untuk ubin `.pmtiles` dan reverse proxy `/api/`:

```nginx
server {
    listen 80;
    server_name jejak-api.yourdomain.com; # Ganti dengan domain atau IP VPS Anda

    root /var/www/jejak-api/frontend/dist;
    index index.html;

    # Gzip Compression untuk transfer JSON & script cepat
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # 1. Penyajian Static PMTiles dengan HTTP Byte-Range Requests (Wajib untuk MapLibre)
    location ~* \.(pmtiles)$ {
        try_files $uri =404;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, If-Match, If-Modified-Since" always;
        add_header Access-Control-Expose-Headers "Content-Range, Content-Length, Accept-Ranges" always;
        add_header Accept-Ranges bytes always;
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # 2. Reverse Proxy ke Backend FastAPI (Port 8000)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # 3. Single Page Application (SPA) Fallback untuk React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Setelah memperbarui konfigurasi Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🛡️ 4. Variabel Lingkungan (`.env`)

File `.env` di root `/var/www/jejak-api/.env` berisi:

```env
ENVIRONMENT=production
FASTAPI_PORT=8000
DATA_PARQUET_PATH=/var/www/jejak-api/backend/data/oki_risk_latest.parquet

# NASA FIRMS Near-Real-Time Active Fire VIIRS 375m
NASA_FIRMS_MAP_KEY=your_nasa_firms_map_key_here
FIRMS_MAP_KEY=your_nasa_firms_map_key_here

# Optional Notifier & AI Keys
TELEGRAM_BOT_TOKEN=
GEMINI_API_KEY=
```

---

## 🩺 5. Panduan Pengecekan & Pemecahan Masalah (Troubleshooting)

### A. Memeriksa Status Backend
```bash
# Uji endpoint health
curl -s http://localhost:8000/api/health | jq .

# Uji endpoint live hotspots satelit NASA
curl -s "http://localhost:8000/api/live/hotspots?only_epicenters=true" | jq '.metadata'
```

### B. Memeriksa Log Container Backend
```bash
cd /var/www/jejak-api
docker compose logs -f --tail=50 backend
```

### C. Ubin Peta PMTiles Tidak Muncul (Status 404 pada Console)
Pastikan file `oki_risk_latest.pmtiles` telah disalin ke `frontend/dist/tiles/`:
```bash
ls -lh /var/www/jejak-api/frontend/dist/tiles/
# Jika kosong, salin manual:
cp -f /var/www/jejak-api/frontend/public/tiles/oki_risk_latest.pmtiles /var/www/jejak-api/frontend/dist/tiles/
chmod 644 /var/www/jejak-api/frontend/dist/tiles/oki_risk_latest.pmtiles
```

### D. Hard Refresh di Browser Klien
Jika browser klien masih menyimpan cache Javascript lama, lakukan **Hard Reload**:
- **Windows / Linux:** `Ctrl + F5` atau `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
