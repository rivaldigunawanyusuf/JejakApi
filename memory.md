# MEMORY LOG: JEJAK API ARCHITECTURE & EXECUTION STATE

## 1. Identitas Proyek & Status Terkini

* **Nama Produk:** JEJAK API (Prediksi Risiko Kebakaran Gambut 30 Hari Berbasis Jejak Aktivitas Manusia, dengan Verifikasi Lapangan Melalui Pemantauan Drone Langsung)
* **Target Kompetisi:** Hackathon JOINTS UGM 2026 (Subtema: Sustainability)
* **Pilot Wilayah:** 6 Episentrum Kritis Gambut Nasional (55.532 Sel Grid 1 km² / ~5,55M Ha) dengan Primary Pilot Kab. OKI, Sumsel (17.927 Sel)
* **Fase Aktif Saat Ini:** Seluruh Fase Selesai (Fase 1 hingga Fase 8 Selesai - Siap Pitching & Live Demo)
* **Status Build Terakhir:** Passing (`backend`: 16 passed, `ml_pipeline`: 103 passed, `frontend`: build clean 17,49s, browser E2E verified 100%)
* **Commit Terakhir:** Siap commit Fase 8 (Verifikasi Drone F6, Active Learning, & Penguatan Saintifik)

## 2. Parameter Infrastruktur yang Terkunci (Locked Constraints)

* VPS: Ubuntu 22.04 LTS (2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB Bandwidth).
* Komputasi Data Spasial: Pre-computed GeoParquet + PMTiles (Tanpa live GEE API saat demo).
* Database Query: DuckDB in-process engine pada FastAPI.
* Orchestration: n8n Pro (Cron & Webhook Alerting via Telegram Bot API).
* AI Engine: LightGBM Spatio-temporal Classifier + TreeSHAP Local Explainer.

## 3. Log Pencapaian per Fase (Achievement Checkpoints)

### Fase 0: Dokumentasi & Fondasi

* [x] `docs/PRD.md`
* [x] `docs/PLAN.md`
* [x] `docs/ARCHITECTURE.md`
* [x] `docs/TDD_GUIDE.md`
* [x] `docs/CODE_REVIEW_GUIDE.md`
* [x] `docs/SECURITY_REVIEW_GUIDE.md`
* [x] `docs/DEVELOPER_GUIDE.md`
* [x] `docs/CODING_STANDARDS.md`
* [x] `docs/DEMO_PITCH_GUIDE.md`
* [x] `memory.md`
* *Tanggal Selesai:* 2026-10-14
* *Catatan Penting:* Seluruh panduan arsitektur rekayasa perangkat lunak dan standar kualitas kode tersimpan di direktori `docs/`.

### Fase 1: Data Pipeline & Ekstraksi Fitur Spasial

* [x] Ekstraksi batas administrasi OKI dan jaringan kanal gambut (Dadap et al.).
* [x] Ekstraksi data kekeringan ERA5-Land dan defisit curah hujan CHIRPS.
* [x] Deteksi bukaan vegetasi multi-jendela (0–30, 30–90, 90–365 hari) via Sentinel-1 SAR & Sentinel-2.
* [x] Ekstraksi batas jalan (13,986 fitur) & sungai (26,151 fitur) dari HOT OSM S3 GeoParquet via DuckDB HTTP range requests.
* [x] Delineasi 5 blok spasial Kesatuan Hidrologis Gambut (KHG) untuk Spatial Block CV.
* [x] Penyusunan master tabular dataset 1 km spasial-temporal format Parquet (`oki_master_1km.parquet`: 645,480 baris, 36 issue dates, 17,930 sel 1 km x 1 km, tervalidasi bebas bocor temporal).
* *Tanggal Selesai:* 2026-10-14
* *Catatan Penting:* Master tabular dataset (9.82 MB zstd Parquet) mencakup fitur statis (kanal, jalan, sungai, KHG), fitur dinamis FWI (DC, DMC, defisit hujan), bukaan lahan multi-jendela, dan label biner 30 hari ke depan. Siap untuk pelatihan LightGBM pada Fase 2.

### Fase 2: Pemodelan Machine Learning & Interpretabilitas

