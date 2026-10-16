# 🚀 Panduan Deployment & Pembaruan VPS (Production Deployment Guide)

Dokumen ini memuat panduan komprehensif untuk melakukan deployment awal dan pembaruan (*rolling update*) aplikasi **JEJAK API** pada server VPS Linux (Ubuntu 22.04 LTS atau sejenisnya).

> [!IMPORTANT]
> **Isolasi Multi-Project Server:**
> Perintah pembaruan di bawah ini dirancang **100% aman dan terisolasi** untuk direktori project `/var/www/jejak-api-demo`. Prosedur ini **tidak akan merestart PM2 global atau mengganggu project lain** yang sedang berjalan di VPS Anda.

---

## ⚡ 1. One-Line Update Command (Pembaruan Cepat di VPS)

Jalankan perintah satu baris berikut di terminal VPS untuk menarik pembaruan kode terbaru dari Git, memperbarui build frontend, memastikan ubin PMTiles termuat, me-restart backend, dan memverifikasi kesehatan sistem serta data satelit NASA FIRMS:

```bash
cd /var/www/jejak-api-demo && git checkout -- frontend/package-lock.json 2>/dev/null && git pull origin main && (docker compose up -d --build backend 2>/dev/null || docker compose restart backend 2>/dev/null || sudo systemctl restart jejak-api 2>/dev/null || true) && (cd frontend && npm install && npm run build && mkdir -p dist/tiles && cp -f public/tiles/oki_risk_latest.pmtiles dist/tiles/ && chmod -R 755 dist && chmod 644 dist/tiles/oki_risk_latest.pmtiles) && (sudo systemctl reload nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true) && (sleep 2 && curl -sf http://localhost:8000/api/health >/dev/null && echo "✅ Backend Sehat!") && echo "🚀 Update Sukses: Sistem Berhasil Diperbarui!"
```

---

## 🔬 2. Penjelasan Rinci Tahapan Eksekusi

Perintah satu baris di atas menjalankan 7 langkah terstruktur:

| Langkah | Perintah | Fungsi & Penjelasan |
| :---: | :--- | :--- |
| **1** | `cd /var/www/jejak-api-demo` | Masuk ke direktori kerja utama project. |
| **2** | `git checkout -- frontend/package-lock.json && git pull origin main` | Mengembalikan file lock lokal jika ada perubahan otomatis, lalu menarik commit terbaru dari branch `main` GitHub. |
| **3** | `grep -q "NASA_FIRMS_MAP_KEY" .env ...` | Memeriksa ketersediaan API key NASA FIRMS pada file `.env`. Jika belum ada, otomatis menambahkan key valid. |
| **4** | `docker compose up -d --build backend ...` | Memperbarui dan me-restart container backend FastAPI + DuckDB secara terisolasi tanpa menyentuh service lain di server. |
| **5** | `cd frontend && npm install && npm run build` | Mengompilasi kode React + Vite ke aset statis optimal di `dist/` (menggunakan relative API proxy `/api/`). |
| **6** | `mkdir -p dist/tiles && cp -f public/tiles/*.pmtiles dist/tiles/` | Menyalin ubin vektor 55.532 sel PMTiles ke folder `dist/tiles/` agar dapat disajikan langsung oleh Nginx dengan HTTP Byte-Range. |
| **7** | `curl -sf http://localhost:8000/...` | Melakukan verifikasi *health-check* mandiri: memastikan FastAPI berjalan dan endpoint titik api satelit NASA FIRMS mengembalikan data secara valid. |

---

## ⚙️ 3. Konfigurasi Nginx VPS (Reverse Proxy & HTTP Range)

Jika Anda mengatur konfigurasi virtual host Nginx untuk JEJAK API (misal: `/etc/nginx/sites-available/jejak-api`), pastikan blok konfigurasi memiliki dukungan **HTTP Byte-Range** untuk ubin `.pmtiles` dan reverse proxy `/api/`:

```nginx
server {
    listen 80;
    server_name jejak-api.yourdomain.com; # Ganti dengan domain atau IP VPS Anda

    root /var/www/jejak-api-demo/frontend/dist;
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

File `.env` di root `/var/www/jejak-api-demo/.env` berisi:

```env
ENVIRONMENT=production
FASTAPI_PORT=8000
DATA_PARQUET_PATH=/var/www/jejak-api-demo/backend/data/oki_risk_latest.parquet

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
cd /var/www/jejak-api-demo
docker compose logs -f --tail=50 backend
```

### C. Ubin Peta PMTiles Tidak Muncul (Status 404 pada Console)
Pastikan file `oki_risk_latest.pmtiles` telah disalin ke `frontend/dist/tiles/`:
```bash
ls -lh /var/www/jejak-api-demo/frontend/dist/tiles/
# Jika kosong, salin manual:
cp -f /var/www/jejak-api-demo/frontend/public/tiles/oki_risk_latest.pmtiles /var/www/jejak-api-demo/frontend/dist/tiles/
chmod 644 /var/www/jejak-api-demo/frontend/dist/tiles/oki_risk_latest.pmtiles
```

### D. Hard Refresh di Browser Klien
Jika browser klien masih menyimpan cache Javascript lama, lakukan **Hard Reload**:
- **Windows / Linux:** `Ctrl + F5` atau `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
