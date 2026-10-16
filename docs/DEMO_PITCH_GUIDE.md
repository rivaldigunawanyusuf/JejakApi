# PANDUAN PITCH & SKENARIO DEMONSTRASI 90 DETIK: JEJAK API
**Kompetisi:** Hackathon JOINTS UGM 2026 (Subtema: Sustainability)  
**Judul Produk:** JEJAK API (*Prediksi Risiko Kebakaran Gambut 30 Hari Berbasis Jejak Aktivitas Manusia, dengan Verifikasi Lapangan Melalui Pemantauan Drone Langsung*)  
**Wilayah Pilot:** Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan (17.927 Sel Grid 1 km² / ~1,79 Juta Ha Gambut)  
**Ekspansi Nasional POC:** 6 Episentrum Kritis Gambut Nasional (55.532 Sel Grid 1 km² / ~5,55 Juta Ha Gambut)

---

## 1. Naskah Presentasi Pitching 90 Detik (Strict Timing)

### [00:00 - 00:20] MASALAH FUNDAMENTAL (The Critical Blindspot)
> "Dewan juri yang terhormat, sistem peringatan dini karhutla resmi saat ini—seperti SPARTAN BMKG—hanya membaca cuaca. Padahal riset empiris di Asia Tenggara membuktikan **hanya sekitar 20% kebakaran terjadi saat indeks cuaca ekstrem; 80% sisanya ditentukan oleh aktivitas manusia di atas lahan** (Di Giuseppe dkk., 2020). Saat kemarau, seluruh gambut mengering sehingga peringatan cuaca menandai jutaan hektare sekaligus tanpa memberi tahu regu pemadam harus mulai dari mana. Sementara SiPongi dan NASA FIRMS baru mendeteksi setelah api menyala."

### [00:20 - 00:45] SOLUSI & SIKLUS 4 TAHAP: JEJAK API
> "Kami mempersembahkan **JEJAK API**, platform intelijen risiko kebakaran gambut 30 hari ke depan pada mikro-grid 1 km² yang beroperasi dalam **Siklus 4 Tahap**:
> 1. **SEBELUM (H-30):** Memadukan cuaca ERA5-Land dengan **4 dimensi jejak manusia** (14 fitur terkunci): kepadatan kanal Dadap, akses jalan & sungai OSM, 3 jendela anomali radar Sentinel-1 SAR, dan riwayat kebakaran VIIRS. Probabilitas dikalibrasi Platt Scaling dengan penjelasan lokal **TreeSHAP per sel**.
> 2. **PRIORITAS:** Memfilter Top-k sel sesuai kapasitas riil 11–16 regu Daops Manggala Agni OKI, ekspor koordinat GPS, dan digest Telegram otomatis pukul 07.00 WIB via n8n.
> 3. **SAAT (Fitur Baru F6):** Regu darat menerbangkan drone manual (VLOS maks. 120 m patuh Kemenhub) dengan live streaming RGB/Thermal dan deteksi AI YOLO.
> 4. **SESUDAH & SIKLUS BELAJAR:** Melacak alih fungsi kebun via MapBiomas Koleksi 4. Hasil verifikasi drone dan alih fungsi otomatis menjadi **label lapangan baru untuk melatih ulang model (Active Learning)**."