* [x] Implementasi Spatial Block Cross-Validation (berdasarkan isolasi Kesatuan Hidrologis Gambut).
* [x] Pelatihan model baseline vs model lengkap (LightGBM).
* [x] Perhitungan metrik evaluasi Recall@top-5% dan PR-AUC (Anti-kebocoran temporal).
* [x] Ekstraksi bobot kontribusi lokal TreeSHAP per sel grid 1 km.
* [x] Kompilasi ubin vektor statis PMTiles (`frontend/public/tiles/oki_risk_latest.pmtiles`).
* *Tanggal Selesai:* 2026-10-15
* *Catatan Penting:*
  - Benchmark CV terverifikasi (5 KHG Spatial Blocks): Full Model Recall@top-5% = 16.84% (PR-AUC: 0.6801, ROC-AUC: 0.8060) melampaui Weather Baseline (Recall@top-5%: 16.54%, PR-AUC: 0.6672, ROC-AUC: 0.8026).
  - TreeSHAP lokal diekstrak untuk seluruh 17,930 sel dan disimpan di `backend/data/oki_risk_latest.parquet` beserta 3 faktor penjelas & narasi netral.
  - PMTiles dikompilasi via Tippecanoe (`oki_risk_latest.pmtiles`, 9.5 MB) zoom 7–14 dengan koordinat WGS84 EPSG:4326.

### Fase 3: Backend API (FastAPI) & Integrasi n8n Automasi

* [x] Pembuatan REST API endpoint `/api/patrol/top-k` berbasis DuckDB query & ekspor CSV.
* [x] Pembuatan REST API endpoint `/api/cells/{cell_id}/inspect` untuk narasi SHAP.
* [x] Konfigurasi alur kerja n8n untuk pemicu berkala webhook peringatan dini (`n8n/jejak_fire_alert_workflow.json`).
* [x] Integrasi bot Telegram untuk pengiriman alert bertingkat (Waspada, Siaga, Bahaya) via service & endpoint `/api/alerts/webhook/simulate`.
* *Tanggal Selesai:* 2026-10-15
* *Catatan Penting:* Latensi kueri in-process DuckDB: Top-k = 11.20 ms, Cell Inspect = 16.87 ms, Stats Summary = 11.99 ms (jauh lebih cepat dari batas 100 ms). Semua 9 pengujian endpoint backend berhasil passing.

### Fase 4: Frontend Web GIS & Visualisasi Data

* [x] Setup MapLibre GL JS dengan OpenFreeMap basemap tiles & PMTiles protocol.
* [x] Visualisasi ubin risiko statis format PMTiles resolusi 1 km (17.930 sel Kab. OKI).
* [x] Fitur F1: Inspeksi sel interaktif dengan narasi 3 faktor dominan TreeSHAP.
* [x] Fitur F2: Tabel prioritas patroli Top-k dinamis dan ekspor CSV langsung.
* [x] Fitur F3: Mode kilas balik historis (Replay Mode) musim kemarau 2019/2023 dengan hotspot VIIRS.
* [x] Fitur F4: Simulasi peringatan dini bertingkat & preview smartphone Telegram Bot.
* [x] Fitur F5: Visualisasi konversi pascakebakaran MapBiomas Koleksi 4.0.
* [x] Fitur Onboarding Tour Guide (Joyride Interaktif): Panduan tur 12-langkah dengan spotlight SVG cutout animasi, menjelaskan seluruh fitur (Header status, DuckDB, F1–F5, basemap, pencarian koordinat, hingga TreeSHAP inspector), dapat diskip kapan saja dan dimunculkan kembali via tombol "Panduan Fitur" di TopHeader.
* *Tanggal Selesai:* 2026-10-15
* *Catatan Penting:* Performa rendering WebGL di peramban sangat responsif (60 FPS), ubin PMTiles 11 MB dimuat via HTTP Range Requests tanpa panggilan GEE blocking saat runtime. Seluruh fitur F1-F5 dan onboarding tour guide tervalidasi sukses 100% via pengujian browser subagent.

### Fase 5: Deployment VPS & Finalisasi Demonstrasi

