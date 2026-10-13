# Code Review Guide

Setiap Pull Request (PR) wajib memenuhi kriteria pemeriksaan di bawah ini sebelum dapat digabungkan ke cabang utama (`main`).

## 1. Kriteria Pemeriksaan Machine Learning & Data

* [ ] **Tidak Ada Kebocoran Masa Depan (Temporal Leakage):** Variabel cuaca atau citra satelit yang digunakan untuk memprediksi risiko 30 hari ke depan hanya ditarik dari data sebelum atau tepat pada tanggal terbit prediksi ($t \le t_0$). Dilarang ada variabel masa depan ($t > t_0$) yang masuk ke data uji.
* [ ] **Keharusan Validasi Spatial Block Cross-Validation:** Skema cross-validation **wajib** menggunakan Spatial Block CV (berdasarkan isolasi Kesatuan Hidrologis Gambut / KHG), **dilarang keras** menggunakan Random K-Fold acak yang menyebabkan kebocoran autokorelasi spasial (*spatial autocorrelation leakage*).
* [ ] **Larangan Mutlak Penggunaan Metrik Accuracy:** Dilarang keras menggunakan *Accuracy* atau *ROC-AUC* polos sebagai metrik evaluasi keberhasilan model kebakaran gambut (*extreme class imbalance*, prevalensi < 1%). Metrik yang wajib dilaporkan adalah: **PR-AUC (Precision-Recall AUC)**, **Recall@top-5%**, **Precision@k** ($k=11, 16$), dan **Brier Score / Reliability Diagram**.
* [ ] **Baseline Progresif Disertakan:** PR yang mengubah arsitektur model wajib menyertakan perbandingan empiris terhadap **Baseline 0** (Logistic Regression cuaca murni) dan **Baseline 1** (Logistic Regression cuaca + riwayat kebakaran) untuk membuktikan *lift* nyata penambahan variabel aktivitas manusia.
* [ ] **Kalibrasi Probabilitas Diterapkan:** Probabilitas keluaran wajib melalui kalibrasi (Platt Scaling / Isotonic Regression) sebelum diekspor ke Parquet/PMTiles agar skor probabilitas benar-benar mencerminkan frekuensi empiris kejadian api.
* [ ] **Pencegahan Overfitting Gambut:** Fitur tutupan lahan MapBiomas tahun $Y$ hanya boleh digunakan untuk memprediksi kejadian pada tahun $Y+1$.
* [ ] **Reprodusibilitas:** Seed acak, versi dataset, parameter kalibrasi, dan versi library tercatat lengkap di `benchmark_results.json`.

## 2. Kriteria Pemeriksaan Backend & API

* [ ] **Bebas Komputasi Sinkron GEE:** Tidak ada pemanggilan fungsi blocking `ee.Image.getInfo()` di dalam router FastAPI.
* [ ] **Efisiensi Kueri Kolumnar:** Kueri DuckDB wajib melakukan proyeksi kolom secara spesifik (`SELECT cell_id, risk_score`), dilarang menggunakan `SELECT *`.
* [ ] **Validasi Skema Input:** Seluruh parameter query string (`k`, `bbox`, `date`) divalidasi ketat menggunakan tipe data Pydantic.
* [ ] **Kueri Berparameter:** Tidak ada string interpolation SQL; gunakan prepared statement DuckDB (`?`).
* [ ] **Tidak Memblok Event Loop:** Kueri DuckDB sinkron dijalankan via `run_in_threadpool` atau endpoint `def` biasa.
* [ ] **Test Menyertai Perubahan:** Test ditulis lebih dulu (lihat `TDD_GUIDE.md`).

## 3. Kriteria Pemeriksaan Frontend

* [ ] **Pembersihan Event Peta:** Setiap pendaftaran event listener MapLibre (`map.on('click')`) memiliki cleanup function pada blok `return` di dalam `useEffect`.
* [ ] **Optimasi Ukuran Bundel:** Tidak mengimpor pustaka geospasial berat yang tidak terpakai di sisi klien.
* [ ] **Penanganan Galat UI:** Tersedia komponen fallback jika ubin peta lokal atau data REST API gagal dimuat.
* [ ] **Tanpa Secret di Klien:** Tidak ada API key di kode atau `VITE_*` yang bersifat rahasia.

## 4. Kriteria Umum

* [ ] Commit mengikuti Conventional Commits.
* [ ] Tidak ada fitur di luar scope (portal lapor warga, drone, GEE live).
* [ ] Dokumentasi dan `memory.md` diperbarui jika ada perubahan fase atau ADR.
* [ ] Istilah teknis bahasa Inggris dipertahankan (tidak diterjemahkan ambigu).