### [00:45 - 01:15] LIVE DEMONSTRASI FITUR (The Walkthrough)
> *(Arahkan kursor ke layar peramban `http://localhost:5173`)*
> 1. **Peta Risiko Spasial & Ubin PMTiles (F1):** *"Peta ini merender 55.532 sel nasional (dengan pilot utama 17.927 sel OKI) secara instan via PMTiles z3–z14 tanpa latensi Google Earth Engine."*
> 2. **Tabel Prioritas Patroli Top-k & Ekspor GPS (F2):** *(Klik tab F2)* *"Menyaring sel kritis berdasarkan kapasitas 11–16 regu Daops OKI dan memprioritaskan sel dengan akses jalan/sungai terdekat untuk navigasi offline."*
> 3. **Interpretabilitas TreeSHAP (F1):** *(Klik sel `OKI_GRID_36794`)* *"Menyajikan 3 faktor pemicu spesifik—misalnya kerapatan kanal 3,4 km/km² dan bukaan SAR 6 minggu lalu."*
> 4. **Ablasi Bertingkat & Replay Kemarau (F3):** *(Klik tab F3)* *"Terbukti secara empiris: LightGBM melampaui baseline cuaca murni dengan PR-AUC 0.6791 dan Expected Calibration Error (ECE) turun drastis ke 0.0051."*
> 5. **Peringatan Proaktif Telegram (F4):** *(Klik tab F4)* *"Peringatan proaktif terkirim otomatis ke kepala desa setiap pukul 07.00 WIB."*
> 6. **Pelacak Alih Fungsi & Guardrail Etika (F5):** *(Klik tab F5)* *"Memantau klaster terindikasi >= 25 Ha di konsesi berlabel 'Indikasi data satelit publik', sekaligus melindungi peladang kecil <= 2 Ha sesuai UU 32/2009 Pasal 69 ayat 2."*
> 7. **Verifikasi Drone Live Cam & Siklus Belajar (F6):** *(Klik tab F6)* *"Regu darat memverifikasi kondisi aktual via kamera thermal IR (48.2°C) dan mengirim hasil verifikasi langsung ke antrean pelatihan ulang model (Active Learning)."*

### [01:15 - 01:30] DAMPAK & EFISIENSI ARSITEKTUR
> "Didukung mesin analitik in-process **DuckDB**, setiap kueri spasial dieksekusi di bawah **15 milidetik** tanpa beban API eksternal (0 API Key).
> JEJAK API: Mengubah pemadaman reaktif menjadi intervensi preventif terarah sebelum api membakar gambut Indonesia. Terima kasih."

---

## 2. Checklist Kontinjensi Demo Offline (Zero-Failure Staging)

Jika koneksi internet pada ruang penjurian terputus atau lambat:
1. **Frontend & Backend Berjalan Lokal:** Buka `http://localhost:5173` (Frontend) dan `http://localhost:8000/docs` (FastAPI Swagger).
2. **Ubin PMTiles Lokal:** Berkas `frontend/public/tiles/oki_risk_latest.pmtiles` tersimpan di NVMe lokal dan disajikan langsung via HTTP Byte-Range Requests tanpa memanggil server eksternal apa pun.
3. **DuckDB In-Process Engine:** Kueri tabel Top-k dan inspeksi TreeSHAP membaca `backend/data/oki_risk_latest.parquet` secara lokal dalam 12 ms.
4. **Basemap Fallback:** Jika jaringan eksternal terputus, ubah basemap ke mode Dark Canvas / Offline tiles yang telah tercache di peramban.

---

## 3. Matriks Menjawab Pertanyaan Penguji (Q&A Defense)

