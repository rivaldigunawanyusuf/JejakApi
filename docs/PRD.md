# Product Requirements Document (PRD): JEJAK API

## 1. Identifikasi Produk

* **Judul Proyek:** JEJAK API (Peatland Fire Risk Intelligence Platform)
* **Wilayah Percontohan:** Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan
* **Kategori:** Sustainability Hackathon (JOINTS UGM 2026)
* **Horizon Prediksi:** 30 hari ke depan pada grid spasial 1 km x 1 km

## 2. Masalah & Latar Belakang

Sistem pemantauan kebakaran konvensional di Indonesia (seperti SPARTAN BMKG) menggunakan parameter cuaca murni (Canadian Fire Weather Index). Data empiris di Asia Tenggara menunjukkan hanya sekitar 20% kebakaran terjadi saat indeks cuaca ekstrem; selebihnya dipicu oleh aktivitas manusia.

Pada ekosistem lahan gambut, kebakaran skala besar dipicu oleh faktor antropogenik: kanalisasi drainase dan pembukaan lahan tanpa izin. Sementara itu, sistem SiPongi+ dan NASA FIRMS bersifat pascakejadian (reaktif), di mana api sudah terlanjur membakar lapisan gambut bawah tanah (*smoldering*) yang sangat sulit dipadamkan.

### 2.1 Posisi FWI dalam JEJAK API

Canadian Fire Weather Index (FWI) adalah **parameter cuaca (hazard)**, bukan representasi risiko kebakaran secara keseluruhan. Sistem FWI dikalibrasi untuk bahan bakar hutan pinus boreal beriklim sedang (*jack pine / lodgepole pine*), bukan gambut tropis yang terbakar secara *smoldering* di bawah permukaan. Konsekuensinya bagi JEJAK API:

* Komponen FWI (Drought Code / DC, Duff Moisture Code / DMC) **hanya dipakai sebagai fitur *conditioning*** pada kelompok Hazard.
* FWI **tidak pernah** dijadikan target model, label, maupun proksi risiko tunggal.
* Hubungan antara DC/DMC dan kejadian api di gambut OKI dipelajari secara empiris dari data, bukan diasumsikan dari ambang kelas FWI Kanada.

## 3. Proposisi Nilai

JEJAK API mengintegrasikan lapisan aktivitas antropogenik (sinyal bukaan lahan, kerapatan kanal drainase, aksesibilitas jalan/sungai, riwayat kebakaran) dengan indikator kekeringan hidrometeorologi pada grid 1 km x 1 km, lalu menerjemahkannya menjadi **prioritas patroli yang dapat ditindaklanjuti** sesuai kapasitas regu darat.

### 3.1 Kerangka Dekomposisi Risiko

Risiko kebakaran didefinisikan secara formal sebagai interaksi tiga komponen:

$$
\text{Fire Risk}_{i,t_0} = \text{Hazard}_{i,t_0} \times \text{Vulnerability}_{i,t_0} \times \text{Exposure/Trigger}_{i,t_0}
$$

| Komponen | Makna | Fitur di `oki_master_1km.parquet` | Sumber |
|---|---|---|---|
| **Hazard (H)** | Kondisi cuaca yang memungkinkan api menyala dan menjalar | `temp_c`, `rh_pct`, `dc`, `dmc`, `rain_deficit_30d` | ERA5-Land, CHIRPS (DC/DMC diturunkan offline, ADR-004 lama) |
| **Vulnerability (V)** | Kerentanan struktural gambut: pengeringan kubah dan memori lanskap terbakar | `canal_density_km_km2`, `fire_history_w0_30`, `fire_history_w30_90`, `fire_history_w90_365` | Dadap et al. (kanal), FIRMS VIIRS (riwayat). Kedalaman gambut BRGM direncanakan sebagai fitur V berikutnya |
| **Exposure / Trigger (E)** | Aktivitas manusia yang menyediakan sumber penyulut | `clearing_w0_30`, `clearing_w30_90`, `clearing_w90_365`, `distance_to_road_m`, `distance_to_waterway_m` | Sentinel-1 SAR / Sentinel-2, OSM |

> Bentuk perkalian bersifat konseptual. Pada Logistic Regression, penjumlahan dalam ruang *log-odds* setara dengan perkalian *odds* antar komponen. LightGBM mempelajari interaksi non-linear H×V×E secara langsung. Pemetaan fitur ke komponen dikodekan di `ml_pipeline/jejak_pipeline/modeling.py` (`RISK_COMPONENTS`).

