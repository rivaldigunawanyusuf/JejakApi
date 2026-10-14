"""DuckDB storage and spatial analytical engine for JEJAK API."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb

from app.core import config


class DuckDBEngine:
    """Manages an in-process DuckDB analytical connection to pre-computed GeoParquet files."""

    def __init__(self, parquet_path: Path | str | None = None) -> None:
        self.parquet_path = Path(parquet_path or config.DATA_PARQUET_PATH)
        self._conn: Optional[duckdb.DuckDBPyConnection] = None

    @property
    def conn(self) -> duckdb.DuckDBPyConnection:
        if self._conn is None:
            self._conn = duckdb.connect(database=":memory:", read_only=False)
            self._init_views()
        return self._conn

    def _init_views(self) -> None:
        if not self.parquet_path.is_file():
            raise FileNotFoundError(
                f"Parquet risk dataset not found at {self.parquet_path}. "
                "Ensure ML pipeline phase 2 training has been executed."
            )
        # Register analytical view over pre-computed parquet file on NVMe
        escaped_path = str(self.parquet_path).replace("'", "''")
        col_names = [
            col[0]
            for col in self.conn.execute(
                f"DESCRIBE SELECT * FROM read_parquet('{escaped_path}')"
            ).fetchall()
        ]
        extra_cols = []
        if "access_distance_m" not in col_names:
            extra_cols.append("LEAST(distance_to_road_m, distance_to_waterway_m) AS access_distance_m")
        if "risk_score_calibrated" not in col_names:
            extra_cols.append("risk_score AS risk_score_calibrated")
        extra_sql = (", " + ", ".join(extra_cols)) if extra_cols else ""

        self.conn.execute(
            f"CREATE OR REPLACE VIEW oki_risk AS SELECT *{extra_sql} FROM read_parquet('{escaped_path}')"
        )

    def get_total_cells(self) -> int:
        res = self.conn.execute("SELECT count(*) FROM oki_risk").fetchone()
        return res[0] if res else 0

    def get_top_k(
        self,
        k: int = 10,
        khg_id: Optional[str] = None,
        risk_category: Optional[str] = None,
        max_access_distance_m: Optional[float] = None,
        sort_by: str = "risk_score",
    ) -> List[Dict[str, Any]]:
        """Fetch top-k fire risk priority cells using columnar projection (ADR-003 & ADR-006).

        Supports calibrated risk score sorting and accessibility constraints (distance to road/waterway).
        """
        conditions = []
        params: list[Any] = []

        if khg_id:
            conditions.append("khg_id = ?")
            params.append(khg_id)

        if risk_category:
            conditions.append("risk_category = ?")
            params.append(risk_category)

        if max_access_distance_m is not None:
            conditions.append("access_distance_m <= ?")
            params.append(max_access_distance_m)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        order_col = (
            "risk_score_calibrated"
            if sort_by in ["risk_score_calibrated", "calibrated"]
            else ("access_distance_m" if sort_by in ["access_distance_m", "accessibility"] else "risk_score")
        )
        order_dir = "ASC" if sort_by in ["access_distance_m", "accessibility"] else "DESC"

        query = f"""
            SELECT 
                cell_id,
                risk_score,
                risk_score_calibrated,
                risk_category,
                khg_id,
                lon,
                lat,
                canal_density_km_km2,
                distance_to_road_m,
                distance_to_waterway_m,
                access_distance_m,
                top_factor_1_name,
                top_factor_1_score
            FROM oki_risk
            {where_clause}
            ORDER BY {order_col} {order_dir}
            LIMIT ?
        """
        params.append(k)
        df = self.conn.execute(query, params).df()
        return df.to_dict(orient="records")

    def get_cell_by_id(self, cell_id: str) -> Optional[Dict[str, Any]]:
        """Inspect specific 1 km cell including all static, dynamic, and TreeSHAP features."""
        query = "SELECT * FROM oki_risk WHERE cell_id = ? LIMIT 1"
        df = self.conn.execute(query, [cell_id]).df()
        if df.empty:
            clean = cell_id.strip()
            patterns = [clean.upper()]
            if clean.isdigit():
                patterns.extend([
                    f"OKI_GRID_{clean}",
                    f"%_GRID_{clean.zfill(5)}",
                    f"%_GRID_{clean}",
                ])
            if "MERAUKE" in clean.upper() and not clean.upper().startswith("PAPUA_"):
                patterns.append(f"PAPUA_{clean.upper()}")
            if "SORONG" in clean.upper() and not clean.upper().startswith("PBD_"):
                patterns.append(f"PBD_{clean.upper()}")
            if "MAROS" in clean.upper() and not clean.upper().startswith("SULAWESI_"):
                patterns.append(f"SULAWESI_{clean.upper()}")
            patterns.append(f"%{clean.upper()}%")

            for pat in patterns:
                fb_df = self.conn.execute(
                    "SELECT * FROM oki_risk WHERE cell_id ILIKE ? LIMIT 1", [pat]
                ).df()
                if not fb_df.empty:
                    df = fb_df
                    break

        if df.empty:
            return None
        record = df.iloc[0].to_dict()

        # Parse TreeSHAP factors JSON
        top_factors = []
        if record.get("top_factors_json"):
            try:
                top_factors = json.loads(record["top_factors_json"])
            except Exception:
                top_factors = []

        # Fallback to individual factor columns if needed
        if not top_factors:
            for idx in [1, 2, 3]:
                fname = record.get(f"top_factor_{idx}_name")
                fscore = record.get(f"top_factor_{idx}_score")
                fnarr = record.get(f"top_factor_{idx}_narrative")
                if fname:
                    top_factors.append({
                        "feature_name": str(fname),
                        "contribution_score": round(float(fscore or 0.0), 4),
                        "narrative": str(fnarr or ""),
                    })

        record["top_factors"] = top_factors
        return record

    def find_nearest_cell(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Find the nearest 1 km grid cell to the given lat/lon coordinates."""
        query = """
            SELECT cell_id, lon, lat, risk_score, risk_category, khg_id,
                   power(lon - ?, 2) + power(lat - ?, 2) as dist
            FROM oki_risk
            ORDER BY dist ASC
            LIMIT 1
        """
        df = self.conn.execute(query, [lon, lat]).df()
        if df.empty:
            return None
        return df.iloc[0].to_dict()

    def get_stats_summary(self) -> Dict[str, Any]:
        """Aggregate summary statistics across all cells in OKI."""
        total_cells = self.get_total_cells()
        dist_query = """
            SELECT risk_category, count(*) as count
            FROM oki_risk
            GROUP BY risk_category
        """
        dist_df = self.conn.execute(dist_query).df()
        risk_dist = {"Bahaya": 0, "Siaga": 0, "Waspada": 0}
        for _, row in dist_df.iterrows():
            cat = str(row["risk_category"])
            if cat in risk_dist:
                risk_dist[cat] = int(row["count"])

        risk_pct = {
            cat: round((count / total_cells * 100), 2) if total_cells > 0 else 0.0
            for cat, count in risk_dist.items()
        }

        agg_query = """
            SELECT 
                avg(canal_density_km_km2) as mean_canal,
                max(risk_score) as max_score
            FROM oki_risk
        """
        agg_res = self.conn.execute(agg_query).fetchone()
        mean_canal = round(float(agg_res[0]), 3) if agg_res and agg_res[0] is not None else 0.0
        max_score = round(float(agg_res[1]), 4) if agg_res and agg_res[1] is not None else 0.0

        highest_cell_res = self.conn.execute(
            "SELECT cell_id FROM oki_risk ORDER BY risk_score DESC LIMIT 1"
        ).fetchone()
        highest_cell = highest_cell_res[0] if highest_cell_res else ""

        return {
            "total_cells": total_cells,
            "risk_distribution": risk_dist,
            "risk_percentage": risk_pct,
            "mean_canal_density_km_km2": mean_canal,
            "max_risk_score": max_score,
            "highest_risk_cell": highest_cell,
        }

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None


# Global singleton instance
db_engine = DuckDBEngine()