| Potensi Pertanyaan Penguji | Jawaban Strategis Berbasis Arsitektur |
| :--- | :--- |
| **Q1: Mengapa tidak memakai drone pemantau otomatis BVLOS?** | *"Sesuai regulasi Kemenhub KM 637/2020 & CASR 107, penerbangan di luar jarak pandang (BVLOS) memerlukan sertifikasi dan izin khusus. Dok drone otomatis juga terkendala radius baterai (<7 km) di atas jutaan hektare gambut. Oleh karena itu, arsitektur kami mengadopsi pendekatan bertahap: Manual VLOS (maks. 120 m AGL) portabel yang dioperasikan pilot regu darat Manggala Agni (F6), baru menuju semi-otomatis berizin di masa depan."* |
| **Q2: Mengapa tidak ada portal input laporan masyarakat umum?** | *"Terdapat 47 desa blank spot seluler di OKI, risiko kriminalisasi kearifan lokal berladang 2 hektare (UU 32/2009 Pasal 69 ayat 2), serta tingginya derau laporan sampah/kebun karet. Kami membalik alurnya: sistem AI mendorong peringatan dini proaktif terstruktur ke kepala desa via Telegram pukul 07.00 WIB."* |
| **Q3: Bagaimana model mencegah kebocoran data spasial?** | *"Mengacu pada Ploton dkk. (2020), random cross-validation pada data geospasial menghasilkan akurasi semu karena autokorelasi spasial sel bertetangga. Kami menerapkan Spatial Block CV (Leave-One-KHG-Out) di mana setiap Kesatuan Hidrologis Gambut diisolasi sebagai test fold disjoint, sehingga model diuji pada lanskap hidrologis yang belum pernah dilihat sebelumnya."* |
| **Q4: Mengapa tidak memanggil Google Earth Engine saat runtime?** | *"Panggilan synchronous `getInfo()` pada GEE memicu timeout (>10 detik) dan kuota EECU terbatas. Kami menerapkan Decoupled Pre-computation: semua komputasi berat dijalankan offline, dibekukan ke GeoParquet & PMTiles, dan disajikan melalui DuckDB dengan latensi <17 ms."* |

---

## 4. Lembar Jawaban Khusus Masukan Dosen Pembimbing & Dewan Juri Ahli

### 1. Bukti Empiris Baseline Logistic Regression vs LightGBM (Mengapa Bukan Deep Learning?)
* **Jawaban Saintifik:**  
  Dalam literatur pemodelan data tabular spasial (Grinsztajn dkk., NeurIPS 2022), arsitektur berbasis pohon (*tree-based models* seperti LightGBM) secara konsisten mengungguli deep learning pada data tabular heterogen. Lebih penting lagi, kami membuktikan progresi performa (*lift*) secara berjenjang melalui protokol validasi yang identik (*Spatial Block CV berbasis KHG*):
  - `Baseline 0: Logistic Regression (Cuaca Murni)`: PR-AUC 0.6679, Recall@top-5% 16.57%, Brier Score 0.1357, ECE 0.0173.
  - `Baseline 1: Logistic Regression (Cuaca + Histori Api)`: PR-AUC 0.6709, Recall@top-5% 16.61%, Brier Score 0.1353, ECE 0.0163.
  - `Model Penuh: LightGBM (14 Fitur Lengkap)`: PR-AUC 0.6791 (+0.0112 lift), Recall@top-5% 16.78%, Brier Score 0.1337, dan ECE terkalibrasi turun drastis ke **0.0051**.
  - **Efek Ploton dkk. (2020):** Bila diuji dengan *Random CV Naif*, metrik tampak melompat ke PR-AUC 0.8124 (karena autokorelasi spasial bocor). JEJAK API memilih jujur secara saintifik dengan melaporkan angka Spatial Block KHG CV yang realistis.

### 2. Mengapa FWI Hanya Berperan Sebagai Fitur Conditioning (Bukan Target Tunggal)?
* **Jawaban Saintifik:**  
  *Canadian Fire Weather Index* (FWI) dan turunannya (DMC/DC) dikembangkan untuk hutan konifer subtropis Kanada. Di gambut tropis Asia Tenggara, Di Giuseppe dkk. (2020) membuktikan bahwa **hanya ~20% kebakaran terjadi pada FWI persentil ke-90 tertinggi; 80% sisanya dipicu oleh aksi manusia**.  
  Pada musim kemarau di OKI, hampir seluruh kubah gambut berada dalam status FWI kering (DC > 400). Jika FWI dipakai sebagai target tunggal, sistem akan menghasilkan *false positive* masif di seluruh kabupaten. Oleh karena itu, JEJAK API memosisikan FWI murni sebagai *Hazard Conditioning Feature* dalam formula formal: $\text{Fire Risk} = \text{Hazard} \times \text{Vulnerability} \times \text{Exposure/Trigger}$, di mana pemicu sulutan ditentukan oleh drainase kanal Dadap, bukaan vegetasi SAR, dan aksesibilitas jalan/sungai.

