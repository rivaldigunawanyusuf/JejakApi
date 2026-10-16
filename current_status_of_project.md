# CURRENT STATUS OF PROJECT: JEJAK API
**Prediksi Risiko Kebakaran Gambut 30 Hari Berbasis Jejak Aktivitas Manusia, dengan Verifikasi Lapangan Melalui Pemantauan Drone Langsung**  
*Inisiatif Hackathon JOINTS UGM 2026 (Subtema: Sustainability & Environmental Intelligence)*  
*Cakupan Operasional: 6 Episentrum Kritis Gambut Nasional (55.532 Sel Grid 1 km² / ~5,55 Juta Hektare) dengan Pilot Utama Tervalidasi Penuh di Kab. OKI (17.927 Sel Grid)*  
*Dokumen Tanggal Pembaruan: 16 Oktober 2026 (Versi 2.2 - Final Proposal Sync & Dosen Feedback Implementation)*

---

## 1. Ringkasan Eksekutif & Identitas Proyek

* **Nama Produk:** JEJAK API
* **Judul & Positioning Resmi:** *JEJAK API: Prediksi Risiko Kebakaran Gambut 30 Hari Berbasis Jejak Aktivitas Manusia, dengan Verifikasi Lapangan Melalui Pemantauan Drone Langsung*.
* **Domain:** Early Warning & Decision Support System (DSS) untuk Pencegahan Kebakaran Hutan dan Lahan Gambut Tropis.
* **Target Resolusi & Horizon:** Resolusi spasial mikro-grid 1 km x 1 km dengan horizon prediksi 30 hari ke depan ($t \le t_0$, bebas *data leakage* cuaca masa depan).
* **Cakupan Spasial Saat Ini:** **Pilot Utama Tervalidasi Penuh** di Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan (**17.927 sel**) & **Ekspansi Arsitektur POC Nasional** mencakup **55.532 sel grid** (~5,55 Juta Hektare gambut di 6 episentrum).
* **The Critical Blindspot (Kelemahan Mendasar Sistem Eksisting):**  
  Sistem peringatan dini resmi nasional (seperti SPARTAN BMKG) bertumpu hampir eksklusif pada indikator cuaca murni (*Canadian Fire Weather Index* / FWI). Padahal di lahan gambut tropis Asia Tenggara, bukti empiris (Di Giuseppe dkk., 2020) membuktikan **hanya ~20% kebakaran terjadi saat FWI berada di persentil ke-90 tertinggi; 80% sisanya ditentukan oleh aktivitas manusia di atas lahan**. PEATFR membaca kekeringan tanpa aktivitas manusia; SiPongi/FIRMS bersifat reaktif setelah api menyala; Nusantara Atlas memantau tanpa memprediksi. JEJAK API mengisi titik buta tersebut pada resolusi 1 km² dan horizon H-30.
* **Siklus 4 Tahap & Active Learning:**
  1. **Sebelum (H-30):** Prediksi risiko LightGBM terkalibrasi Platt Scaling + 14 fitur (4 dimensi manusia + kekeringan) + 3 alasan TreeSHAP.
  2. **Prioritas:** Alokasi patroli Top-k sesuai kapasitas 11–16 regu Daops Manggala Agni OKI + filter aksesibilitas + ekspor GPS + Telegram digest via n8n.
  3. **Saat (Fitur F6 Baru):** Verifikasi lapangan via drone manual (VLOS maks. 120 m AGL patuh Kemenhub) + live dual-stream RGB/thermal IR + deteksi AI YOLO.
  4. **Sesudah & Siklus Belajar:** Pelacak alih fungsi pascakebakaran MapBiomas Koleksi 4 (F5) dengan guardrail etika (UU 32/2009 Pasal 69 ayat 2) + pengiriman label lapangan drone ke antrean pelatihan ulang (*active learning queue*).

---

## 2. Cakupan 6 Episentrum Gambut Nasional (POC Multi-Regional)

JEJAK API telah berhasil dieskalasi dari pilot tunggal OKI menjadi sistem pemantauan lintas-pulau pada 6 episentrum gambut kritis Indonesia:

| Episentrum / Wilayah | Provinsi | Jumlah Sel (1 km²) | Luas Gambut | Rerata Risiko | Status Kategori | Karakteristik Antropogenik Utama |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Sumatera Selatan (OKI)** *(Primary Pilot)* | Sumsel | 17.927 sel | ~1,79M Ha | 43,8% | Siaga / Bahaya | Kanalisasi konsesi HTI/sawit masif, riwayat karhutla 2015/2019/2023. |
| **Kalteng: Pulang Pisau** | Kalimantan Tengah | 9.762 sel | ~976k Ha | 57,2% | **Siaga Tinggi (57,2%)** | Kubah gambut dalam eks-PLG (Proyek Lahan Gambut), kanal terbengkalai. |
| **Kalbar: Ketapang** | Kalimantan Barat | 8.734 sel | ~873k Ha | 49,9% | Siaga (49,9%) | Ekspansi kebun sawit rakyat, kanalisasi pesisir Matan Hilir Selatan. |
| **Papua Selatan: Merauke** | Papua Selatan | 9.848 sel | ~985k Ha | 42,6% | Siaga (42,6%) | Savana rawa gambut terbuka, pembukaan lahan skala besar Distrik Kurik. |
| **Papua Barat Daya: Sorong** | Papua Barat Daya | 7.806 sel | ~781k Ha | 39,7% | Waspada (39,7%) | Hutan lindung primer lembap, fragmen jalan baru Trans-Papua Sorong-Klamono. |
| **Sulawesi Selatan: Maros** | Sulawesi Selatan | 1.455 sel | ~146k Ha | 39,9% | Waspada (39,9%) | Kantong rawa gambut ekosistem karst, drainase pertanian musiman. |
| **TOTAL NASIONAL** | **6 Provinsi** | **55.532 sel** | **~5,55 Juta Ha** | **45,5%** | **Siaga Nasional** | **Ubin Vektor PMTiles Terpadu 34 MB (z3–z14)** |

---

## 3. Matriks Audit: Rencana Awal (Plan) vs Realisasi Aktual (As-Is)