### 3.2 Spesifikasi Ground Truth (Label Biner)

Titik panas NASA FIRMS **bukan** pencatat kebakaran sempurna. Deteksi dapat hilang karena tutupan awan/asap, karena api *smoldering* bawah permukaan dengan suhu radiatif rendah, dan karena jadwal lintasan satelit (≈01:30 & 13:30 waktu lokal). Label dirumuskan secara formal sebagai berikut:

$$
Y_{i,t_0} =
\begin{cases}
1 & \text{jika } \left|\{h \in \mathcal{H}_{\text{VIIRS}} : \text{cell}(h)=i,\ t_0 < \text{date}(h) \le t_0 + 30,\ \text{conf}(h) \in \{\text{nominal}, \text{high}\}\}\right| \ge 1 \\
0 & \text{jika tidak ada hotspot tersebut}
\end{cases}
$$

* $\mathcal{H}_{\text{VIIRS}}$: hotspot **VIIRS S-NPP 375 m** (FIRMS `VIIRS_SNPP_SP`, arsip *standard processing*). Hotspot *low confidence* dibuang (`firms.filter_confidence(min_confidence="n")`).
* Jendela label bersifat *half-open* $(t_0, t_0+30]$: kejadian pada hari $t_0$ tidak dihitung agar tidak tumpang tindih dengan data fitur.
* Tanggal terbit yang jendela labelnya belum teramati penuh disensor (dibuang), **tidak** dilabeli 0.
* **Label sekunder / konfirmasi:** MODIS Burned Area **MCD64A1** (500 m, bulanan). `label_30d_mcd64 = 1` bila ada piksel terbakar dengan `BurnDate` dalam $(t_0, t_0+30]$ di sel tersebut. Label ini dipakai untuk (a) mengukur *agreement* VIIRS–MCD64A1 dan (b) melaporkan Recall terhadap kebakaran terkonfirmasi area terbakar. Label ini tidak dipakai untuk melatih model utama.
* Implementasi: `labels.viirs_binary_labels()` dan `labels.confirm_with_burned_area()` di `ml_pipeline/jejak_pipeline/labels.py`.

> [!WARNING]
> **Status data POC saat ini:** `oki_master_1km.parquet` yang ada di repositori dibangkitkan secara **sintetis** oleh `build_master.py` (prevalensi label ≈26,5%). Data ini **bukan** label VIIRS riil. Seluruh metrik yang dihitung darinya hanya memvalidasi pipeline. Angka tersebut **tidak** boleh dipresentasikan sebagai bukti empiris. Label VIIRS riil di OKI diperkirakan memiliki prevalensi **< 1%** per sel-periode.

## 4. Fitur Utama (Minimum Viable Product)

* **F1 - Peta Risiko Spasio-Temporal 1 km:**
  Visualisasi klasifikasi risiko kebakaran 30 hari ke depan per sel 1 km di Kabupaten OKI. Klik pada poligon menampilkan skor probabilitas serta 3 faktor pendorong risiko tertinggi berbasis TreeSHAP.
* **F2 - Resource-Constrained Decision Support System (Top-k Patrol Ranking):**
  F2 bukan sekadar tabel peringkat. F2 adalah sistem pendukung keputusan taktis yang menjawab pertanyaan: *"Dengan $N$ regu yang tersedia hari ini, sel mana yang harus didatangi agar cakupan risiko terkalibrasi maksimal?"*
  - **Kapasitas riil:** $k$ = jumlah regu patroli Daops Manggala Agni di OKI (**11–16 regu**, 1 sel prioritas per regu per siklus patroli).
  - **Skor yang diurutkan:** probabilitas terkalibrasi (`risk_score_calibrated`, Platt scaling), sehingga $\sum p$ pada sel terpilih dapat dibaca sebagai **ekspektasi jumlah sel terbakar yang tercakup patroli**.
  - **Kendala aksesibilitas:** jarak akses = $\min(d_{\text{jalan}}, d_{\text{sungai}})$. Sel di luar radius akses jalan kaki/perahu (default 5 km) tidak dialokasikan ke regu darat. Sel tersebut dilaporkan terpisah sebagai *unreachable high-priority* yang membutuhkan moda lain (perahu cepat, *water bombing*).
  - **Output:** daftar penugasan regu (`/api/patrol/plan`), ringkasan cakupan risiko, serta ekspor CSV koordinat untuk navigasi lapangan (`/api/patrol/top-k/export`).
  - Optimasi rute multi-titik (VRP) berada di luar ruang lingkup MVP (lihat peta jalan di `current_status_of_project.md`).