* [x] Konfigurasi Nginx reverse proxy, security headers, dan HTTP Byte-Range Requests untuk PMTiles (`frontend/nginx.conf`).
* [x] Containerization backend (Python 3.11) dan deployment via `docker-compose.yml`.
* [x] Naskah presentasi pitch 90 detik & panduan kontinjensi demo offline (`docs/DEMO_PITCH_GUIDE.md`).
* [x] Uji coba demonstrasi peramban interaktif terverifikasi 100%.
* *Tanggal Selesai:* 2026-10-15
* *Catatan Penting:* Seluruh fase pengembangan JEJAK API telah tuntas secara paripurna. Platform siap dideploy di VPS Ubuntu 22.04 LTS dan siap dipresentasikan di hadapan dewan juri JOINTS UGM 2026.

### Fase 6: Adaptasi Masukan Dosen & Penguatan Metodologis (Surgical Update)

* [x] **Dekomposisi Risiko & Posisi FWI:** FWI (DC/DMC) diposisikan sebagai fitur conditioning pada komponen Hazard, bukan target atau proksi risiko tunggal. Formula formal risiko: $\text{Fire Risk} = \text{Hazard} \times \text{Vulnerability} \times \text{Exposure/Trigger}$.
* [x] **Model Progression & Baseline Wajib:** Pembentukan skrip `ml_pipeline/benchmark_models.py` yang melatih:
  - `Baseline_0_LogReg_Weather` (Logistic Regression cuaca murni)
  - `Baseline_1_LogReg_Weather_History` (Logistic Regression cuaca + riwayat kebakaran)
  - `Model_Full_LightGBM` (Model lengkap dengan kanal Dadap, bukaan Sentinel-1/2, dan akses jalan/sungai OSM).
* [x] **Pencegahan Data Leakage:** Rolling-origin temporal split kaku dan verifikasi temporal leakage ($t \le t_0$).
* [x] **Metrik Rare-Event & Kalibrasi Probabilitas:** Standardisasi metrik PR-AUC, Recall@top-5%, Precision@k ($k=11, 16$), Brier Score, dan kalibrasi Platt scaling (`CalibratedClassifierCV(method='sigmoid')`). Larangan mutlak metrik Accuracy.
* [x] **Penyajian Endpoint Ilmiah Backend:** Pembuatan endpoint `/api/model/benchmark` menyajikan `benchmark_results.json`.
* [x] **Actionable Decision Support (Fitur F2):** Penyempurnaan Top-k patroli dengan atribut aksesibilitas ($\min(d_{\text{jalan}}, d_{\text{sungai}})$) disesuaikan kapasitas riil 11–16 regu Daops Manggala Agni OKI.
* [x] **Visualisasi Frontend Benchmark:** Integrasi tab Metrik & Replay Mode untuk menampilkan kurva perbandingan model dan reliability diagram kalibrasi.
* *Tanggal Selesai:* 2026-10-15
* *Catatan Penting:* Seluruh masukan kritis dosen pembimbing terintegrasi sempurna secara non-breaking, menjaga 100% fungsionalitas UI, MapLibre, dan API yang sudah berjalan.

### Fase 7: Eskalasi 6 Episentrum Kritis Gambut Nasional & Refinement Kartografi Web GIS