### 3. Penanganan Ground Truth NASA FIRMS & Dimensi Waktu
* **Jawaban Saintifik:**  
  - **Mitigasi False Negative Satelit:** Satelit optik/termal MODIS dan VIIRS sering melewatkan api gambut bawah permukaan (*smoldering*) yang tertutup asap tebal atau kanopi. Kami mengatasinya melalui **Label Ganda (Dual Ground Truth)**: menggabungkan deteksi aktif NASA FIRMS VIIRS 375 m dengan **MODIS MCD64A1 500 m Burned Area Bulanan** serta injeksi verifikasi lapangan pilot drone regu darat (Fitur F6).
  - **Dimensi Waktu:** Data dibagi menggunakan *Rolling-Origin Temporal Split*. Musim kemarau ekstrem El Niño 2019 dan 2023 diuji terpisah (*Seasonal Hold-out*). Sementara tahun basah/normal 2024–2025 dipakai khusus untuk **Cek Alarm Palsu (False Alarm Check)**: membuktikan Model Penuh LightGBM menekan laju alarm palsu hingga **13,6%** (reduksi 68,2% dibanding sistem cuaca FWI yang mencapai 42,8%).

### 4. Pembedaan Tegas: Prakiraan Cuaca (Forecast) vs Estimasi Risiko Pra-Sulut Bersyarat ($t \le t_0$)
* **Jawaban Saintifik:**  
  Klaim prediksi 30 hari JEJAK API **sama sekali tidak mengalami data leakage** karena murni menggunakan variabel observasi historis yang sudah tersedia pada tanggal terbit (`feature_acquired_at <= issue_date` diaudit otomatis oleh unit test).  
  Kami membedakan secara metodologis:
  - *Meteorological Forecast ($t_0+1 \dots t_0+30$)* bergantung pada simulasi numerik atmosferik masa depan dengan ketidakpastian chaos yang melonjak di atas 7–10 hari.
  - *Pre-Ignition Conditional Risk Estimation ($t \le t_0$)* yang digunakan JEJAK API mengukur probabilitas bersyarat $P(\text{Terbakar}_{30\text{d}} \mid \text{Status}_{t_0})$ berdasarkan akumulasi dehidrasi kubah gambut (DMC/DC) dan persiapan lahan manusia (kanal drainase dan bukaan vegetasi SAR) yang **telah fisik terjadi di lapangan hingga hari $t_0$**.

### 5. Konkretisasi Dampak Keputusan Mitigasi: Kasus Lahan A vs Lahan B
* **Jawaban Saintifik:**  
  Bayangkan dua bidang lahan gambut bertetangga di OKI pada hari ke-20 tanpa hujan (kondisi cuaca identik: DC 480, Temp 34.2°C, RH 54%):
  - **Lahan A (Hutan Rawa Gambut Sekunder Utuh):** Kanal 0.0 km/km², bukaan SAR 0 (hutan utuh rapat), jauh dari jalan (4.800 m), tidak pernah terbakar.  
    *SPARTAN / FWI BMKG:* **BAHAYA TINGGI** | *JEJAK API:* **28,4% (WASPADA / SEDANG)**.
  - **Lahan B (Gambut Siap Tanam):** Kanal drainase baru 3.4 km/km², anomali SAR -4.8 dB (bukaan vegetasi 6 minggu lalu), dekat jalan desa (320 m), riwayat kebakaran 2019.  
    *SPARTAN / FWI BMKG:* **BAHAYA TINGGI (Tidak bisa membedakan dari Lahan A)** | *JEJAK API:* **84,6% (BAHAYA / PRIORITAS UTAMA)**.
  - **Dampak Keputusan Lapangan:** Dengan kapasitas terbatas 11–16 regu Daops Manggala Agni, komandan patroli tidak lagi membuang bahan bakar dan energi regu untuk menyisir rimba Lahan A yang terisolasi, melainkan langsung mendispatch regu dan drone ke Lahan B sebelum api dinyalakan!