| Komponen / Fase | Target Rencana Awal | Realisasi Aktual di Codebase | Status Verifikasi |
| :--- | :--- | :--- | :---: |
| **Fase 1: Data Pipeline & Rekayasa Fitur** | • Batas administrasi OKI & 5 blok KHG<br>• Kanal gambut Dadap et al.<br>• Cuaca ERA5-Land (DC/DMC offline) & CHIRPS<br>• Sentinel-1 SAR bukaan vegetasi multi-jendela<br>• Jalan & Sungai OSM GeoParquet via DuckDB<br>• Master Parquet 1 km bebas kebocoran temporal | • `ml_pipeline/data/processed/oki_master_1km.parquet` (645.480 baris, 36 issue dates, 17.927 sel).<br>• Jaringan OSM: 13.986 jalan & 26.151 sungai diekstrak via S3 HTTP range requests.<br>• 98 unit tests lulus 100%. | **LULUS (100%)** |
| **Fase 2: Machine Learning & Validasi Spasial** | • Spatial Block CV (Leave-One-KHG-Out)<br>• Baseline FWI vs Full Model LightGBM<br>• Metrik Recall@top-5% & PR-AUC<br>• Ekstraksi bobot lokal TreeSHAP per sel<br>• Kompilasi ubin PMTiles statis via Tippecanoe | • Validasi Spatial Block CV terisolasi pada 5 blok KHG (mencegah *spatial autocorrelation leakage*).<br>• **Full Model Recall@top-5% = 16,84%** (PR-AUC: 0,6801, ROC-AUC: 0,8060) melampaui Baseline Cuaca (16,54%).<br>• Bobot TreeSHAP & narasi lokal tersimpan di `backend/data/oki_risk_latest.parquet`.<br>• `oki_risk_latest.pmtiles` (34 MB, piramida zoom 3–14, 55.532 sel nasional). | **LULUS (100%)** |
| **Fase 3: Backend REST API & Otomasi n8n** | • REST API FastAPI membaca Parquet via DuckDB<br>• Endpoint Top-k Patroli & Ekspor CSV<br>• Endpoint Inspeksi TreeSHAP per sel<br>• Automasi n8n & simulasi Bot Telegram | • In-process DuckDB engine: latensi Top-k 11,20 ms, Inspect 16,87 ms, Stats 11,99 ms.<br>• 9 endpoint tests lulus 100%.<br>• Workflow n8n: `n8n/jejak_fire_alert_workflow.json`.<br>• Simulator Webhook Telegram dengan smartphone preview aktif. | **LULUS (100%)** |
| **Fase 4: Frontend Web GIS & Desain Enterprise** | • MapLibre GL JS + PMTiles ubin risiko<br>• Panel F1 (Inspeksi SHAP), F2 (Patroli Top-k), F3 (Replay 2019/2023), F4 (Telegram Alert), F5 (Alih Fungsi MapBiomas)<br>• Ekspor CSV koordinat GPS<br>• Onboarding Tour Guide (Joyride) | • Antarmuka *Enterprise Operations Center* (TopHeader 52px, LeftSidebar kolapsibel F1–F5, RightInspector untuk TreeSHAP & Regional Insights).<br>• Basemap **Esri Dark Canvas, Esri Satellite, OSM, OpenFreeMap** (bebas watermark, zero API key).<br>• Visualisasi kontur mikro-grid halus 7-stop (tetap tajam dari zoom 3 hingga 14).<br>• Onboarding Tour Guide 12-langkah dengan auto zoom-out ke Indonesia.<br>• Build Vite bersih (5,46s). | **LULUS (100%)** |
| **Fase 5: Deployment VPS & Observabilitas** | • Docker Compose backend & Nginx reverse proxy<br>• Dukungan HTTP Byte-Range Requests<br>• Naskah presentasi 90 detik & strategi Q&A<br>• Monitoring Sentry & WebGL Resilience | • `frontend/nginx.conf` terkonfigurasi HTTP Byte-Range.<br>• Sentry DSN aktif di frontend & backend.<br>• Auto-recovery WebGL context loss listener.<br>• Live di VPS Ubuntu: `jejak-api-demo.vestorion.com`. | **LULUS (100%)** |
| **Fase 6: Penguatan Metodologis (Surgical Update)** | • Formulasi risiko saintifik $R = H \times V \times E$<br>• Evaluasi berjenjang (Baseline 0, Baseline 1, Full Model)<br>• Rare-event metrics & Platt Scaling<br>• Tactical decision support (11–16 regu Daops) | • Endpoint `/api/model/benchmark` menyajikan perbandingan model.<br>• Kalibrasi Platt scaling via sigmoid regression.<br>• Pembobotan aksesibilitas $\min(d_{\text{jalan}}, d_{\text{sungai}})$ pada fitur patroli F2. | **LULUS (100%)** |
| **Fase 7: Eskalasi Multi-Episentrum & Refinement Peta** | • Default view Seluruh Indonesia<br>• PMTiles 55.532 sel nasional (34 MB)<br>• Mikro-grid halus permanen tanpa toggle kotak-kotak kasar<br>• Sinkronisasi otomatis tour guide | • Toolbar wilayah: `🇮🇩 Seluruh Indonesia` di urutan pertama dan default load.<br>• Poligon episentrum nasional tampil terus-menerus di semua level zoom.<br>• Tour guide otomatis fly-back ke peta nasional saat selesai/skip. | **LULUS (100%)** |
| **Fase 8: Verifikasi Drone F6 & Penguatan Metodologi Dosen** | • Fitur F6 Drone Live Cam (VLOS &le; 120m Kemenhub CASR 107)<br>• Dual Viewport RGB vs FLIR Thermal IR<br>• Deteksi objek AI (YOLO) indikasi asap & bukaan<br>• Active learning retraining queue<br>• Validasi Ploton dkk. (2020) & Cek Alarm Palsu 2024–2025<br>• Studi kasus Lahan A vs Lahan B<br>• Label ganda VIIRS 375m &cup; MODIS MCD64A1 &cup; Drone | • Endpoint `/api/drone/missions` & `/api/drone/verify`.<br>• HUD Live Telemetry (ALT, BAT, REC, WebRTC).<br>• 103 ML unit tests & 16 backend unit tests 100% lulus.<br>• Reduksi alarm palsu 68,2% di tahun normal (FWI 42,8% vs Penuh 13,6%).<br>• Guardrail etika UU 32/2009 Pasal 69 ayat 2 peladang kecil &le; 2 Ha. | **LULUS (100%)** |

---

## 4. Daftar Keputusan Arsitektur Kritis (Architectural Decision Records)