* **F3 - Historical Replay Mode:**
  Pembuktian validitas model machine learning dengan membandingkan estimasi prediksi mundur pada musim kebakaran ekstrem (2019 dan 2023) terhadap sebaran titik api aktual NASA FIRMS VIIRS.
* **F4 - Monitoring Area & Proactive Alerting:**
  Fasilitas bagi administrator untuk menandai poligon batas desa atau konsesi (termasuk zona penyangga 5 km). Sistem mengevaluasi risiko secara berkala dan menyimulasikan peringatan dini otomatis ke Bot Telegram (digest proaktif ke kepala desa / Masyarakat Peduli Api, MPA).
* **F5 - Post-Fire Land Conversion Tracker:**
  Pelacakan indikasi alih fungsi lahan pascakebakaran menggunakan perbandingan data historis MapBiomas Indonesia Koleksi 4.0 pada areal terbakar tahun 2019 yang beralih fungsi dalam kurun waktu 1-2 tahun. Mengintegrasikan **Guardrail Etika & Keadilan Sosial (UU No. 32/2009 Pasal 69 ayat 2)**: hanya menampilkan klaster terindikasi $\ge 25\text{--}50\text{ ha}$ di dalam area konsesi HTI/sawit dan mengecualikan peladang tradisional $\le 2\text{ ha}$, dengan label status *"Indikasi berdasarkan data satelit publik (MapBiomas Koleksi 4)"*.
* **F6 - Verifikasi Drone Live Cam & Siklus Belajar (Active Learning):**
  Modul verifikasi taktis lapangan oleh regu darat Manggala Agni di sel prioritas Top-k.
  - **Operasional Patuh Regulasi:** Pengoperasian portabel-manual VLOS (*Visual Line of Sight*, maks. 120 m AGL) sesuai regulasi Kementerian Perhubungan CASR 107.
  - **Simulasi Live Viewport Ganda:** Pengalihan mode kamera optik RGB resolusi tinggi dan kamera termal inframerah (FLIR) lengkap dengan HUD telemetri (ketinggian AGL, baterai, suhu permukaan, koordinat GPS sel).
  - **Deteksi Objek AI (YOLO):** Deteksi visual *real-time* untuk asap tebal, hotspot bawah permukaan, serta bukaan kanalisasi/vegetasi baru.
  - **Siklus Belajar (Active Learning):** Pengiriman verifikasi lapangan (`confirmed_fire_smoke`, `active_land_clearing`, `false_alarm`) ke antrean pelatihan ulang model (`/api/drone/verify`), memperkaya dataset dengan *ground truth* resolusi tinggi.

## 5. Fitur di Luar Ruang Lingkup (Out-of-Scope)

* Tidak mendeteksi kebakaran secara real-time pascakejadian murni dari satelit (menghindari duplikasi fungsi SiPongi/FIRMS; satelit hanya digunakan sebagai input prediktif dan verifikasi).
* Tidak menggelar stasiun dok drone otonom jarak jauh tanpa awak (*Beyond Visual Line of Sight* / BVLOS) pada tahap pilot demi kepatuhan regulasi izin Kemenhub CASR 107 dan kendala radius baterai di atas jutaan hektare gambut (mengadopsi pendekatan bertahap: manual VLOS pada pilot, lihat ADR-001 & ADR-013).
* Tidak menyediakan formulir input laporan masyarakat umum / portal pelaporan publik (menghindari kriminalisasi peladang lokal $\le 2\text{ ha}$ dan derau blank spot, lihat ADR-002).
* Tidak memanggil Google Earth Engine secara sinkron saat runtime (menggunakan ubin PMTiles pre-computed untuk latensi $< 100\text{ ms}$, lihat ADR-003).
* Tidak membuat tuduhan kesengajaan pidana terhadap kepemilikan konsesi tertentu (menggunakan terminologi netral *"indikasi berdasarkan data satelit publik"*).

## 6. Pengguna Sasaran

