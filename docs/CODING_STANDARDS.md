# Coding Standards & Guidelines

## 1. Standar Python (Backend & ML Pipeline)

* Mematuhi standar penulisan PEP 8 (panjang baris maksimal 88 karakter, diformat otomatis dengan `black`).
* Penggunaan type hints bersifat wajib pada seluruh fungsi dan signature metode.
* Validasi data input dan output wajib menggunakan skema Pydantic v2.
* Python 3.11; dependensi dikelola dalam virtual environment per proyek (`requirements.txt` dengan versi terkunci).
* Docstring ringkas pada fungsi publik; komentar menjelaskan *mengapa*, bukan *apa*.

### Standar Rekayasa Machine Learning & Evaluasi Metrik
* **Larangan Mutlak Metrik Accuracy:** Dilarang keras menggunakan `accuracy_score` untuk evaluasi model kebakaran gambut (*extreme class imbalance*, < 1% sel terbakar). Gunakan **PR-AUC (Precision-Recall AUC)**, **Recall@top-5%**, **Precision@k** ($k=11, 16$), dan **Brier Score / Reliability Diagram**.
* **Keharusan Spatial Block Cross-Validation:** Pelatihan dan evaluasi model spasio-temporal wajib menerapkan pemisahan blok spasial Kesatuan Hidrologis Gambut (KHG). Dilarang menggunakan k-fold acak (*random k-fold*) karena akan membocorkan autokorelasi spasial.
* **Standar Kalibrasi Probabilitas:** Output probabilitas model pohon (*decision trees/LightGBM*) wajib dikalibrasi menggunakan Platt Scaling (`CalibratedClassifierCV(method='sigmoid')`) agar skor probabilitas merefleksikan frekuensi empiris sesungguhnya.
* **Protokol Baseline Bertingkat:** Setiap iterasi model wajib membandingkan hasil terhadap `Baseline_0_LogReg_Weather` dan `Baseline_1_LogReg_Weather_History` untuk membuktikan *lift* secara saintifik.

Contoh penulisan baku:

```python
from typing import List, Optional
from pydantic import BaseModel, Field


class RiskFeatureContribution(BaseModel):
    feature_name: str
    shap_value: float
    narrative: str


class CellDetailResponse(BaseModel):
    cell_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_score_calibrated: Optional[float] = Field(None, ge=0.0, le=1.0)
    top_factors: List[RiskFeatureContribution]
```

## 2. Standar JavaScript / React & UI/UX Design System (Frontend)

Platform JEJAK API dirancang sebagai instrumen pemantauan geospasial kelas operasional (*enterprise GIS & mission-critical operations center*), mengacu pada standar visual AlertCalifornia (UC San Diego) dan Google Earth Engine.

### A. Prinsip Estetika & Pencegahan "AI Slop"
* **Bebas Gradien Berlebihan (No Flashy Gradients):** Dilarang keras menggunakan teks atau tombol bergradien neon pelangi (`from-amber-500 via-orange-500 to-red-600`, dll.). Warna latar dan permukaan wajib solid matte dengan kontras tinggi.
* **Bebas Badge / Chip Menumpuk (No Badge Clutter):** Hilangkan chip dekoratif yang tidak fungsional (seperti badge hackathon raksasa, chip latensi neon, ring berkedip). Gunakan indikator teks bersih dengan ukuran 11–12px dan kontras proporsional.
* **Bebas Emoji Dekoratif:** Jangan gunakan emoji pada label navigasi, judul modal, atau antarmuka sistem. Gunakan ikon vektor monokromatis profesional (`lucide-react`) dengan ukuran standar 14–16px.
* **Bebas Jendela Mengambang yang Memblokir Peta (No Floating Modal Chaos):** Semua instrumen analitik diletakkan pada panel dok (*docked sidebars*):
  - **Left Rail / Sidebar:** Pemilihan modul operasional (F2 Patroli, F3 Replay Historis, F4 Peringatan Dini, F5 Alih Fungsi).
  - **Right Inspector Panel:** Inspeksi sel, legenda gradien kontinu, dan dekomposisi TreeSHAP.
  - **Top Bar:** Navigasi ringkas satu baris setinggi 48–56px.
  - **Center Canvas:** Peta WebGL MapLibre tampil dominan tanpa tertutup jendela mengambang acak.

### B. Palet Warna Baku (Dark Enterprise Palette)
| Token | Nilai Hex | Peruntukan |
|---|---|---|
| Background Dasar | `#181818` | Latar aplikasi, kanvas peta dasar |
| Surface Dok / Sidebar | `#202124` / `#24272c` | Panel navigasi kiri & panel inspeksi kanan |
| Surface Elevasi / Kartu | `#2d3135` / `#303134` | Kartu data, header akordeon |
| Border / Separator | `#3c4043` / `rgba(255,255,255,0.08)` | Garis pembatas tipis (1px solid) |
| Teks Utama | `#e8eaed` | Judul, nilai metrik, label utama |
| Teks Sekunder | `#9aa0a6` | Subtitle, satuan metrik, keterangan |
| Aksen Interaktif | `#8ab4f8` | Status aktif, tab terpilih, tombol primer |
| Status Bahaya | `#f28b82` / `#ef4444` | Sel risiko tinggi (&ge;70%), peringatan kritis |
| Status Siaga | `#fdd663` / `#f59e0b` | Sel risiko sedang (40–69%) |
| Status Waspada / Aman | `#81c995` / `#10b981` | Sel risiko rendah (<40%), status normal |

### C. Standar Kode React & MapLibre
* Menggunakan pola fungsional (*Functional Components*) dan React Hooks modern (`useState`, `useEffect`, `useRef`).
* Penataan gaya menggunakan kelas Tailwind CSS murni atau berkas CSS modular terstruktur (`.css`).
* Menghindari mutasi state secara langsung; gunakan penanganan asynchronous yang aman dengan blok `try / catch`.
* Setiap listener MapLibre (`map.on('click')`, `map.on('mouseenter')`) wajib dibersihkan pada return cleanup `useEffect`.
* Mengutamakan efisiensi rendering WebGL: gunakan *vector tiles* PMTiles lokal dengan HTTP Range Requests, hindari re-render berat pada pergerakan peta.

## 3. Konvensi Penamaan

| Konteks | Konvensi | Contoh |
|---|---|---|
| Python modul / fungsi | `snake_case` | `get_top_k_cells` |
| Python kelas | `PascalCase` | `CellRiskResponse` |
| React komponen | `PascalCase` | `PatrolTable.jsx` |
| Kolom Parquet | `snake_case` | `risk_score`, `shap_dc` |
| Endpoint | `kebab-case` / resource | `/api/patrol/top-k` |

## 4. Konvensi Commit Git

Wajib menerapkan format Conventional Commits:

* `feat: implement duckdb top-k patrol query service`
* `fix: resolve memory leak on maplibre layer cleanup`
* `test: add unit test for spatial temporal boundary checks`
* `docs: update deployment guidelines for ubuntu 22 vps`

## 5. Istilah Teknis

Pertahankan istilah teknis asli dalam bahasa Inggris (mis. *Spatial Block Cross-Validation*, *Temporal Leakage*, *Recall@top-5%*, *TreeSHAP*, *Range Requests*) tanpa terjemahan yang berpotensi ambigu.