* **ADR-001 (Pendekatan Bertahap Verifikasi Drone: Manual VLOS di Tahap Pilot Menuju Semi-Otomatis/BVLOS Berizin):** Sesuai Bab 3.7, 4.1 (F6), dan 6.1 Proposal, menolak penggelaran stasiun dok drone otonom jarak jauh tanpa awak (BVLOS) pada fase pilot karena benturan regulasi izin Kemenhub CASR 107 dan kendala radius jelajah dok (<7 km) di atas rawa gambut jutaan hektare. Mengadopsi pendekatan bertahap: pada fase pilot, verifikasi drone dilakukan secara portabel-manual oleh regu darat Manggala Agni di sel prioritas (VLOS maks. 120 m AGL). Umpan visual drone (RGB optik & FLIR thermal IR) dipasangkan dengan deteksi AI YOLO, dan hasil verifikasi diunggah kembali ke sistem sebagai label lapangan baru untuk melatih ulang model (siklus belajar / active learning).
* **ADR-002 (Peniadaan Portal Lapor Warga):** Dihapus karena 47 desa gambut di OKI masih blank spot seluler, risiko kriminalisasi kearifan lokal berladang 2 hektare (UU PPLH), dan derau laporan palsu. Sistem dibalik menjadi **proaktif mendorong digest peringatan terstruktur ke Bot Telegram kepala desa setiap pagi pukul 07:00 WIB via cron n8n**.
* **ADR-003 (Penyajian Ubin Statis PMTiles):** Menggantikan pemanggilan langsung runtime Google Earth Engine (`getInfo()`) untuk mengunci latensi di bawah 100 ms dan mencegah kegagalan kuota EECU atau koneksi putus saat live judging.
* **ADR-004 (Multi-tier Baseline Model):** Mewajibkan evaluasi komparatif `Baseline_0_LogReg_Weather`, `Baseline_1_LogReg_Weather_History`, dan `Model_Full_LightGBM` dengan protokol validasi identik (Spatial Block CV berbasis KHG) untuk membuktikan secara empiris bahwa penambahan variabel antropogenik menghasilkan peningkatan performa (*lift*) nyata.
* **ADR-005 (Standardisasi Metrik Rare-Event & Kalibrasi Platt):** Melarang keras metrik *Accuracy* karena ketimpangan kelas ekstrem (<1% sel terbakar). Mengadopsi PR-AUC, Recall@top-5%, Precision@k, dan Brier Score. Menerapkan kalibrasi probabilitas via Platt scaling (`CalibratedClassifierCV(method='sigmoid')`).
* **ADR-006 (Operational Decision-Support Framing untuk Fitur F2):** Membingkai F2 sebagai *Resource-Constrained Tactical Decision Support System* yang disesuaikan dengan kapasitas riil 11–16 regu Daops Manggala Agni, mengintegrasikan jarak aksesibilitas jalan/sungai ($\min(d_{\text{jalan}}, d_{\text{sungai}})$).
* **ADR-007 (DMC/DC Diturunkan Offline dari ERA5-Land):** Duff Moisture Code (DMC) dan Drought Code (DC) dihitung secara saintifik dari variabel native ERA5-Land (suhu, kelembapan relatif, curah hujan) secara offline, lalu dibekukan ke dalam fitur tabular Parquet.
* **ADR-008 (Desain Enterprise GIS Mission-Critical Tanpa "AI Slop"):** Menolak gradien warna neon mencolok, badge mengambang tidak perlu, emoji di antarmuka sistem, dan modal popup yang menutupi kanvas peta. Mengadopsi arsitektur *dual-docked panels* (Left Mission Control Rail + Right Data & SHAP Inspector) berbasis standar visual *AlertCalifornia (UC San Diego)* dan Google Earth Engine.
* **ADR-009 (Piramida Ubin Vektor Multi-Skala z3–z14):** Mengompilasi PMTiles dari zoom 3 hingga 14 (34 MB) mencakup 55.532 sel nasional dengan interpolasi kartografis halus untuk opasitas garis border dan fill kloroplet pada MapLibre (`minZoom: 3`).
* **ADR-010 (Arsitektur Onboarding Tour Guide Terintegrasi):** Modul panduan tur interaktif `TourGuide.jsx` 13-langkah berbasis React murni dengan SVG dynamic cutout mask, deteksi kolisi viewport, sinkronisasi otomatis tab F1–F6, seleksi sel `OKI_GRID_36794`, dan auto-flyback ke overview nasional saat selesai atau ditutup.
* **ADR-011 (Observabilitas Sentry & WebGL Context Loss Recovery):** Integrasi Sentry DSN lingkungan produksi pada frontend dan backend, dilengkapi penanganan otomatis event `webglcontextlost` dan `webglcontextrestored` pada kanvas MapLibre untuk menjamin stabilitas tanpa crash pada perangkat GPU rendah.
* **ADR-012 (Visualisasi Mikro-Grid Halus & Overview Nasional):** Menetapkan tampilan default kanvas peta berupa *Mikro-Grid Halus* (gradien warna kontur 7-stop: Emerald `#047857` hingga Deep Crimson `#991b1b` dengan garis grid kartografis halus) dan inisialisasi pusat peta langsung pada `🇮🇩 Seluruh Indonesia` (`[119.5, -3.2]`, zoom `4.4`).
* **ADR-013 (Verifikasi Drone Manual VLOS &le; 120m & Siklus Belajar Active Learning):** Menolak drone otonom jarak jauh BVLOS (benturan izin Kemenhub). Drone difungsikan murni manual portabel oleh pilot regu Manggala Agni di sel prioritas (ketinggian &le; 120 m AGL patuh Kemenhub CASR 107). Video feed (RGB optik & FLIR thermal IR) dipasangkan dengan deteksi AI YOLO, dan hasil verifikasi lapangan dikirim ke antrean pelatihan ulang (*active learning queue*) sebagai label *ground truth* baru siklus berikutnya.
* **ADR-014 (Desain Label Ganda - NASA FIRMS VIIRS 375m & MODIS MCD64A1 500m & Drone):** Untuk mengatasi keterbatasan satelit optik dalam menangkap kebakaran gambut bawah permukaan (*smoldering/subsurface peat fire*) atau yang tertutup kanopi/asap tebal (false negative FIRMS), label ground truth dibentuk dari gabungan deteksi hotspot VIIRS 375m dengan data area terbakar MODIS MCD64A1 (500m bulanan) serta injeksi label verifikasi drone lapangan F6.
* **ADR-015 (Guardrail Etika & Keadilan Sosial - Perlindungan Peladang Kecil UU 32/2009):** Mengingat ketimpangan penegakan hukum (5 izin konsesi dicabut vs 162 tersangka perorangan) dan perlindungan kearifan lokal peladang tradisional maksimal 2 hektare (UU No. 32/2009 Pasal 69 ayat 2), JEJAK API membatasi dossier indikasi alih fungsi lahan (Fitur F5) hanya untuk klaster terindikasi >= 25–50 hektare di dalam area konsesi HTI/sawit, dengan penafian tegas "Indikasi berdasarkan data satelit publik (MapBiomas Koleksi 4)", dan bergerbang akses mitigasi.
* **ADR-016 (Estimasi Risiko Kerentanan Pra-Sulut Bersyarat $t \le t_0$ vs Prakiraan Cuaca):** Menegaskan secara metodologis bahwa prediksi 30 hari JEJAK API bukan merupakan prakiraan cuaca atmosferik (*meteorological weather forecast* yang bergantung proyeksi cuaca $t_0+1 \dots t_0+30$), melainkan *Pre-Ignition Conditional Risk Estimation* yang mengukur probabilitas sel terbakar berdasarkan akumulasi defisit air gambut dan penyiapan lahan manusia yang sudah terjadi hingga hari penerbitan ($t \le t_0$), terbukti bebas kebocoran temporal.

