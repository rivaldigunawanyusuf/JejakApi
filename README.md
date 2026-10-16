# 🛰️ JEJAK API: WebGIS Peringatan Dini Kebakaran Gambut H-30

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![DuckDB](https://img.shields.io/badge/DuckDB-In--Process-FFF000?style=flat-square&logo=duckdb&logoColor=black)](https://duckdb.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![MapLibre](https://img.shields.io/badge/MapLibre-GL%20JS-2A2B2E?style=flat-square&logo=maplibre&logoColor=white)](https://maplibre.org/)
[![Tests](https://img.shields.io/badge/Tests-119%20Passing-brightgreen?style=flat-square&logo=pytest&logoColor=white)](https://pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**JEJAK API: WebGIS Peringatan Dini Kebakaran Gambut H-30 Berbasis Jejak Aktivitas Manusia Menggunakan LightGBM dan Explainable AI (TreeSHAP) dengan Verifikasi Lapangan Melalui Drone Langsung**

*Inisiatif Hackathon JOINTS UGM 2026 — Subtema: Sustainability & Environmental Intelligence*

[Demo Langsung](https://jejak-api-demo.vestorion.com) • [Panduan Memulai](#-quick-start) • [Dokumentasi Teknis](#-arsitektur-sistem) • [Benchmark Saintifik](#-tolok-ukur-saintifik--hasil-evaluasi)

</div>

---

## 📌 Ringkasan Eksekutif & *The Critical Blindspot*

Sistem peringatan dini kebakaran hutan dan lahan resmi di Indonesia saat ini—seperti **SPARTAN BMKG**—bertumpu secara eksklusif pada indikator cuaca murni (*Canadian Fire Weather Index* / FWI). Padahal di lahan gambut tropis Asia Tenggara, bukti empiris (*Di Giuseppe dkk., 2020*) membuktikan:

> **"Hanya ~20% kebakaran terjadi saat FWI berada di 10% tertinggi. Sekitar 80% sisanya ditentukan oleh apa yang dilakukan manusia di atas lahan."**

Saat musim kemarau tiba, seluruh kubah gambut mengering seragam, sehingga sistem berbasis cuaca menandai jutaan hektare sebagai "zona bahaya". Akibatnya, tim pemadam dan regu patroli mengalami kebingungan operasional: **dari ribuan sel yang rawan, sel mana yang harus didatangi minggu ini?**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SIKLUS 4 TAHAP JEJAK API                                 │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. SEBELUM (H-30)        │ 2. PRIORITAS & AKSI         │ 3. SAAT (VERIFIKASI)          │
│ Prediksi probabilitas    │ Tactical DSS Top-k untuk    │ Verifikasi drone live cam     │
│ LightGBM 14 fitur +      │ 11–16 regu Daops OKI +      │ (RGB & thermal FLIR) +        │
│ 3 faktor TreeSHAP        │ ekspor GPS offline +        │ deteksi objek AI YOLO         │
│ per sel 1 km².           │ digest Telegram 07.00 WIB.  │ (VLOS ≤ 120 m CASR 107).      │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ 4. SESUDAH & SIKLUS BELAJAR (ACTIVE LEARNING)                                          │
│ Pelacak alih fungsi MapBiomas (F5) + pengiriman label lapangan drone ke antrean        │
│ pelatihan ulang (Active Learning Queue) untuk menyempurnakan siklus model berikutnya.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Cakupan 6 Episentrum Gambut Nasional

JEJAK API telah berhasil dieskalasi dari pilot tunggal menjadi arsitektur pemantauan lintas-pulau pada **6 Episentrum Kritis Gambut Indonesia (55.532 sel grid 1 km² / ~5,55 Juta Hektare)**:

| No | Episentrum / Wilayah | Provinsi | Jumlah Sel (1 km²) | Luas Pantau | Karakteristik Antropogenik Utama |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Kab. Ogan Komering Ilir (OKI)** *(Primary Pilot)* | Sumatera Selatan | **17.927 sel** | ~1,79 Juta Ha | Kanalisasi konsesi HTI/sawit masif, riwayat karhutla berulang El Niño 2015, 2019, 2023. |
| **2** | **Pulang Pisau & Palangka Raya** | Kalimantan Tengah | **9.762 sel** | ~976 Ribu Ha | Kubah gambut dalam eks-PLG (Proyek Lahan Gambut), ribuan kanal drainase terlantar. |
| **3** | **Ketapang & Kubu Raya** | Kalimantan Barat | **8.734 sel** | ~873 Ribu Ha | Ekspansi kebun sawit rakyat di pesisir Matan Hilir Selatan, rawan tebas-bakar. |
| **4** | **Kab. Merauke (10 Distrik)** | Papua Selatan | **9.848 sel** | ~985 Ribu Ha | Savana rawa gambut terbuka, pembukaan lahan skala besar di Distrik Kurik & Eli Kobel. |
| **5** | **Kab. Sorong & Sorong Sel.** | Papua Barat Daya | **7.806 sel** | ~781 Ribu Ha | Hutan rawa gambut primer lembap, terfragmentasi jalur jalan baru Trans-Papua. |
| **6** | **Maros & Pangkep** | Sulawesi Selatan | **1.455 sel** | ~146 Ribu Ha | Kantong rawa gambut ekosistem karst, kanalisasi drainase pertanian musiman. |
| | **TOTAL NASIONAL** | **6 Provinsi** | **55.532 sel** | **~5,55 Juta Ha** | **Ubin Vektor PMTiles Terpadu 34 MB (Piramida Zoom 3–14)** |

---

## ✨ Fitur Utama Sistem (F1 – F6)

| Modul | Nama Fitur | Deskripsi Fungsional & Nilai Operasional |
| :---: | :--- | :--- |
| **F1** | **Peta Risiko & Inspeksi TreeSHAP** | Visualisasi mikro-grid kloroplet 7-stop (Emerald ke Crimson) resolusi 1 km². Klik sel mana saja untuk melihat skor risiko terkalibrasi dan 3 faktor dominan lokal pendorong risiko TreeSHAP beserta narasi ilmiah netral. |
| **F2** | **Prioritas Patroli Top-k & Ekspor CSV** | *Resource-Constrained Tactical Decision Support System* yang disesuaikan dengan kapasitas riil **11–16 regu Daops Manggala Agni OKI**. Memadukan skor risiko dengan kemudahan akses jalan/sungai ($\min(d_{\text{jalan}}, d_{\text{sungai}})$) serta ekspor koordinat GPS (CSV) untuk navigasi offline. |
| **F3** | **Replay Historis 2019/2023 & Benchmark** | Komparasi spasial kemarau ekstrem El Niño 2019 dan 2023 terhadap sebaran titik api satelit FIRMS aktual, dilengkapi panel tolok ukur saintifik ablasi model (LogReg vs LightGBM), kurva ECE, dan studi kasus Lahan A vs B. |
| **F4** | **Peringatan Dini Proaktif Telegram** | Otomasi pengiriman ringkasan peringatan bertingkat (*Waspada, Siaga, Bahaya*) langsung ke Bot Telegram kepala desa dan Masyarakat Peduli Api (MPA) setiap pukul 07:00 WIB via orkestrator **n8n**, menjawab kendala *blank spot* seluler. |
| **F5** | **Pelacak Alih Fungsi Lahan (MapBiomas)** | Memetakan poligon konversi lahan pascakebakaran berdasarkan data *MapBiomas Koleksi 4.0*, dilengkapi **guardrail etika** perlindungan kearifan lokal peladang kecil $\le 2\text{ Ha}$ (UU No. 32/2009 Pasal 69 ayat 2) dengan membatasi dossier investigasi hanya untuk klaster $\ge 25\text{--}50\text{ Ha}$ di area konsesi. |
| **F6** | **Verifikasi Drone Live Cam & Active Learning** | Verifikasi visual langsung regu darat yang patuh regulasi Kemenhub CASR 107 (manual VLOS ketinggian $\le 120\text{ m}$ AGL). Menyajikan dual viewport (kamera optik RGB HD vs FLIR Thermal IR), deteksi objek AI YOLO (asap, api, bukaan lahan), dan antrean *active learning* penyimpan label lapangan baru. |

---

## 🔬 Tolok Ukur Saintifik & Hasil Evaluasi

Menjawab masukan kritis dewan peninjau akademik, JEJAK API menerapkan metodologi pemodelan yang dapat dipertanggungjawabkan secara saintifik:

### 1. Dekomposisi Risiko Formal
$$\text{Fire Risk} = \text{Hazard (FWI/Cuaca)} \times \text{Vulnerability (Kanal/Gambut)} \times \text{Exposure/Trigger (Aktivitas Manusia)}$$
FWI (DMC dan DC) diposisikan secara saintifik sebagai parameter bahaya cuaca (*conditioning*), bukan proksi risiko tunggal.

### 2. Progresi Model Bertingkat (*Empirical Lift*)
Dievaluasi dengan protokol kaku **Spatial Block Cross-Validation (Leave-One-KHG-Out, Ploton dkk., 2020)** pada 645.480 baris data sel-tanggal:

| Tingkat Model | Algoritma | Fitur | PR-AUC | Recall@top-5% | Precision@16 Regu | Brier Score | ECE |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline 0** | Logistic Regression | 5 Fitur Cuaca (FWI) | 0.6679 | 16.57% | 81.25% | 0.1357 | 0.0173 |
| **Baseline 1** | Logistic Regression | 8 Fitur (Cuaca + Riwayat) | 0.6709 | 16.61% | 81.25% | 0.1353 | 0.0163 |
| **Model Penuh** | **LightGBM Classifier** | **14 Fitur (H + V + E Lengkap)** | **0.6791** | **16.78%** | **100.0%** | **0.1337** | **0.0051** |

* **Empirical Lift Terukur:** Model Penuh membuktikan kenaikan PR-AUC sebesar **+0.0112 (+1.68%)**, Recall@top-5% naik **+1.27%**, dan kalibrasi probabilitas Platt Scaling menghasilkan Expected Calibration Error (ECE) sangat rendah (**0.0051**).
* **Reduksi Alarm Palsu 68,2%:** Pada tahun normal (2024–2025), FWI cuaca murni memicu 42,8% alarm palsu (*false alarm*), sedangkan Model Penuh berhasil menekannya menjadi **13,6%** (menghemat bahan bakar dan tenaga regu patroli).
* **Anti-Kebocoran Temporal Kaku ($t \le t_0$):** Seluruh variabel diaudit otomatis bebas kebocoran masa depan (`feature_acquired_at <= issue_date`). Prediksi 30 hari adalah *Pre-Ignition Conditional Risk Estimation* berdasarkan kondisi fisik yang sudah terobservasi di $t_0$, bukan ramalan cuaca atmosferik acak.

---

## 🌐 Sumber Data Terbuka & Legalitas (Open Data Provenance)

Seluruh komponen pemodelan dan visualisasi JEJAK API dibangun 100% di atas dataset ilmiah terbuka (*Open-Access Science Data*) berlisensi legal tanpa ketergantungan API berbayar:

| Sumber Data | Penyedia / Institusi | Resolusi | Lisensi | Peran dalam Sistem JEJAK API |
| :--- | :--- | :---: | :---: | :--- |
| **NASA FIRMS VIIRS (S-NPP & NOAA-20)** | NASA LANCE / EOSDIS | 375 m, Harian | Domain Publik | Ground truth label kebakaran 30 hari & fitur memori riwayat titik api 3 jendela waktu (0–30, 30–90, 90–365 hari). |
| **MODIS MCD64A1 Col. 6.1** | NASA USGS / GEE | 500 m, Bulanan | Domain Publik | Label pendukung bekas area terbakar (*burned area*) untuk menangkap kebakaran gambut bawah permukaan (*smoldering*) yang tertutup asap. |
| **Sentinel-1 GRD (C-Band SAR)** | ESA / Copernicus via GEE | 10 m, 6–12 Hari | Open Access | Deteksi anomali bukaan vegetasi (*deforestation/land clearing*) multi-temporal yang menembus tutupan awan & asap tebal. |
| **Jaringan Kanal Gambut** | Dadap et al., Stanford Digital Rep. | Vektor | CC BY 4.0 | Kerapatan kanal drainase per sel (km/km²) pemicu pengeringan kubah gambut. |
| **OpenStreetMap (HOT OSM)** | OpenStreetMap Foundation / AWS S3 | Vektor GeoParquet | ODbL | Ekstraksi 13.986 ruas jalan & 26.151 sungai untuk fitur aksesibilitas manusia $\min(d_{\text{jalan}}, d_{\text{sungai}})$. |
| **ERA5-Land Climate Reanalysis** | ECMWF / Copernicus via GEE | ~11 km, Harian | Open Access | Variabel suhu udara, kelembapan relatif, serta penurunan offline Drought Code (DC) & Duff Moisture Code (DMC). |
| **CHIRPS Precipitation** | Climate Hazards Center (UCSB) | ~5,5 km, Harian | Domain Publik | Perhitungan defisit curah hujan akumulatif 30 hari pra-sulut. |
| **MapBiomas Indonesia Koleksi 4.0** | MapBiomas / Auriga Nusantara | 30 m, Tahunan | CC BY-SA 4.0 | Pelacak alih fungsi lahan pascakebakaran (Fitur F5: bukti konversi lahan menjadi sawit/HTI dalam 1–2 tahun). |
| **Peta Kesatuan Hidrologis Gambut (KHG)** | KLHK Republik Indonesia | Vektor Poligon | Pemerintah RI | Blok spasial independen untuk *Spatial Block Cross-Validation (Leave-One-KHG-Out)* pencegah kebocoran spasial. |

---

## 🏛️ Arsitektur Sistem

Platform dirancang dengan prinsip **Decoupled Pre-computation** dan **Zero-Cost Offline First** agar peta tetap berputar 60 FPS tanpa risiko terblokir kuota Google Earth Engine:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TopHeader (52px Bar)                            │
│  [Status DuckDB: Online] • [PMTiles: 34MB z3-z14] • [55.532 Sel Grid]  │
├────────────────────┬──────────────────────────────────┬────────────────┤
│    LeftSidebar     │        MapViewer (MapLibre GL)   │ RightInspector │
│  (Modul F1–F6 Rail)│  • Mikro-Grid Halus 7-Stop       │ • Legenda Klor │
│  • F1 Peta Risiko  │  • Esri Dark / Satellite / OSM   │ • Inspeksi Sel │
│  • F2 Patrol Top-k │  • Layer Episentrum 6 Wilayah    │ • 3 TreeSHAP   │
│  • F3 Replay & Eva │  • Koordinat WGS84 Realtime      │ • Dekomposisi  │
│  • F4 Alert Telco  │  • Joyride 13-Langkah Onboarding │ • Tolok Ukur   │
│  • F5 MapBiomas    │                                  │ • Info KHG     │
│  • F6 Drone HUD    │                                  │                │
└────────────────────┴──────────────────────────────────┴────────────────┘
```

* **Backend Engine:** FastAPI (Python 3.11) + **In-Process DuckDB** membaca GeoParquet secara langsung dengan latensi analitik spasial ultra-cepat (**11–17 ms**).
* **Penyajian Vektor:** PMTiles 34 MB multi-skala (zoom 3 hingga 14) disajikan via HTTP Byte-Range Requests tanpa memerlukan server basis data geospasial terpisah.
* **Frontend:** React 18, Vite 5, Tailwind CSS, Lucide Icons, dan MapLibre GL JS dengan integrasi *WebGL Context Loss Resilience*.
* **Zero API Key Requirement:** 100% fitur dapat dijalankan secara mandiri di komputer lokal tanpa memerlukan API key eksternal berbayar.

---

## ⚡ Quick Start

### Prasyarat
* **Python 3.11+**
* **Node.js v18+** & npm
* Manajer paket **uv** (opsional, sangat disarankan) atau `pip`

### Opsi 1: Satu Perintah Startup (Direkomendasikan)
Jalankan skrip terintegrasi berikut di root direktori proyek:
```bash
chmod +x start.sh
./start.sh
```
Skrip otomatis menyiapkan dependensi backend & frontend, memeriksa port, dan menjalankan aplikasi:
* **Frontend Web GIS:** `http://localhost:5173`
* **Backend REST API:** `http://localhost:8000`
* **Swagger API Docs:** `http://localhost:8000/docs`

### Opsi 2: Menjalankan Manual per Service
<details>
<summary><b>Klik untuk melihat langkah manual</b></summary>

**Terminal 1 — Backend (FastAPI + DuckDB):**
```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (React + Vite):**
```bash
cd frontend
npm install
npm run dev
```
</details>

### Opsi 3: Menjalankan via Docker Compose
```bash
docker compose up --build
```

---

## 🧪 Verifikasi Pengujian Otomatis

Seluruh modul telah divalidasi dengan pengujian otomatis (*100% passing*):

```bash
# 1. Menjalankan 103 Pengujian Unit Pipeline ML
uv run --project ml_pipeline pytest ml_pipeline/tests

# 2. Menjalankan 16 Pengujian Unit Backend REST API
uv run --project backend pytest backend/tests

# 3. Uji Kompilasi Bersih Frontend
npm run build --prefix frontend
```

---

## 🚀 Panduan Deployment & Pembaruan VPS

Untuk panduan lengkap arsitektur deployment, konfigurasi Nginx reverse proxy, dan pemecahan masalah di server produksi, lihat dokumen lengkap di **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**.

### Perintah Pembaruan Cepat di VPS (One-Line Command)
Perintah ini **terisolasi khusus untuk direktori `/var/www/jejak-api-demo`** sehingga aman dan tidak mengganggu project lain di PM2/Nginx:

```bash
cd /var/www/jejak-api-demo && git checkout -- frontend/package-lock.json 2>/dev/null && git pull origin main && (docker compose up -d --build backend 2>/dev/null || docker compose restart backend 2>/dev/null || sudo systemctl restart jejak-api 2>/dev/null || true) && (cd frontend && npm install && npm run build && mkdir -p dist/tiles && cp -f public/tiles/oki_risk_latest.pmtiles dist/tiles/ && chmod -R 755 dist && chmod 644 dist/tiles/oki_risk_latest.pmtiles) && (sudo systemctl reload nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true) && (sleep 2 && curl -sf http://localhost:8000/api/health >/dev/null && echo "✅ Backend Sehat!") && echo "🚀 Update Sukses: Sistem Berhasil Diperbarui!"
```

---

## 📂 Struktur Direktori Proyek

```text
JejakApi/
├── backend/                        # Backend REST API FastAPI + DuckDB
│   ├── app/
│   │   ├── api/                    # Routers: patrol, cells, stats, alerts, model, drone
│   │   ├── core/                   # DuckDB engine in-process & settings
│   │   └── services/               # Parquet query service & Telegram notifier
│   ├── data/
│   │   ├── oki_risk_latest.parquet # Master risk 17.927 sel + bobot TreeSHAP
│   │   ├── benchmark_results.json  # Data metrik saintifik 3 model & studi kasus
│   │   └── drone_active_learning_queue.json # Antrean label lapangan F6
│   └── tests/                      # 16 unit tests pytest (100% passing)
│
├── frontend/                       # Frontend Web GIS React 18 + Vite 5 + MapLibre GL
│   ├── public/tiles/               # oki_risk_latest.pmtiles (34 MB vektor 55.532 sel)
│   ├── src/
│   │   ├── components/             # TopHeader, LeftSidebar (F1–F6), RightInspector, MapViewer
│   │   ├── data/                   # national_epicenter_coverage.json & droneMissions.js
│   │   └── services/api.js         # Axios client, drone API, & Sentry telemetry
│   └── nginx.conf                  # Nginx reverse proxy + HTTP Byte-Range Requests
│
├── ml_pipeline/                    # Pipeline Data & Pemodelan Machine Learning
│   ├── data/processed/             # oki_master_1km.parquet (Master dataset 645.480 baris)
│   ├── jejak_pipeline/             # Modul: grid, khg, canals, osm, sar, modeling, explainer
│   ├── benchmark_models.py         # Skrip ablasi komparatif multi-tier baseline
│   └── tests/                      # 103 unit tests pytest (100% passing)
│
├── n8n/                            # Automasi Orkestrasi Peringatan Dini
│   └── jejak_fire_alert_workflow.json # Workflow webhook Telegram Bot jam 07.00 WIB
│
├── docs/                           # Dokumentasi Komprehensif Arsitektur
│   ├── PRD.md, PLAN.md, ARCHITECTURE.md, TDD_GUIDE.md, CODING_STANDARDS.md
│   └── DEMO_PITCH_GUIDE.md         # Naskah Pitching 90 Detik & Panduan Tanya Jawab
│
├── PANDUAN_UPDATE_PROPOSAL.md      # Panduan revisi bab demi bab proposal lomba
├── current_status_of_project.md    # Dokumen status komprehensif & handover agent
├── docker-compose.yml              # Multi-container orchestration
└── start.sh                        # Skrip startup terintegrasi
```

---

## 👨‍💻 Pengembang & Lisensi

* **Pengembang:** Rivaldi Gunawan Yusuf & Tim JEJAK API
* **Email:** [rivaldigunawanyusuf@gmail.com](mailto:rivaldigunawanyusuf@gmail.com)
* **Repositori:** [github.com/rivaldigunawanyusuf/JejakApi-Demo](https://github.com/rivaldigunawanyusuf/JejakApi-Demo)
* **Lisensi:** Didistribusikan di bawah lisensi [MIT License](LICENSE).
