# 📖 Panduan Lengkap Pengembang (Developer Comprehensive Guide)
## JEJAK API: WebGIS Peringatan Dini Kebakaran Gambut H-30 Berbasis Jejak Aktivitas Manusia Menggunakan LightGBM dan Explainable AI (TreeSHAP) dengan Verifikasi Lapangan Melalui Drone Langsung

Selamat datang di repositori resmi **JEJAK API**. Dokumen ini disusun secara mendalam dan menyeluruh untuk memandu developer, data scientist, dan engineer geospasial dalam memahami arsitektur, menjalankan lingkungan pengembangan lokal, menambah fitur baru, memperluas cakupan wilayah, hingga melakukan pemeliharaan di server produksi.

---

## 📑 Daftar Isi
1. [Latar Belakang & Visi Arsitektur](#1-latar-belakang--visi-arsitektur)
2. [Peta Struktur Repositori](#2-peta-struktur-repositori)
3. [Arsitektur Komponen Sistem](#3-arsitektur-komponen-sistem)
   - [3.1 Backend: FastAPI + In-Process DuckDB](#31-backend-fastapi--in-process-duckdb)
   - [3.2 Frontend: React 18 + MapLibre GL JS + PMTiles](#32-frontend-react-18--maplibre-gl-js--pmtiles)
   - [3.3 Pipeline Machine Learning & Explainable AI](#33-pipeline-machine-learning--explainable-ai)
4. [Panduan Menjalankan Lingkungan Lokal](#4-panduan-menjalankan-lingkungan-lokal)
   - [Opsi A: Menggunakan Docker Compose (Direkomendasikan)](#opsi-a-menggunakan-docker-compose-direkomendasikan)
   - [Opsi B: Menjalankan Manual (Native Python & Node.js)](#opsi-b-menjalankan-manual-native-python--nodejs)
5. [Panduan Menambah Episentrum / Wilayah Pantauan Baru](#5-panduan-menambah-episentrum--wilayah-pantauan-baru)
6. [Panduan Menambah Fitur & Layer Peta Baru](#6-panduan-menambah-fitur--layer-peta-baru)
7. [Pengujian, Standar Kode & CI/CD](#7-pengujian-standar-kode--cicd)
8. [Panduan Deployment VPS Production](#8-panduan-deployment-vps-production)
9. [FAQ & Troubleshooting Teknis](#9-faq--troubleshooting-teknis)

---

## 1. Latar Belakang & Visi Arsitektur

### 1.1 The Critical Blindspot (Kelemahan Sistem Eksisting)
Sistem peringatan kebakaran hutan dan lahan (karhutla) konvensional di Indonesia (seperti BMKG SPARTAN) bertumpu pada *Fire Weather Index* (FWI) dari Kanada yang hanya memperhitungkan faktor meteorologis murni (suhu, curah hujan, angin, dan kelembapan). 

Pada lahan gambut tropis (*tropical peatlands*), bukti empiris saintifik (*Di Giuseppe et al., 2020*) membuktikan:
> **"Hanya ~20% karhutla terjadi saat FWI berada pada 10% tertinggi. Sekitar 80% sisanya dipicu oleh jejak aktivitas manusia di atas lahan."**

Ketika musim kemarau tiba, seluruh bentang kubah gambut mengering secara seragam sehingga sistem berbasis cuaca menandai jutaan hektare sebagai "Bahaya Merah". Hal ini memicu kebingungan taktis bagi regu patroli darat (Manggala Agni / Daops): **dari ribuan kotak yang rawan, kotak mana yang harus diprioritaskan untuk dipatroli minggu ini?**

### 1.2 Pendekatan Solusi JEJAK API
JEJAK API memadukan **14 Fitur Antropogenik** (kerapatan kanal drainase gambut, jarak ke koridor jalan, jarak ke sungai, bukaan tutupan kanopi) dengan **Kondisi Cuaca (FWI)** menggunakan algoritma **LightGBM** yang dikalibrasi (*Isotonic / Platt Scaling*, ECE = 0.0051) dan dijelaskan secara lokal per kotak 1 km² menggunakan **TreeSHAP (Explainable AI)**, diverifikasi langsung menggunakan **Pemantauan Drone Lapangan**.

### 1.3 Prinsip Utama Arsitektur: *Decoupled Pre-computation GIS*
Sistem ini menggunakan prinsip **Pemisahan Komputasi Berat (Offline)** dan **Penyajian Data Cepat (Online Serving)**:
- **Offline / Batch Processing:** Pengambilan citra satelit (Sentinel-1 SAR, Sentinel-2, ERA5, CHIRPS), pelatihan LightGBM, kalkulasi SHAP value per sel, dan kompilasi ubin vektor PMTiles dilakukan secara offline.
- **Online Serving:** Backend FastAPI membaca file `parquet` secara in-memory menggunakan **DuckDB** (<20 ms per kueri), dan peramban merender ubin vektor melalui **PMTiles HTTP Byte-Range Requests** tanpa memerlukan server GIS berat (seperti GeoServer atau Mapbox GL Server berbayar).

---

## 2. Peta Struktur Repositori

```text
JejakApi/
├── .env.example                     # Contoh variabel lingkungan
├── docker-compose.yml               # Konfigurasi container backend & frontend
├── package.json                     # Root orchestrator script
├── README.md                        # Dokumentasi ringkasan dan badge proyek
├── start.sh                         # Skrip one-click startup lokal
│
├── docs/                            # Dokumentasi teknis komprehensif
│   ├── ARCHITECTURE.md              # Spesifikasi teknis arsitektur sistem
│   ├── DEPLOYMENT_GUIDE.md          # Panduan deployment VPS production
│   ├── DEVELOPER_GUIDE.md           # Panduan lengkap onboarding developer (file ini)
│   ├── PRD.md                       # Product Requirements Document
│   ├── DEMO_PITCH_GUIDE.md          # Panduan presentasi demo hackathon
│   ├── CODING_STANDARDS.md          # Standar penulisan kode & linting
│   ├── CODE_REVIEW_GUIDE.md         # Checklist tinjauan kode
│   └── SECURITY_REVIEW_GUIDE.md     # Panduan keamanan sistem
│
├── backend/                         # Backend Engine (Python 3.11 + FastAPI + DuckDB)
│   ├── app/
│   │   ├── api/                     # Router API endpoints
│   │   │   ├── alerts.py            # Rekomendasi Top-k sel rawan & ekspor CSV
│   │   │   ├── cells.py             # Kueri detail 1 km² sel & pencarian nama desa/KHG
│   │   │   ├── drone.py             # Rute misi drone, telemetri, & status standby
│   │   │   ├── health.py            # Health-check probe
│   │   │   ├── live.py              # Hotspot NASA FIRMS NRT & Open-Meteo cuaca
│   │   │   ├── model.py             # Metrik evaluasi model (AUC-ROC, ECE, SHAP)
│   │   │   ├── patrol.py            # Optimasi alokasi regu patroli darat
│   │   │   └── stats.py             # Statistik nasional (Bahaya, Siaga, Waspada)
│   │   ├── core/                    # Konfigurasi aplikasi & koneksi database
│   │   │   ├── config.py            # Pydantic BaseSettings (.env loading)
│   │   │   └── database.py          # Singleton DuckDB in-process engine
│   │   ├── services/                # Logika bisnis terisolasi
│   │   │   ├── duckdb_service.py    # Abstraksi kueri analitik Parquet
│   │   │   ├── firms_service.py     # Integrasi satelit NASA FIRMS NRT
│   │   │   ├── gemini_explainer.py  # AI Synthesizer penjelasan naratif TreeSHAP
│   │   │   └── telegram_service.py  # Notifikasi push peringatan dini Daops
│   │   └── main.py                  # Entrypoint FastAPI & CORS middleware
│   ├── data/                        # Dataset Parquet & GeoJSON produksi
│   │   ├── oki_risk_latest.parquet  # 55.532 sel nasional dengan nilai risiko & SHAP
│   │   └── live_hotspots_latest.json# Cache hotspot satelit terkini
│   ├── tests/                       # Unit & integration test suite (119 test cases)
│   ├── Dockerfile                   # Docker build backend
│   └── requirements.txt             # Dependensi Python
│
├── frontend/                        # Frontend WebGIS (React 18 + Vite + MapLibre + Tailwind)
│   ├── public/
│   │   ├── favicon.svg              # Logo vektor Jejak Api
│   │   └── tiles/
│   │       └── oki_risk_latest.pmtiles # Ubin vektor 55.532 sel (Z3-Z14, ~36 MB)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/
│   │   │   │   └── TopHeader.jsx    # Navbar atas, search bar, stats, & tour button
│   │   │   ├── Map/
│   │   │   │   └── MapViewer.jsx    # WebGL MapLibre canvas & layer orchestrator
│   │   │   ├── Sidebar/
│   │   │   │   ├── LeftSidebar.jsx  # Menu alat (Basemap, Replay, Drone, Konversi)
│   │   │   │   └── RightInspector.jsx # Panel inspeksi TreeSHAP & legenda risiko
│   │   │   ├── Info/
│   │   │   │   └── PocScopeModal.jsx# Modal penjelasan cakupan 6 wilayah nasional
│   │   │   └── Tour/
│   │   │       └── TourGuide.jsx    # Joyride interaktif 8 langkah fitur utama
│   │   ├── services/
│   │   │   ├── api.js               # Klien Axios dengan relative path proxy (/api/)
│   │   │   └── monitoring.js        # Pelaporan error Sentry
│   │   ├── App.jsx                  # State manager global & layout shell
│   │   └── main.jsx                 # Entrypoint React DOM
│   ├── nginx.conf                   # Template konfigurasi Nginx HTTP Byte-Range
│   ├── package.json                 # Dependensi frontend & script build
│   └── vite.config.js               # Konfigurasi Vite & proxy backend lokal
│
└── ml_pipeline/                     # Machine Learning & Geoprocessing Pipeline
    ├── data/                        # Sumber data mentah & olahan
    ├── jejak_pipeline/
    │   ├── feature_engineering.py   # Ekstraksi fitur antropogenik & cuaca FWI
    │   ├── modeling.py              # Pelatihan LightGBM, tuning, & kalibrasi
    │   └── shap_explainer.py        # Kalkulasi TreeSHAP local explainer
    ├── extract_features.py          # Pipeline ekstraksi raster/vektor ke GeoParquet
    ├── train_lgbm.py                # Pipeline pelatihan model & ekspor Parquet
    └── export_pmtiles.py            # Konversi GeoParquet -> GeoJSON -> Tippecanoe PMTiles
```

---

## 3. Arsitektur Komponen Sistem

### 3.1 Backend: FastAPI + In-Process DuckDB
- **Engine Database:** Backend tidak menggunakan PostgreSQL/PostGIS yang membutuhkan alokasi RAM besar dan proses daemon terpisah. Sebaliknya, kami menggunakan **DuckDB** yang berjalan *in-process* di dalam proses Python.
- **Format Data:** Data 55.532 sel disimpan dalam file kolumnar berkecepatan tinggi `backend/data/oki_risk_latest.parquet` (~4.8 MB terkompresi Snappy).
- **Performa Kueri:** Kueri agregasi spasial, pengurutan Top-k, atau filter Kesatuan Hidrologis Gambut (KHG) dieksekusi dalam waktu **< 15–20 milidetik**.
- **Live Hotspot Satelit:** Mengambil data aktif dari satelit **VIIRS S-NPP (NASA FIRMS NRT)** setiap 15 menit dan menyimpannya dalam cache memori lokal sehingga sistem tidak mengalami penolakan *rate-limit* dari NASA.

#### Endpoint API Utama:
| Rute API | Metode | Deskripsi |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Cek status liveness probe dan integritas koneksi DuckDB. |
| `/api/cells/{cell_id}` | `GET` | Mengambil data lengkap 1 km² sel: skor risiko, kategori, 14 variabel input, dan skor kontribusi 3 faktor TreeSHAP. |
| `/api/cells/search?q={query}` | `GET` | Pencarian multi-kriteria (ID sel, nama desa, nama KHG, atau koordinat `lat,lon`). |
| `/api/alerts/top-k?k=50` | `GET` | Menghitung Top-k sel paling rawan kebakaran dengan batasan aksesibilitas jalan/sungai untuk tim Daops. |
| `/api/alerts/export/csv` | `GET` | Mengunduh rute prioritas patroli dalam format CSV siap impor ke GPS Garmin lapangan. |
| `/api/live/hotspots` | `GET` | Data titik api aktif satelit NASA FIRMS terkini yang telah disaring khusus wilayah Indonesia. |
| `/api/drone/status` & `/missions` | `GET/POST` | Status stasiun drone (docking, charging, flight mission) dan daftar titik koordinat waypoint terbang. |
| `/api/model/performance` | `GET` | Metrik saintifik lengkap: AUC-ROC (0.841), ECE (0.0051), Brier Score, dan perbandingan dengan model cuaca murni. |

---

### 3.2 Frontend: React 18 + MapLibre GL JS + PMTiles
- **Mesin Peta WebGL:** Menggunakan **MapLibre GL JS** (fork open-source dari Mapbox GL) yang merender puluhan ribu poligon langsung di GPU klien pada 60 FPS.
- **Protokol PMTiles v4:** Menggunakan format arsip ubin tunggal (`.pmtiles`). Browser hanya meminta rentang byte spesifik (*HTTP Byte-Range Requests*) untuk kotak koordinat layar yang sedang dilihat, sehingga menghemat bandwidth server secara drastis.
- **Hierarki Lapisan (*Layer Stacking Order*) Peta:**
  Agar mapping, garis area, dan titik api **selalu muncul secara bersamaan tanpa saling menghilangkan**, urutan lapisan diatur secara ketat di [MapViewer.jsx](file:///Users/rivaldigunawanyusuf/Documents/JejakApi/frontend/src/components/Map/MapViewer.jsx):
  1. `national-epicenter-glow`: Efek halo radar luar di sekeliling wilayah pantauan.
  2. `national-epicenter-fill`: Lapisan pewarnaan latar belakang yang sangat lembut (*opacity 0.12–0.18*) agar tidak menutupi sel di atasnya.
  3. `oki-risk-fill`: **Lapisan Utama 55.532 Sel Kisi Mikro 1 km²** dengan gradien warna 7-stop (Hijau, Kuning, Oranye, Merah) yang **aktif 100% pada semua zoom level (Z3–Z16)**.
  4. `oki-risk-line`: Garis batas kisi halus antar sel untuk estetika GIS modern.
  5. `national-epicenter-line`: Garis putus-putus (*dashed border*) batas terluar wilayah yang membingkai setiap teritori.
  6. `hotspots-points` & `hotspots-pulse`: Titik api aktif satelit NASA FIRMS dengan animasi gelombang radar menyala.
- **Responsivitas Multi-Device:**
  - **Layar HP (< 768px):** Menu pencarian dibuka via drawer mengambang yang rapi; memilih wilayah tidak akan memblokir peta melainkan memperbarui pill info di bagian bawah layar; panel inspeksi dapat dibuka lewat bottom sheet modal beranimasi halus.
  - **Layar Tablet & Desktop (≥ 768px):** Search bar menetap di header; panel inspeksi samping dapat diciutkan (*docked*) atau diperluas dengan tombol toggle satu klik.

---

### 3.3 Pipeline Machine Learning & Explainable AI
- **Dataset Pelatihan:** Grid 1 km² mencakup data multi-tahun historis karhutla El Niño 2015, 2019, dan 2023.
- **Validasi Silang Khusus (*Spatial Block Cross-Validation*):**
  Untuk mencegah kebocoran data spasial (*spatial autocorrelation leak*), pembagian fold dilakukan per blok **Kesatuan Hidrologis Gambut (KHG)**, bukan secara acak biasa.
- **Kalibrasi Isotonik (*Probability Calibration*):**
  Model pohon keputusan standar cenderung menghasilkan skor probabilitas yang terlalu percaya diri (*overconfident*). Kami menerapkan kalibrasi probabilitas sehingga nilai 70% benar-benar berarti 7 dari 10 kejadian di lapangan menghasilkan kebakaran. Nilai *Expected Calibration Error* (ECE) ditekan hingga **0.0051**.
- **Explainable AI (TreeSHAP):**
  Setiap sel memiliki 3 faktor pemicu lokal (*local feature attributions*). Sebagai contoh:
  - *Faktor 1:* Kanal drainase buatan berjarak < 300 meter (+0.0594 probabilitas).
  - *Faktor 2:* Defisit curah hujan 30 hari kumulatif (+0.0412 probabilitas).
  - *Faktor 3:* Jarak ke koridor akses jalan perkebunan (+0.0357 probabilitas).

---

## 4. Panduan Menjalankan Lingkungan Lokal

### Opsi A: Menggunakan Docker Compose (Direkomendasikan)
Cara tercepat untuk menjalankan seluruh ekosistem tanpa perlu menginstal dependensi Python atau Node.js secara manual:

1. Pastikan Docker & Docker Compose sudah terpasang di komputer Anda.
2. Salin variabel lingkungan:
   ```bash
   cp .env.example .env
   ```
3. Jalankan container:
   ```bash
   docker compose up --build
   ```
4. Buka di peramban:
   - **Frontend WebGIS:** `http://localhost:5173`
   - **Swagger API Docs:** `http://localhost:8000/docs`
   - **Health Check:** `http://localhost:8000/api/health`

---

### Opsi B: Menjalankan Manual (Native Python & Node.js)

#### 1. Persiapan Backend:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Di Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Jalankan FastAPI server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Persiapan Frontend:
Buka tab terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Frontend akan berjalan di `http://localhost:5173` dan otomatis mem-proxy panggilan `/api/*` ke `http://localhost:8000`.

#### 3. Menggunakan Script Otomatis:
Di direktori utama project, Anda juga dapat menjalankan:
```bash
./start.sh
```

---

## 5. Panduan Menambah Episentrum / Wilayah Pantauan Baru

Saat ini sistem mencakup **6 Wilayah Pantauan Nasional (55.532 Titik Pantau ~5,55 Juta Hektare)**:
1. Sumatera Selatan (OKI) - 17.927 sel
2. Kalimantan Tengah (Pulang Pisau & Palangka Raya) - 9.762 sel
3. Kalimantan Barat (Ketapang & Kubu Raya) - 8.734 sel
4. Papua Selatan (Merauke) - 9.848 sel
5. Papua Barat Daya (Sorong) - 7.806 sel
6. Sulawesi Selatan (Maros & Pangkep) - 1.455 sel

Jika Anda ingin menambahkan wilayah pantauan baru (misalnya: **Riau** atau **Jambi**), ikuti langkah-langkah berikut:

### Langkah 1: Ekstraksi Data Grid Spasial 1 km²
Gunakan skrip di `ml_pipeline/extract_features.py` untuk mengekstrak atribut wilayah baru:
- Batas poligon Kesatuan Hidrologis Gambut (KHG) dari Kementerian LHK.
- Jaringan kanal drainase perkebunan (dari citra Sentinel-2 / Stanford SDR).
- Jaringan jalan dan sungai dari OpenStreetMap.
- Data iklim ERA5-Land & curah hujan CHIRPS 30 hari.

### Langkah 2: Inferensi & Kalkulasi TreeSHAP
Jalankan inferensi LightGBM menggunakan model yang sudah dilatih:
```bash
python ml_pipeline/train_lgbm.py --append-region riau
```
Skrip ini akan menambahkan baris sel baru ke `backend/data/oki_risk_latest.parquet` dan menghasilkan file GeoJSON perantara `ml_pipeline/data/processed/oki_risk_latest.geojson`.

### Langkah 3: Kompilasi Ubin Vektor PMTiles Baru
Gunakan tool `tippecanoe` untuk mengompilasi GeoJSON menjadi ubin vektor multi-skala (Zoom 3 sampai 14):
```bash
tippecanoe -o frontend/public/tiles/oki_risk_latest.pmtiles \
  -l oki_risk \
  -Z3 -z14 \
  --no-tile-size-limit \
  --no-feature-limit \
  --no-tiny-polygon-reduction \
  --force \
  ml_pipeline/data/processed/oki_risk_latest.geojson
```

### Langkah 4: Daftarkan Wilayah di Frontend
Buka file [frontend/src/components/Map/MapViewer.jsx](file:///Users/rivaldigunawanyusuf/Documents/JejakApi/frontend/src/components/Map/MapViewer.jsx) dan tambahkan objek koordinat wilayah pada array `REGION_JUMPS`:
```javascript
{
  id: 'riau',
  name: 'Riau: Siak & Bengkalis',
  shortName: 'Riau',
  island: 'Sumatera',
  province: 'Riau',
  center: [102.15, 1.25],
  zoom: 8.8,
  cells: '12.450 Sel',
  badge: 'Ekspansi',
  dot: '#f59e0b',
  riskCategory: 'Siaga',
}
```
Tambahkan pula nama wilayah tersebut ke [frontend/src/components/Info/PocScopeModal.jsx](file:///Users/rivaldigunawanyusuf/Documents/JejakApi/frontend/src/components/Info/PocScopeModal.jsx).

---

## 6. Panduan Menambah Fitur & Layer Peta Baru

### 6.1 Menambah Endpoint Baru di Backend
1. Buat router baru di `backend/app/api/nama_fitur.py`:
   ```python
   from fastapi import APIRouter
   from app.core.database import db_engine

   router = APIRouter(prefix="/api/fitur-baru", tags=["Fitur Baru"])

   @router.get("/")
   async def get_fitur():
       df = db_engine.conn.execute("SELECT COUNT(*) FROM cells_view").df()
       return {"total": int(df.iloc[0, 0])}
   ```
2. Daftarkan router tersebut di `backend/app/main.py`:
   ```python
   from app.api import nama_fitur
   app.include_router(nama_fitur.router)
   ```
3. Buat pengujian otomatis di `backend/tests/test_nama_fitur.py`.

### 6.2 Menambah Layer Baru di MapLibre
Buka `frontend/src/components/Map/MapViewer.jsx`:
1. Tambahkan data source di dalam fungsi `addOverlayLayers` atau `addRiskLayers`:
   ```javascript
   if (!map.getSource('my-new-source')) {
     map.addSource('my-new-source', {
       type: 'geojson',
       data: myGeoJsonData,
     });
   }
   ```
2. Tambahkan layer render:
   ```javascript
   if (!map.getLayer('my-new-layer')) {
     map.addLayer({
       id: 'my-new-layer',
       type: 'fill', // atau 'line', 'circle', 'heatmap'
       source: 'my-new-source',
       paint: {
         'fill-color': '#38bdf8',
         'fill-opacity': 0.6,
       },
     });
   }
   ```
3. Sambungkan toggle visibilitas layer dengan state React di `LeftSidebar.jsx`.

---

## 7. Pengujian, Standar Kode & CI/CD

### 7.1 Backend Unit & Integration Tests (Pytest)
Backend dilengkapi dengan 119 test cases yang memvalidasi kueri DuckDB, endpoint REST, format respon Pydantic, dan penanganan error:
```bash
cd backend
pytest -v
```

### 7.2 Frontend Build & Lint Verification
Pastikan build produksi berhasil tanpa peringatan pemutusan modul:
```bash
cd frontend
npm run build
```
Perintah ini akan mengompilasi bundel statis ke `frontend/dist/` dan otomatis menyalin berkas `oki_risk_latest.pmtiles` ke `frontend/dist/tiles/`.

---

## 8. Panduan Deployment VPS Production

Untuk panduan mendalam tentang deployment server, Nginx reverse proxy, dan sertifikat SSL, silakan merujuk pada dokumen **[docs/DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**.

### Perintah One-Line Update VPS:
Perintah berikut dirancang **100% aman dan terisolasi** untuk direktori project tanpa mematikan proses PM2 atau Docker dari aplikasi lain di VPS Anda:

```bash
cd /var/www/jejak-api-demo && git checkout -- frontend/package-lock.json 2>/dev/null && git pull origin main && (docker compose up -d --build backend 2>/dev/null || docker compose restart backend 2>/dev/null || sudo systemctl restart jejak-api 2>/dev/null || true) && (cd frontend && npm install && npm run build && mkdir -p dist/tiles && cp -f public/tiles/oki_risk_latest.pmtiles dist/tiles/ && chmod -R 755 dist && chmod 644 dist/tiles/oki_risk_latest.pmtiles) && (sudo systemctl reload nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true) && (sleep 2 && curl -sf http://localhost:8000/api/health >/dev/null && echo "✅ Backend Sehat!") && (curl -sf "http://localhost:8000/api/live/hotspots?only_epicenters=true" >/dev/null && echo "🛰️ Titik Api NASA FIRMS Aktif!") && echo "🎉 Update Berhasil! Sistem Siap Digunakan!"
```

---

## 9. FAQ & Troubleshooting Teknis

### Q1: Mengapa peta tampak hitam atau ubin PMTiles gagal dimuat di browser?
- **Penyebab:** Nginx di VPS belum mengonfigurasi header `Accept-Ranges bytes` atau header CORS. Format PMTiles mewajibkan server web mengizinkan pembacaan potongan byte (*HTTP 206 Partial Content*).
- **Solusi:** Pastikan blok Nginx Anda memiliki direktif berikut:
  ```nginx
  location ~* \.(pmtiles)$ {
      try_files $uri =404;
      add_header Access-Control-Allow-Origin * always;
      add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
      add_header Access-Control-Allow-Headers "Range, If-Match, If-Modified-Since" always;
      add_header Access-Control-Expose-Headers "Content-Range, Content-Length, Accept-Ranges" always;
      add_header Accept-Ranges bytes always;
  }
  ```

### Q2: Mengapa sel risiko tidak muncul saat zoom out ke level seluruh Indonesia?
- **Penyebab:** Pada versi awal, kisi sel dimatikan pada zoom < 5.5.
- **Solusi:** Di versi terbaru, `oki-risk-fill` di `MapViewer.jsx` telah diatur dengan rentang zoom `3.0 s/d 16.0` dengan opasitas `0.85` dan lapisan siluet `national-epicenter-fill` diturunkan ke `0.12–0.18` sehingga warna kisi sel selalu tampak tajam di level nasional sekalipun.

### Q3: Bagaimana jika API Key NASA FIRMS habis limit kuerinya?
- **Solusi:** Backend telah dilengkapi modul *fail-safe cache* di `backend/app/services/firms_service.py`. Jika panggilan NASA mengalami timeout atau limit habis, backend otomatis menyajikan cache data satelit terakhir dari `backend/data/live_hotspots_latest.json` tanpa menyebabkan error 500 pada antarmuka pengguna.

---
*Dokumen ini diperbarui secara berkala oleh Tim Pengembang JEJAK API.*  
*Untuk pertanyaan teknis dan kontribusi, silakan ajukan issue atau pull request melalui GitHub repository.*