---

## 5. Struktur Arsitektur & Inventaris Direktori Codebase

```text
JejakApi/
├── backend/                        # Backend REST API FastAPI + DuckDB
│   ├── app/
│   │   ├── api/                    # Endpoint routers: patrol, cells, stats, alerts, model, drone, health
│   │   ├── core/                   # In-process DuckDB engine & settings
│   │   └── services/               # Query service Parquet & Telegram notifier
│   ├── data/
│   │   ├── oki_risk_latest.parquet # Master risk 17.927 sel + kontribusi TreeSHAP
│   │   ├── drone_active_learning_queue.json # Antrean label lapangan F6
│   │   └── benchmark_results.json  # Data metrik saintifik 3 model + studi kasus Lahan A vs B
│   ├── tests/                      # 16 unit tests pytest (100% passing)
│   ├── pyproject.toml              # Python package definition (uv managed)
│   └── Dockerfile
│
├── frontend/                       # Frontend Web GIS React 18 + Vite 5 + MapLibre GL JS
│   ├── public/
│   │   └── tiles/                  # oki_risk_latest.pmtiles (34 MB vektor 55.532 sel nasional)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/             # TopHeader.jsx (52px bar, status DuckDB, total sel nasional)
│   │   │   ├── Sidebar/            # LeftSidebar.jsx (Modul F1-F6) & RightInspector.jsx
│   │   │   ├── Map/                # MapViewer.jsx (MapLibre GL, 4 basemaps, jump points 6 wilayah)
│   │   │   ├── Tour/               # TourGuide.jsx (13 langkah terpandu termasuk modul F6 Drone)
│   │   │   ├── Info/               # PocScopeModal.jsx (Cakupan 6 wilayah POC nasional)
│   │   │   └── UI/                 # ErrorBoundary.jsx & Sentry integration
│   │   ├── data/
│   │   │   └── national_epicenter_coverage.json # GeoJSON poligon 6 episentrum (55.532 sel)
│   │   └── services/api.js         # Axios client, drone API, & Sentry telemetry
│   ├── nginx.conf                  # Nginx reverse proxy + HTTP Byte-Range Requests
│   └── package.json
│
├── ml_pipeline/                    # Pipeline Data & Pemodelan Machine Learning
│   ├── data/processed/             # oki_master_1km.parquet (Master dataset 645.480 baris)
│   ├── jejak_pipeline/             # Modul: grid, khg, canals, osm, gee, modeling, explainer
│   ├── tests/                      # 103 unit tests pytest (100% passing)
│   └── pyproject.toml
│
├── n8n/                            # Automasi Orkestrasi Peringatan Dini
│   └── jejak_fire_alert_workflow.json  # Workflow n8n pengiriman webhook & Telegram Bot
│
├── docs/                           # Dokumentasi Komprehensif Arsitektur
│   ├── PRD.md, PLAN.md, ARCHITECTURE.md, TDD_GUIDE.md, CODING_STANDARDS.md
│   ├── SECURITY_REVIEW_GUIDE.md, DEVELOPER_GUIDE.md, DEMO_PITCH_GUIDE.md
│
├── memory.md                       # Log status permanen eksekusi arsitektur
├── current_status_of_project.md    # Dokumen status lengkap & panduan handover agent
├── docker-compose.yml              # Multi-container orchestration
└── start.sh                        # Skrip startup terintegrasi
```