* [x] **Eskalasi Spasial 6 Episentrum Nasional:** Eskalasi cakupan dari pilot tunggal OKI (17.927 sel) menjadi 6 Episentrum Kritis Nasional (55.532 sel grid 1 km² / ~5,55 Juta Ha): OKI (Sumsel), Pulang Pisau (Kalteng), Ketapang (Kalbar), Merauke (Papua Selatan), Sorong (Papua Barat Daya), dan Maros (Sulawesi Selatan).
* [x] **Penyusunan Ubin Vektor PMTiles Nasional:** Kompilasi ubin vektor statis `oki_risk_latest.pmtiles` 34 MB mencakup 55.532 sel (zoom 3–14) dengan atribut risiko, kategori, dan identitas sel.
* [x] **Visualisasi Mikro-Grid Halus Kartografis:** Menjadikan *Mikro-Grid Halus* (kontur gradien 7-stop dari Emerald `#047857` ke Crimson `#991b1b` dengan garis batas sel transparan) sebagai visualisasi permanen default dan menghapus toggle mode kotak kasar.
* [x] **Inisialisasi Peta Nasional & Toolbar Navigasi:** Menetapkan posisi default kanvas pada `🇮🇩 Seluruh Indonesia` (`[119.5, -3.2]`, zoom `4.4`) serta menaruh opsi Seluruh Indonesia di posisi pertama toolbar navigasi wilayah.
* [x] **Onboarding Tour Guide Auto-Flyback:** Memperbaiki interaksi langkah ke-12 dan tombol tutup/skip pada `TourGuide.jsx` agar otomatis melakukan animasi *flyTo* kembali ke overview peta nasional dan membersihkan seleksi sel.
* [x] **Observabilitas Sentry & WebGL Context Resilience:** Integrasi Sentry DSN di frontend dan backend, serta penanganan otomatis `webglcontextlost` dan `webglcontextrestored` pada kanvas MapLibre.
* *Tanggal Selesai:* 2026-10-16
* *Catatan Penting:* Seluruh 55.532 sel grid nasional dapat diakses dan diinspeksi secara instan via klik poligon wilayah (Regional Insights) maupun klik sel individual (TreeSHAP & hidrologi). Sistem stabil, lulus uji build Vite (5,46s), dan terbebas dari error WebGL.

### Fase 8: Verifikasi Drone F6, Active Learning Retraining Queue, & Penguatan Metodologis

* [x] **Implementasi Fitur F6 Drone Live Cam & Active Learning:** Pembangunan modul F6 di frontend dan backend (`/api/drone/missions` dan `/api/drone/verify`) untuk pemantauan visual drone di sel prioritas. Menampilkan dual viewport (RGB optik HD vs FLIR thermal IR), deteksi objek AI YOLO (asap, bukaan lahan, hotspot), HUD telemetri live (ALT, BAT, REC, WebRTC), serta antrean *active learning* penyimpan label lapangan baru.
* [x] **Kepatuhan Regulasi Penerbangan Drone:** Menegaskan kepatuhan penuh regulasi Kemenhub CASR 107 (manual VLOS maks. 120 m AGL) dan menolak drone otonom BVLOS.
* [x] **Penguatan Saintifik Masukan Dosen:**
  - Evaluasi Spatial Block KHG CV (Ploton dkk., 2020) menolak nilai semu *random-split*.
  - Cek Alarm Palsu 2024–2025: Reduksi alarm palsu 68,2% di tahun normal (FWI 42,8% vs Model Penuh 13,6%).
  - Studi kasus Lahan A (hutan utuh) vs Lahan B (gambut siap tanam terbuka) membuktikan keunggulan model dalam alokasi patroli.
  - Pembentukan label *ground truth* ganda: VIIRS S-NPP 375m &cup; MODIS MCD64A1 500m &cup; Drone F6.
  - Guardrail etika dan keadilan sosial (UU No. 32/2009 Pasal 69 ayat 2) melindungi peladang tradisional &le; 2 Ha.
* [x] **Penyempurnaan Tour Guide & UI:** Menambahkan langkah ke-13 pada `TourGuide.jsx` untuk fitur F6 dan memperbarui subtitle pada `TopHeader.jsx`.
* *Tanggal Selesai:* 2026-10-16
* *Catatan Penting:* 103 unit tests ML passed, 16 unit tests backend passed, dan Vite build clean (17,49s).

## 4. Keputusan Arsitektur Kritis (Architectural Decision Records)

