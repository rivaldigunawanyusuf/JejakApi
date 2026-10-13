# Test-Driven Development (TDD) Guide

Pengembangan sistem JEJAK API menerapkan paradigma pengujian ketat sebelum implementasi kode: **Red -> Green -> Refactor**. Tidak ada modul produksi yang digabung tanpa test yang ditulis lebih dahulu.

## 1. Lingkungan Pengujian

* **Backend:** `pytest`, `pytest-asyncio`, `httpx` (untuk asynchronous client testing).
* **ML Pipeline:** `pytest` + `pandas` / `pyarrow` untuk uji kontrak data.
* **Frontend:** `vitest`, `@testing-library/react`.

## 2. Siklus Kerja

1. **Red:** Tulis test yang gagal untuk perilaku yang diinginkan.
2. **Green:** Implementasi minimum agar test lulus.
3. **Refactor:** Rapikan kode dengan test tetap hijau.
4. Commit dengan prefix `test:` lalu `feat:` (lihat `CODING_STANDARDS.md`).

## 3. Standar Uji Backend (FastAPI & DuckDB)

### Aturan Uji Skema Data

1. Setiap respons sel wajib memenuhi kontrak skema Pydantic `CellRiskResponse`.
2. Skor risiko harus selalu terikat dalam interval tertutup $[0.0, 1.0]$.
3. Array faktor penjelas SHAP wajib menyajikan tepat 3 pendorong dominan dengan deskripsi tekstual non-kosong.
4. Parameter tidak valid (`k=0`, `k=-1`, `k=1000`, `bbox` rusak) wajib menghasilkan HTTP 422.

### Contoh Implementasi Unit Test (Pytest)

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_top_k_patrol_sorting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/patrol/top-k?k=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 10

    # Verifikasi urutan skor menurun (Top priority first)
    scores = [item["risk_score"] for item in data["results"]]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_top_k_resource_constraint():
    """Uji kepatuhan batasan sumber daya nyata: mengembalikan tepat k sel terurut menurun."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for k in [5, 11, 16, 25]:  # 11 & 16 regu Daops Manggala Agni OKI
            response = await ac.get(f"/api/patrol/top-k?k={k}")
            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == k
            assert data["k"] == k
            # Verifikasi keterurutan menurun berdasarkan skor terkalibrasi / prioritas
            scores = [r["risk_score"] for r in data["results"]]
            assert scores == sorted(scores, reverse=True)
            for item in data["results"]:
                assert "distance_to_road_m" in item
                assert "distance_to_waterway_m" in item


@pytest.mark.asyncio
async def test_cell_shap_explanation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/cells/OKI_GRID_1042/inspect")
    assert response.status_code == 200
    payload = response.json()
    assert "top_factors" in payload
    assert len(payload["top_factors"]) == 3
    for factor in payload["top_factors"]:
        assert "feature_name" in factor
        assert "shap_value" in factor or "contribution_score" in factor
        assert factor["narrative"].strip() != ""


@pytest.mark.asyncio
async def test_model_benchmark_endpoint():
    """Memastikan endpoint /api/model/benchmark menyajikan metrik komparasi ilmiah."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/model/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "Baseline_0_LogReg_Weather" in data["models"]
    assert "Baseline_1_LogReg_Weather_History" in data["models"]
    assert "Model_Full_LightGBM" in data["models"]
    # Larangan Accuracy: pastikan Accuracy tidak disajikan
    for m in data["models"].values():
        assert "accuracy" not in m
        assert "pr_auc" in m
        assert "recall_top_5pct" in m
        assert "brier_score" in m
```

> [!NOTE]
> Versi `httpx` terbaru tidak lagi menerima `AsyncClient(app=app)`; gunakan `ASGITransport` seperti pada contoh di atas. Nama field SHAP diseragamkan menjadi `shap_value` sesuai `CODING_STANDARDS.md`.

## 4. Standar Uji Machine Learning Pipeline

* **Temporal Leakage Test (`test_temporal_feature_leakage`):** Memastikan bahwa seluruh fitur inferensi pada tanggal terbit $t_0$ hanya menggunakan data sebelum atau tepat pada $t_0$ (timestamp $\le t_0$). Tidak boleh ada variabel cuaca atau citra satelit masa depan ($t > t_0$) yang bocor ke set evaluasi.
* **Probability Calibration Range Test (`test_probability_calibration_range`):** Memastikan seluruh probabilitas terkalibrasi hasil Platt scaling bernilai valid dalam interval tertutup $[0.0, 1.0]$ tanpa nilai `NaN` atau `Inf`.
* **Spatial Independence Test:** Memastikan koordinat data latih dan data uji tidak berada di dalam Kesatuan Hidrologis Gambut (KHG) yang sama selama proses cross-validation.
* **Label Horizon Test:** Label pada $t_0$ hanya berasal dari kejadian pada jendela $(t_0, t_0 + 30\text{ hari}]$.
* **Land Cover Lag Test:** Fitur MapBiomas tahun $Y$ hanya muncul pada baris prediksi tahun $Y+1$.
* **Metric Contract Test:** `Recall@top-5%` dan `PR-AUC` model penuh harus lebih besar dari Baseline 1 (`Baseline_1_LogReg_Weather_History`) pada fold uji.

```python
def test_temporal_feature_leakage(features_df):
    """Memastikan tidak ada fitur masa depan (t > t0) yang bocor."""
    assert (features_df["feature_acquired_at"] <= features_df["issue_date"]).all()
    # Pastikan tidak ada label masa depan yang mendahului horizon
    if "issue_date" in features_df and "observation_date" in features_df:
        assert (features_df["observation_date"] <= features_df["issue_date"]).all()


def test_probability_calibration_range(calibrated_model, X_test):
    """Memastikan probabilitas terkalibrasi Platt scaling berada dalam batas [0.0, 1.0]."""
    probs = calibrated_model.predict_proba(X_test)[:, 1]
    assert np.all(probs >= 0.0)
    assert np.all(probs <= 1.0)
    assert not np.isnan(probs).any()
    assert not np.isinf(probs).any()


def test_spatial_blocks_are_disjoint(folds, df):
    for train_idx, test_idx in folds:
        train_khg = set(df.loc[train_idx, "khg_id"])
        test_khg = set(df.loc[test_idx, "khg_id"])
        assert train_khg.isdisjoint(test_khg)
```

## 5. Standar Uji Frontend

* Komponen `PatrolTable` merender `k` baris dan mengunduh CSV dengan header `cell_id,lon,lat,risk_score`.
* Komponen peta menampilkan fallback saat PMTiles/API gagal dimuat.
* Cleanup event listener MapLibre diverifikasi (listener terdaftar -> `map.off` dipanggil saat unmount).

## 6. Target Cakupan

| Area | Minimum coverage |
|---|---|
| Backend `app/` | 85% |
| ML pipeline (fungsi murni) | 80% |
| Frontend komponen kritis | 70% |