---

## 6. Tolok Ukur Kinerja Aktual & Validasi Teknis

1. **Latensi Backend DuckDB (In-Process Parquet):**
   * `/api/patrol/top-k`: **11,20 ms**
   * `/api/cells/{cell_id}/inspect`: **16,87 ms**
   * `/api/stats/summary`: **11,99 ms**
   * `/api/model/benchmark`: **8,45 ms**
   * `/api/drone/missions`: **6,12 ms**
   * `/api/drone/verify`: **8,90 ms**
   *(Jauh melampaui standar mission-critical < 100 ms).*
2. **Kinerja Rendering Web GIS:**
   * 60 FPS pada MapLibre GL JS dengan kompresi ubin PMTiles 34 MB via HTTP Byte-Range Requests.
   * Tetap responsif pada perangkat mobile (drawer bottom sheet dan touch-friendly tap targets).
3. **Kebutuhan Kredensial / API Key:**
   * **NOL (0 API Key / 0 Token Eksternal)** untuk pengoperasian penuh basemap, ubin risiko, kueri data, dan inspeksi TreeSHAP.
4. **Verifikasi Pengujian Otomatis:**
   * `ml_pipeline`: **103 passed**, 0 failed.
   * `backend`: **16 passed**, 0 failed.
   * `frontend`: Build Vite clean dalam **17,49 detik**.

---

## 7. Matriks Brainstorming & Peta Jalan Pengembangan Lanjutan

Gunakan 6 trek pengembangan di bawah ini sebagai landasan diskusi bersama agen AI chatbot Anda untuk merumuskan fitur baru, model bisnis, atau arsitektur teknis lanjutan:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TREK PENGEMBANGAN LANJUTAN JEJAK API                            │
├───────────────────────────┬────────────────────────────┬───────────────────────────────┤
│ 1. TACTICAL PATROL VRP    │ 2. DYNAMIC IOT & TMA       │ 3. FULL DAILY MLOPS           │
│ Dispatch multi-depot &    │ Asimilasi sensor SiPANGGAK │ Ingesti harian otomatis via   │
│ rute terpendek regu darat │ BRGM untuk kalibrasi air   │ GFS/Himawari-9 & Airflow      │
├───────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ 4. CARBON MRV PLATFORM    │ 5. AI FIRE CHIEF COPILOT   │ 6. FOUNDATION AI MODEL        │
│ Audit emisi karhutla &    │ Asisten LLM percakapan     │ Fine-tuning SatMAE / Prithvi  │
│ bukti hukum alih fungsi   │ Telegram/WA komandan M.A.  │ untuk gambut pan-tropis       │
└───────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

