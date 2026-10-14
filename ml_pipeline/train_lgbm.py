"""Train LightGBM fire risk prediction models with Spatial Block CV & TreeSHAP (Phase 2).

Outputs:
- Cross-validation performance comparison table (Baseline vs Full Model)
- Model artifacts and latest risk predictions
- data/processed/oki_risk_latest.parquet
- ../backend/data/oki_risk_latest.parquet
- data/processed/oki_risk_latest.geojson

Usage:
    uv run python train_lgbm.py [--master data/processed/oki_master_1km.parquet]
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import box

from jejak_pipeline import config, explainer, modeling


def categorize_risk(score: float) -> str:
    """Categorize risk score into official warning levels: Waspada, Siaga, Bahaya."""
    if score >= 0.70:
        return "Bahaya"
    elif score >= 0.40:
        return "Siaga"
    return "Waspada"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--master",
        default=str(config.PROCESSED_DIR / "oki_master_1km.parquet"),
        help="Path to oki_master_1km.parquet",
    )
    parser.add_argument(
        "--grid",
        default=str(config.INTERIM_DIR / "oki_grid_1km.parquet"),
        help="Path to oki_grid_1km.parquet for geometries",
    )
    parser.add_argument(
        "--out",
        default=str(config.PROCESSED_DIR / "oki_risk_latest.parquet"),
        help="Path to output latest risk parquet",
    )
    args = parser.parse_args()

    master_path = Path(args.master)
    if not master_path.is_file():
        raise FileNotFoundError(f"Master dataset not found at {master_path}. Run build_master.py first.")

    print(f"Loading master dataset from {master_path}...")
    master_df = pd.read_parquet(master_path)
    print(f"Loaded {len(master_df)} rows. Features: {len(master_df.columns)}")

    # 1. Train models using Spatial Block Cross-Validation
    print("\n" + "=" * 65)
    print("EXECUTING SPATIAL BLOCK CROSS-VALIDATION (5 KHG BLOCKS)")
    print("=" * 65)
    cv_results = modeling.train_and_evaluate(master_df, n_estimators=100, random_state=42)

    # 2. Print evaluation metrics comparison
    metrics = cv_results["metrics"]
    print("\n" + "=" * 70)
    print(f"{'MODEL VARIANT':<25} | {'PR-AUC':<10} | {'ROC-AUC':<10} | {'RECALL@TOP-5%':<12}")
    print("-" * 70)
    for model_name, perf in metrics.items():
        print(f"{model_name:<25} | {perf['pr_auc']:<10.4f} | {perf['roc_auc']:<10.4f} | {perf['recall_top_5pct']:<12.4f}")
    print("=" * 70)

    # Verify PRD benchmark requirement
    baseline_recall = metrics["baseline_weather"]["recall_top_5pct"]
    full_recall = metrics["full_model"]["recall_top_5pct"]
    print(f"\n[BENCHMARK VERIFICATION] Full Model Recall@top-5%: {full_recall:.2%} vs Weather Baseline: {baseline_recall:.2%}")
    if full_recall >= baseline_recall:
        print(">> PROPOSITION PROVEN: Adding anthropogenic features improves early warning fire recall!")
    else:
        print(">> WARNING: Full model did not exceed baseline.")

    # 3. Predict latest horizon and generate TreeSHAP explanations
    full_model = cv_results["models"]["full_model"]
    latest_date = master_df["issue_date"].max()
    print(f"\nExtracting latest horizon predictions for issue_date = {latest_date:%Y-%m-%d}...")

    latest_df = master_df[master_df["issue_date"] == latest_date].copy().reset_index(drop=True)
    X_latest = latest_df[modeling.FULL_FEATURES]

    risk_probs = full_model.predict_proba(X_latest)[:, 1]
    latest_df["risk_score"] = np.round(risk_probs, 4)
    latest_df["risk_category"] = latest_df["risk_score"].map(categorize_risk)

    print("Computing local TreeSHAP factor attributions for all cells...")
    shap_factors = explainer.explain_cells_shap(full_model, X_latest, max_factors=3)

    # Attach top factors and JSON string for FastAPI inspect endpoint
    factor_jsons = []
    f1_names, f1_scores, f1_narratives = [], [], []
    f2_names, f2_scores, f2_narratives = [], [], []
    f3_names, f3_scores, f3_narratives = [], [], []

    for factors in shap_factors:
        factor_jsons.append(json.dumps(factors))
        f1_names.append(factors[0]["feature_name"])
        f1_scores.append(factors[0]["contribution_score"])
        f1_narratives.append(factors[0]["narrative"])

        f2_names.append(factors[1]["feature_name"])
        f2_scores.append(factors[1]["contribution_score"])
        f2_narratives.append(factors[1]["narrative"])

        f3_names.append(factors[2]["feature_name"])
        f3_scores.append(factors[2]["contribution_score"])
        f3_narratives.append(factors[2]["narrative"])

    latest_df["top_factors_json"] = factor_jsons
    latest_df["top_factor_1_name"] = f1_names
    latest_df["top_factor_1_score"] = f1_scores
    latest_df["top_factor_1_narrative"] = f1_narratives

    latest_df["top_factor_2_name"] = f2_names
    latest_df["top_factor_2_score"] = f2_scores
    latest_df["top_factor_2_narrative"] = f2_narratives

    latest_df["top_factor_3_name"] = f3_names
    latest_df["top_factor_3_score"] = f3_scores
    latest_df["top_factor_3_narrative"] = f3_narratives

    # 4. Save to processed and backend directories
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    latest_df.to_parquet(out_path, index=False)
    print(f"Saved latest risk dataset ({len(latest_df)} cells) to {out_path}!")

    # Copy to backend/data for DuckDB serving
    backend_data_dir = config.PIPELINE_ROOT.parent / "backend" / "data"
    backend_data_dir.mkdir(parents=True, exist_ok=True)
    backend_parquet = backend_data_dir / "oki_risk_latest.parquet"
    shutil.copyfile(out_path, backend_parquet)
    print(f"Copied serving dataset to {backend_parquet} for FastAPI/DuckDB serving!")

    # 5. Export GeoJSON for PMTiles compilation
    if Path(args.grid).is_file():
        print(f"Merging with geometries from {args.grid} to export GeoJSON...")
        grid_gdf = gpd.read_parquet(args.grid)
        merged_gdf = grid_gdf[["cell_id", "geometry"]].merge(latest_df, on="cell_id")

        geojson_out = out_path.with_suffix(".geojson")
        # Save slim geojson attributes for PMTiles
        slim_cols = [
            "cell_id",
            "risk_score",
            "risk_category",
            "khg_id",
            "canal_density_km_km2",
            "distance_to_road_m",
            "distance_to_waterway_m",
            "top_factor_1_name",
            "top_factor_1_score",
            "geometry",
        ]
        export_gdf = gpd.GeoDataFrame(merged_gdf[slim_cols], geometry="geometry", crs=grid_gdf.crs)
        if export_gdf.crs != 4326:
            export_gdf = export_gdf.to_crs(4326)
        export_gdf.to_file(geojson_out, driver="GeoJSON")
        print(f"Wrote slim spatial GeoJSON to {geojson_out} for PMTiles compilation!")


if __name__ == "__main__":
    main()