| Persona | Kebutuhan | Fitur |
|---|---|---|
| Koordinator patroli (BPBD / Manggala Agni) | Menentukan lokasi patroli harian sesuai jumlah regu & kapasitas | F1, F2 |
| Pilot & Regu Darat Manggala Agni | Verifikasi visual udara di sel prioritas & input label lapangan | F2, F6 |
| Kepala desa / MPA | Menerima peringatan proaktif tanpa harus membuka web (blank spot) | F4 (Telegram) |
| Analis / juri / peneliti | Memverifikasi validitas model, ablasi, dan alih fungsi | F3, F5, F6 |

## 7. Metrik Keberhasilan Evaluasi

### 7.1 Benchmark Progression (Wajib)

Model kompleks hanya sah dipakai jika mengalahkan *simple baseline* secara empiris pada protokol evaluasi yang sama.

| Tier | ID Model | Algoritma | Fitur | Pertanyaan yang Dijawab |
|---|---|---|---|---|
| 0 | `Baseline_0_LogReg_Weather` | Logistic Regression | Hazard (cuaca ERA5-Land/CHIRPS) | Seberapa jauh cuaca murni (setara pendekatan FWI/SPARTAN) dapat memprediksi? |
| 1 | `Baseline_1_LogReg_Weather_History` | Logistic Regression | Hazard + riwayat kebakaran | Seberapa besar tambahan dari memori lanskap terbakar? |
| Ablasi | `Ablation_LogReg_Full` | Logistic Regression | Seluruh fitur H+V+E | Apakah *lift* berasal dari **fitur** aktivitas manusia atau dari **kelas model**? |
| Full | `Model_Full_LightGBM` | LightGBM | Hazard + riwayat + kanal Dadap + bukaan Sentinel + jalan/sungai OSM | Apakah aktivitas manusia + interaksi non-linear memberi *lift* nyata di atas Baseline 1? |

Klaim *lift* JEJAK API selalu dibandingkan terhadap **Baseline 1** (bukan Baseline 0) dan dilaporkan dengan interval kepercayaan *paired bootstrap* per tanggal terbit.

### 7.2 Protokol Evaluasi Anti-Leakage

* **Rolling-origin temporal split:** untuk setiap tahun uji $Y$, data latih hanya berasal dari tahun $< Y$. Ada *embargo* label: setiap baris latih wajib memenuhi $t_0^{\text{train}} + 30\text{ hari} < t_0^{\text{origin}}$.
* **Spatial Block (KHG):** pada setiap fold temporal, satu Kesatuan Hidrologis Gambut ditahan sebagai data uji dan tidak muncul di data latih.
* **Fitur ≤ $t_0$:** semua fitur pada tanggal terbit $t_0$ hanya memakai data dengan timestamp $\le t_0$ (`feature_acquired_at <= issue_date`). Curah hujan atau citra satelit masa depan dilarang.
* **Kalibrasi tanpa bocor:** kalibrator Platt dilatih pada tahun latih terakhir (*held-out*), bukan pada data uji.

### 7.3 Metrik Wajib (Rare-Event)

Kebakaran gambut adalah kejadian langka (*class imbalance* ekstrem, < 1% sel positif pada label VIIRS riil). Karena itu:

| Metrik | Definisi | Peran |
|---|---|---|
| **PR-AUC** (Average Precision) | Luas di bawah kurva Precision–Recall | Metrik diskriminasi utama. Selalu dibandingkan dengan garis acak = prevalensi |
| **Recall@top-5%** | Fraksi sel terbakar yang berada di 5% sel berisiko tertinggi, dihitung per tanggal terbit lalu dirata-rata | Relevansi operasional: berapa banyak api yang tertangkap bila hanya 5% wilayah dipantau |
| **Precision@k** | Fraksi sel terbakar di antara $k$ sel teratas, dengan $k \in \{11, 16\}$ = jumlah regu Daops OKI | Efisiensi pengerahan regu (terhubung langsung ke F2) |
| **Brier Score** (+ Brier Skill Score) | $\frac{1}{N}\sum (p_i - y_i)^2$, BSS relatif terhadap klimatologi | Kualitas probabilitas, sebelum dan sesudah kalibrasi |
| **Reliability Diagram** + ECE | Rata-rata probabilitas prediksi vs frekuensi empiris per bin kuantil | Bukti visual bahwa probabilitas 30% benar-benar terjadi ±30% |