### Trek 1: Optimasi Rute Patroli Darat (Vehicle Routing Problem / VRP)
* **Konteks Saat Ini:** Fitur F2 menyaring Top-k sel kritis (11–16 regu Daops Manggala Agni OKI) dan mengekspor CSV koordinat GPS.
* **Peluang Pengembangan:**
  * Integrasikan algoritma VRP (*Vehicle Routing Problem with Time Windows*) berbasis graf jaringan jalan OSM via *OSRM* atau *pgRouting*.
  * Hitung rute multi-stop optimal dari posko Daops terdekat ke titik-titik hotspot prediksi dengan mempertimbangkan kecepatan tempuh medan gambut/motor trail.
  * **Pertanyaan Brainstorming untuk Agent:** *"Bagaimana arsitektur microservice OSRM/Valhalla yang hemat memori untuk disandingkan dengan FastAPI guna menghitung matriks jarak dan rute patroli 16 regu Manggala Agni?"*

### Trek 2: Kalibrasi Real-time Sensor Mikro Lapangan (IoT TMA Gambut SiPANGGAK BRGM)
* **Konteks Saat Ini:** Model mengandalkan data makro satelit (ERA5-Land dan CHIRPS resolusi 1 km).
* **Peluang Pengembangan:**
  * Asimilasi telemetri stasiun Tinggi Muka Air (TMA) sensor IoT BRGM (SiPANGGAK) yang terpasang di kubah gambut OKI dan Kalteng.
  * Masukkan nilai ambang batas regulasi PP 71/2014 (kedalaman air tanah > 0,4 meter di bawah permukaan gambut = zona merah rawan terbakar).
  * **Pertanyaan Brainstorming untuk Agent:** *"Bagaimana merancang modul data assimilation (misal Kalman Filter atau Bayesian Updating) untuk mengoreksi probabilitas prediksi 1 km² menggunakan data titik sensor IoT TMA yang tidak merata?"*

### Trek 3: Otomasi Pipeline Ingesti Harian (Daily Automated MLOps Pipeline)
* **Konteks Saat Ini:** Data inferensi 30 hari diprekomputasi secara batch ke dalam Parquet dan PMTiles statis.
* **Peluang Pengembangan:**
  * Bangun pipeline ETL otomatis harian menggunakan *GitHub Actions* atau *Apache Airflow / Prefect / n8n*.
  * Unduh harian data cuaca numerik (NOAA GFS 0.25° atau Satelit Himawari-9 AHI), hitung ulang indeks kekeringan DC/DMC harian, jalankan inferensi model LightGBM pukul 04:00 WIB, dan perbarui Parquet secara otomatis sebelum notifikasi Telegram dikirim pukul 07:00 WIB.
  * **Pertanyaan Brainstorming untuk Agent:** *"Rancang alur kerja GitHub Actions harian yang mengunduh data GFS terbuka, menghitung FWI DC/DMC via Python, menginjeksi inferensi ke DuckDB, dan me-refresh ubin PMTiles tanpa downtime."*

### Trek 4: Platform Validasi Kredit Karbon & Penegakan Hukum Asas Strict Liability (MRV)
* **Konteks Saat Ini:** Fitur F5 memetakan alih fungsi pascakebakaran MapBiomas Koleksi 4.0 (membuktikan lahan terbakar menjadi perkebunan kelapa sawit/HTI dalam 1–2 tahun).
* **Peluang Pengembangan:**
  * Kembangkan modul *Measurement, Reporting, and Verification* (MRV) untuk proyek karbon gambut (*Verra VM0007 / Plan Vivo*).
  * Hitung estimasi ton $CO_{2}e$ yang berhasil dicegah dari sel-sel rawan yang diproteksi oleh regu patroli.
  * Buat modul *Legal Forensics Export* berstandar pengadilan untuk mendukung penegakan hukum asas *Strict Liability* (Pasal 88 UU No. 32/2009).
  * **Pertanyaan Brainstorming untuk Agent:** *"Bagaimana memformulasikan kalkulator emisi karbon gambut tier-2 IPCC (kedalaman gambut x bulk density x faktor emisi) berdasarkan sel grid JEJAK API untuk keperluan sertifikat kredit karbon?"*

