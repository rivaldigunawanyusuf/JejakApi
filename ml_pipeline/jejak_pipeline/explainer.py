"""TreeSHAP local feature attribution and scientific risk narrative generation."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
import shap

FEATURE_NARRATIVES = {
    "canal_density_km_km2": "Kerapatan kanal drainase tinggi mengeringkan lapisan gambut bawah permukaan.",
    "dc": "Indeks kekeringan gambut mendalam (Drought Code) mengindikasikan lapisan bahan bakar organik sangat kering.",
    "dmc": "Indeks kelembapan serasah organik (Duff Moisture Code) menandakan kerentanan pembakaran bawah tanah (smoldering).",
    "rain_deficit_30d": "Defisit curah hujan 30 hari akumulatif memperpanjang periode dehidrasi lahan rawa gambut.",
    "temp_c": "Suhu udara permukaan harian yang tinggi mempercepat laju evaporasi dan pengeringan bahan bakar.",
    "rh_pct": "Tingkat kelembapan relatif udara yang rendah memudahkan pemantik api menyebar dengan cepat.",
    "clearing_w0_30": "Indikasi aktivitas pembukaan tutupan vegetasi terdeteksi dalam 30 hari terakhir, memerlukan ground-check lapangan.",
    "clearing_w30_90": "Aktivitas pembukaan lahan dalam kurun 30-90 hari lalu meninggalkan biomassa tebangan kering yang mudah menyala.",
    "clearing_w90_365": "Alih fungsi tutupan lahan dalam setahun terakhir menurunkan daya tahan retensi air lanskap gambut.",
    "fire_history_w0_30": "Deteksi titik panas aktif dalam 30 hari terakhir menunjukkan keberadaan aktivitas pembakaran terkini.",
    "fire_history_w30_90": "Riwayat kebakaran 1-3 bulan lalu meningkatkan kerentanan penyalaan ulang (re-ignition) bara gambut.",
    "fire_history_w90_365": "Riwayat kebakaran dalam 1 tahun lalu menyisakan vegetasi pakis dan semak suksesi yang sangat rentan terbakar.",
    "distance_to_road_m": "Aksesibilitas dekat dengan koridor jalan memudahkan mobilisasi dan penetrasi aktivitas darat.",
    "distance_to_waterway_m": "Aksesibilitas lintasan sungai memfasilitasi jalur transportasi perahu dan perambahan tepi air.",
}


def get_feature_narrative(feature_name: str, value: float) -> str:
    """Return a neutral, scientific Indonesian explanation for a given risk factor."""
    if feature_name in FEATURE_NARRATIVES:
        return FEATURE_NARRATIVES[feature_name]
    return f"Kontribusi signifikan dari parameter spasial {feature_name} (nilai: {value:.2f})."


def explain_cells_shap(
    model: Any,
    X_df: pd.DataFrame,
    max_factors: int = 3,
) -> list[list[dict[str, Any]]]:
    """Compute local TreeSHAP feature attributions for each cell observation.

    Args:
        model: Trained tree classifier (e.g. LightGBM).
        X_df: Feature DataFrame with column names matching the model.
        max_factors: Number of top driving factors to extract per cell (default 3).

    Returns:
        List of factor lists, where each cell contains exactly `max_factors` dictionaries:
        ``[{'feature_name': str, 'contribution_score': float, 'narrative': str}, ...]``
    """
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X_df)

    # In binary classification, handle shap_values shape:
    # list of 2 arrays [class_0, class_1] or 2D array for class 1
    if isinstance(shap_vals, list):
        class1_shap = shap_vals[1]
    elif shap_vals.ndim == 3:
        class1_shap = shap_vals[:, :, 1]
    else:
        class1_shap = shap_vals

    feature_names = list(X_df.columns)
    results = []

    for row_idx in range(len(X_df)):
        row_shap = class1_shap[row_idx]
        # Sort features by shap contribution descending
        sorted_indices = np.argsort(-row_shap)

        cell_factors = []
        for feat_idx in sorted_indices[:max_factors]:
            feat_name = feature_names[feat_idx]
            val = float(row_shap[feat_idx])
            raw_val = float(X_df.iloc[row_idx, feat_idx])
            narrative = get_feature_narrative(feat_name, raw_val)

            cell_factors.append(
                {
                    "feature_name": feat_name,
                    "contribution_score": round(val, 4),
                    "narrative": narrative,
                }
            )

        # Ensure exactly max_factors are present
        while len(cell_factors) < max_factors:
            cell_factors.append(
                {
                    "feature_name": "dc",
                    "contribution_score": 0.0,
                    "narrative": "Kondisi kekeringan gambut berada dalam batas normal pemantauan.",
                }
            )

        results.append(cell_factors)

    return results