> [!CAUTION]
> **Accuracy dilarang** sebagai metrik evaluasi model karhutla. Pada prevalensi 1%, model yang selalu menjawab "tidak terbakar" sudah mencapai akurasi 99%. **ROC-AUC polos** tidak boleh dijadikan metrik utama karena tidak sensitif terhadap *false positive* pada kelas mayoritas yang sangat besar. ROC-AUC hanya boleh muncul sebagai lampiran referensi.

### 7.4 Probability Calibration

LightGBM dilatih dengan `class_weight="balanced"` untuk memperkuat sinyal kelas langka. Pembobotan ini **menggelembungkan** probabilitas mentah, sehingga semua model dibungkus `sklearn.calibration.CalibratedClassifierCV(method="sigmoid")` (Platt scaling) dengan split kalibrasi temporal. Platt scaling bersifat monoton, jadi **urutan peringkat Top-k tidak berubah**. Yang diperbaiki adalah **nilai absolut** probabilitas yang dipakai untuk ambang peringatan (Waspada/Siaga/Bahaya) dan perhitungan ekspektasi cakupan F2.

### 7.5 Metrik Sistem

* **Latensi Antarmuka:** Waktu render ubin peta di bawah 1 detik tanpa memanggil komputasi awan eksternal secara sinkron.
* **Latensi API:** Respons endpoint di bawah 100 ms (p95) pada VPS target. Batas keras 200 ms untuk endpoint benchmark/plan.

## 8. Asumsi & Risiko

| Risiko | Mitigasi |
|---|---|
| Kuota EECU GEE habis | Semua komputasi GEE dijalankan offline; hasil dibekukan ke Parquet/PMTiles |
| Label bias (titik api = proxy kebakaran; awan & *smoldering* menyembunyikan api) | Label formal VIIRS S-NPP confidence nominal/high (§3.2); MCD64A1 sebagai label konfirmasi; laporkan *agreement* dan Recall terhadap MCD64A1 |
| Kebocoran spasial/temporal | Rolling-origin temporal split + embargo 30 hari + Spatial Block per KHG; guard runtime `temporal_cv.assert_no_temporal_leakage()` dan test otomatis (lihat `TDD_GUIDE.md`) |
| Probabilitas mentah tidak terkalibrasi | Platt scaling dengan split kalibrasi temporal; Brier Score dan reliability diagram wajib dilaporkan |
| Dataset POC sintetis disalahartikan sebagai bukti empiris | `benchmark_results.json` memuat field `data_provenance`; UI menampilkan peringatan; regenerasi wajib setelah label VIIRS riil tersedia |
| Risiko hukum narasi | Gunakan template narasi "indikasi ilmiah" (lihat `SECURITY_REVIEW_GUIDE.md`) |

## 9. Standar Visual & Filosofi Desain Antarmuka

Antarmuka JEJAK API ditujukan bagi pemangku kepentingan profesional kebencanaan (BPBD, KLHK, Manggala Agni, dan akademisi), mengadopsi standar sistem operasional taktis seperti AlertCalifornia (UC San Diego) dan Google Earth Engine:

* **Prinsip "Zero AI Slop":** Menghindari ornamen visual kecerdasan buatan generik (gradien teks pelangi, badge warna-warni yang tidak fungsional, dan emoji berlebih).
* **Tata Letak Ruang Operasi (Operations Center Layout):**
  - **Hero Map Canvas:** Peta WebGL MapLibre memenuhi layar sebagai kanvas kerja utama.
  - **Docked Dual Sidebars:** Bilah sisi kiri untuk navigasi modul operasional (F2, F3, F4, F5) dan bilah sisi kanan untuk inspeksi analitik sel (F1), legenda, dan kontribusi TreeSHAP.
  - **Clean Header:** Bilah navigasi atas ramping (52px) dengan kontras tinggi, menyajikan identitas sistem dan fungsi ekspor data secara teratur tanpa memadati bidang pandang.
* **Palet Warna Netral & Fungsional:** Menggunakan latar gelap pekat (`#181818`), permukaan dok slate (`#202124`), teks kontras lembut (`#e8eaed`), dan aksen fungsional terkalibrasi (`#8ab4f8`). Warna peringatan (Merah, Oranye, Hijau) hanya digunakan secara fungsional untuk merepresentasikan klasifikasi risiko kebakaran.