### Trek 5: Conversational AI Field Copilot untuk Komandan Manggala Agni
* **Konteks Saat Ini:** Fitur F4 menyediakan peringatan terstruktur berbasis template melalui bot Telegram.
* **Peluang Pengembangan:**
  * Bangun agen AI percakapan berbasis LLM (*RAG + Function Calling*) yang terhubung langsung ke DuckDB backend JEJAK API.
  * Komandan lapangan dapat bertanya via suara atau teks WhatsApp/Telegram: *"Regu 2 sedang di Cengal, mana 3 titik paling rawan dalam radius 5 km yang bisa diakses jalan darat?"* dan bot membalas dengan koordinat, peta rute, dan faktor pemicu SHAP.
  * **Pertanyaan Brainstorming untuk Agent:** *"Rancang arsitektur AI agent berbasis LangGraph/FastAPI yang menggunakan tools kueri DuckDB JEJAK API untuk melayani tanya-jawab komandan regu pemadam via WhatsApp API."*

### Trek 6: Adaptasi Model Fondasi Geospasial (Geospatial Foundation Model)
* **Konteks Saat Ini:** Model menggunakan tabular LightGBM dengan ekstraksi fitur manual (*hand-crafted features*).
* **Peluang Pengembangan:**
  * Bereksperimen dengan model fondasi visi geospasial seperti *NASA-IBM Prithvi* atau *SatMAE* yang di-fine-tune dengan citra multispektral Sentinel-2 dan radar Sentinel-1 untuk mendeteksi dehidrasi gambut secara end-to-end tanpa rekayasa fitur manual.
  * **Pertanyaan Brainstorming untuk Agent:** *"Bagaimana strategi transfer learning dari pretrained Prithvi-100M geospatial model untuk tugas segmentasi risiko kebakaran gambut di Indonesia?"*

---

## 8. Panduan Siap-Salin (Prompt Handover) untuk Agen AI Chatbot

Salin teks di dalam blok di bawah ini dan berikan langsung ke AI Chatbot / Agent Anda sebagai prompt awal untuk sesi brainstorming:

```markdown
Halo! Saya sedang mengembangkan platform bernama "JEJAK API", yaitu Peatland Fire Risk Intelligence Platform (Platform Intelijen Risiko Kebakaran Gambut Nasional) yang dibangun untuk Hackathon JOINTS UGM 2026.

Berikut adalah ringkasan konteks arsitektur dan status terkini sistem kami:
1. MASALAH UTAMA:
   Sistem resmi nasional (seperti SPARTAN BMKG) hanya memakai indikator cuaca murni (FWI). Padahal di lahan gambut tropis Indonesia, 80% kebakaran dipicu faktor manusia (kanalisasi liar pengering gambut, pembukaan vegetasi, aksesibilitas jalan/sungai).
2. SOLUSI & MODEL AI:
   - Fusi data hidrometeorologi (ERA5-Land, CHIRPS) + antropogenik (kanal Stanford Dadap et al., jalan/sungai OSM S3 GeoParquet, bukaan vegetasi Sentinel-1 SAR).
   - Model: LightGBM Classifier terkalibrasi Platt Scaling (PR-AUC: 0.6801, Recall@top-5%: 16.84% melampaui baseline cuaca).
   - Validasi: Spatial Block Cross-Validation (Leave-One-KHG-Out) untuk mencegah spatial leakage.
   - XAI: TreeSHAP menghasilkan Top-3 faktor pemicu lokal per sel 1 km².
3. CAKUPAN SPASIAL SAAT INI (SUDAH SELESAI & BERJALAN):
   - 6 Episentrum Kritis Gambut Nasional: OKI (Sumsel, 17.927 sel), Pulang Pisau (Kalteng, 9.762 sel), Ketapang (Kalbar, 8.734 sel), Merauke (Papua Sel., 9.848 sel), Sorong (Papua Barat Daya, 7.806 sel), dan Maros (Sulawesi Sel., 1.455 sel).
   - Total cakupan: 55.532 sel grid 1 km² (~5,55 Juta Hektare gambut).
4. TECH STACK AKTIF:
   - Backend: Python 3.11, FastAPI, DuckDB in-process engine (latensi kueri 11-17 ms).
   - Frontend: React 18, Vite 5, TailwindCSS, MapLibre GL JS, PMTiles vector protocol (34 MB ubin z3-z14), Esri Dark Canvas basemap, Sentry error telemetry.
   - Alerting: n8n workflow + Telegram Bot digest generator.
   - Status: Siap produksi, passing 100% tests (98 ML tests, 9 backend tests, clean Vite build).

Saya ingin berkonsultasi dan brainstorming dengan Anda untuk merancang pengembangan fitur dan arsitektur tahap berikutnya. Tolong pelajari konteks di atas dan bantu saya mengeksplorasi ide-ide konkret, arsitektur teknis, dan formulasi solusi yang realistis serta berdampak tinggi.
```