* **ADR-001 (Pendekatan Bertahap Verifikasi Drone: Manual VLOS di Tahap Pilot Menuju Semi-Otomatis/BVLOS Berizin):** Sesuai Bab 3.7, 4.1 (F6), dan 6.1 Proposal, menolak penggelaran stasiun dok drone otonom jarak jauh tanpa awak (BVLOS) pada fase pilot karena benturan regulasi izin Kemenhub CASR 107 dan kendala radius jelajah dok (<7 km) di atas rawa gambut jutaan hektare. Mengadopsi pendekatan bertahap: pada fase pilot, verifikasi drone dilakukan secara portabel-manual oleh regu darat Manggala Agni di sel prioritas (VLOS maks. 120 m AGL). Umpan visual drone (RGB optik & FLIR thermal IR) dipasangkan dengan deteksi AI YOLO, dan hasil verifikasi diunggah kembali ke sistem sebagai label lapangan baru untuk melatih ulang model (siklus belajar / active learning).
* **ADR-002 (Peniadaan Portal Lapor Warga):** Dihapus karena 47 desa di OKI masih blank spot, risiko kriminalisasi kearifan lokal 2 hektare, serta menghindari derau laporan sampah/kebun karet.
* **ADR-003 (Penyajian Ubin Statis PMTiles):** Menggantikan panggilan langsung Google Earth Engine untuk mengunci latensi di bawah 100 ms dan mencegah kegagalan kuota EECU saat live judging.
* **ADR-004 (Multi-tier Baseline Model - Logistic Regression vs LightGBM):** Menolak klaim superioritas model pohon tanpa baseline komparatif. Wajib membangun dan mengevaluasi `Baseline_0_LogReg_Weather` dan `Baseline_1_LogReg_Weather_History` dengan protokol validasi yang identik (Spatial Block CV berbasis KHG) untuk membuktikan secara empiris bahwa penambahan variabel antropogenik (kanal Dadap, bukaan Sentinel-1/2, aksesibilitas OSM) pada `Model_Full_LightGBM` menghasilkan peningkatan performa (*lift*) yang nyata dan terukur.
* **ADR-005 (Rare-event Metric Standardization - PR-AUC, Recall@top-5%, & Platt Calibration):** Karena kebakaran gambut adalah kejadian langka (*extreme class imbalance*, < 1% sel positif), melarang keras penggunaan metrik *Accuracy* dan *ROC-AUC* polos. Mengadopsi PR-AUC, Recall@top-5%, Precision@k, dan Brier Score. Menerapkan kalibrasi probabilitas via Platt scaling (`CalibratedClassifierCV(method='sigmoid')`) agar probabilitas keluaran model benar-benar merefleksikan frekuensi empiris tanpa mengubah urutan ranking Top-k.
* **ADR-006 (Operational Decision-Support Framing for Feature F2):** Menolak pemosisian F2 sebagai penampil tabel ranking risiko pasif. F2 dibingkai sebagai *Resource-Constrained Tactical Decision Support System* yang disesuaikan dengan kapasitas riil 11–16 regu Daops Manggala Agni di OKI, mengintegrasikan jarak aksesibilitas jalan/sungai ($\min(d_{\text{jalan}}, d_{\text{sungai}})$), serta mengurutkan sel berdasarkan skor risiko terkalibrasi agar $\sum p$ mencerminkan ekspektasi jumlah sel terbakar yang diamankan.
* **ADR-007 (DMC/DC Diturunkan Offline):** Duff Moisture Code / Drought Code dihitung offline dari variabel ERA5-Land (bukan variabel native ERA5-Land), lalu dibekukan sebagai fitur tabular pada komponen Hazard.
* **ADR-008 (Desain Enterprise GIS Mission-Critical Tanpa "AI Slop"):** Menolak penggunaan gradien warna neon berlebihan, badge mengambang tidak perlu, emoji dekoratif, dan popup modal acak di atas kanvas peta. Mengadopsi arsitektur *dual-docked panels* (Left Mission Control Rail + Right Data & SHAP Inspector) berbasis standar visual *AlertCalifornia (UC San Diego)* dan Google Earth Engine, dengan palet monokromatik gelap solid (`#181818`, `#202124`, `#2d3135`) dan visualisasi kloroplet fungsional terkalibrasi.
* **ADR-009 (Multi-Scale Vector Tile Hierarchy z3–z14):** Mengompilasi PMTiles dari zoom level 3 hingga 14 dengan interpolasi kartografis halus untuk opasitas garis border dan fill kloroplet pada MapLibre (`minZoom: 3`).
* **ADR-010 (Arsitektur Onboarding Tour Guide Terintegrasi Tanpa Dependensi Berat):** Mengembangkan modul `TourGuide.jsx` kustom berbasis React murni dengan SVG dynamic cutout mask, deteksi kolisi viewport, sinkronisasi state otomatis, dukungan navigasi keyboard, auto-flyback ke overview nasional, dan tombol trigger persisten "Panduan Fitur" di TopHeader.
* **ADR-011 (Observabilitas Sentry & WebGL Context Loss Recovery):** Integrasi Sentry DSN lingkungan produksi pada frontend dan backend, dilengkapi penanganan otomatis event `webglcontextlost` dan `webglcontextrestored` pada kanvas MapLibre untuk menjamin stabilitas tanpa crash pada perangkat GPU rendah.
* **ADR-012 (Visualisasi Mikro-Grid Halus & Overview Nasional):** Menetapkan tampilan default kanvas peta berupa *Mikro-Grid Halus* (gradien warna kontur 7-stop: Emerald `#047857` hingga Deep Crimson `#991b1b` dengan garis grid kartografis halus) dan inisialisasi pusat peta langsung pada `🇮🇩 Seluruh Indonesia` (`[119.5, -3.2]`, zoom `4.4`).
* **ADR-013 (Verifikasi Drone Manual VLOS &le; 120m & Siklus Belajar Active Learning):** Menolak drone otonom jarak jauh BVLOS (benturan izin Kemenhub). Drone difungsikan murni manual portabel oleh pilot regu Manggala Agni di sel prioritas (ketinggian &le; 120 m AGL patuh Kemenhub CASR 107). Video feed (RGB optik & FLIR thermal IR) dipasangkan dengan deteksi AI YOLO, dan hasil verifikasi lapangan dikirim ke antrean pelatihan ulang (*active learning queue*) sebagai label *ground truth* baru siklus berikutnya.
* **ADR-014 (Desain Label Ganda - NASA FIRMS VIIRS 375m & MODIS MCD64A1 500m & Drone):** Untuk mengatasi keterbatasan satelit optik dalam menangkap kebakaran gambut bawah permukaan (*smoldering/subsurface peat fire*) atau yang tertutup kanopi/asap tebal (false negative FIRMS), label ground truth dibentuk dari gabungan deteksi hotspot VIIRS 375m dengan data area terbakar MODIS MCD64A1 (500m bulanan) serta injeksi label verifikasi drone lapangan F6.
* **ADR-015 (Guardrail Etika & Keadilan Sosial - Perlindungan Peladang Kecil UU 32/2009):** Mengingat ketimpangan penegakan hukum (5 izin konsesi dicabut vs 162 tersangka perorangan) dan perlindungan kearifan lokal peladang tradisional maksimal 2 hektare (UU No. 32/2009 Pasal 69 ayat 2), JEJAK API membatasi dossier indikasi alih fungsi lahan (Fitur F5) hanya untuk klaster terindikasi >= 25–50 hektare di dalam area konsesi HTI/sawit, dengan penafian tegas "Indikasi berdasarkan data satelit publik (MapBiomas Koleksi 4)", dan bergerbang akses mitigasi.
* **ADR-016 (Estimasi Risiko Kerentanan Pra-Sulut Bersyarat $t \le t_0$ vs Prakiraan Cuaca):** Menegaskan secara metodologis bahwa prediksi 30 hari JEJAK API bukan merupakan prakiraan cuaca atmosferik (*meteorological weather forecast* yang bergantung proyeksi cuaca $t_0+1 \dots t_0+30$), melainkan *Pre-Ignition Conditional Risk Estimation* yang mengukur probabilitas sel terbakar berdasarkan akumulasi defisit air gambut dan penyiapan lahan manusia yang sudah terjadi hingga hari penerbitan ($t \le t_0$), terbukti bebas kebocoran temporal.

## 5. Catatan Handover untuk Model AI Berikutnya

* Seluruh dokumen arsitektur, metodologi, dan cakupan 6 episentrum nasional (55.532 sel) tercatat lengkap di `current_status_of_project.md` dan `memory.md`.
* Frontend telah lolos build Vite clean (17,49s) dengan fitur F6 terpasang sempurna.
* Seluruh 103 ML unit tests dan 16 backend unit tests lulus 100%.
* Dokumen `current_status_of_project.md` Bagian 8 memuat teks prompt terstruktur yang siap disalin langsung ke agen chatbot untuk sesi brainstorming lanjutan.
