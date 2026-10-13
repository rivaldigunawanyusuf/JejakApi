"""Extract Kesatuan Hidrologis Gambut (KHG) boundaries for OKI.

Delineates the 5 major peatland hydrological complexes in OKI from district aggregations:
- KHG_SUGIHAN_LUMPUR (Air Sugihan, Tulung Selapan)
- KHG_LUMPUR_JERUJU (Cengal, Sungai Menang)
- KHG_BURNAI_SIBUMBUNG (Pedamaran, Pedamaran Timur, Pangkalan Lapam)
- KHG_SIBUMBUNG_BATOK (Pampangan, Jejawi)
- KHG_JERUJU_MESUJI (Mesuji, Mesuji Raya, Mesuji Makmur)

Usage:
    uv run python extract_khg.py [--districts data/raw/boundaries/oki_districts.geojson] [--out data/raw/boundaries/oki_khg.geojson]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd

from jejak_pipeline import config

DISTRICT_TO_KHG = {
    "Air Sugihan": "KHG_SUGIHAN_LUMPUR",
    "Tulung Selapan": "KHG_SUGIHAN_LUMPUR",
    "Cengal": "KHG_LUMPUR_JERUJU",
    "Sungai Menang": "KHG_LUMPUR_JERUJU",
    "Pedamaran": "KHG_BURNAI_SIBUMBUNG",
    "Pedamaran Timur": "KHG_BURNAI_SIBUMBUNG",
    "Pangkalan Lapam": "KHG_BURNAI_SIBUMBUNG",
    "Pampangan": "KHG_SIBUMBUNG_BATOK",
    "Jejawi": "KHG_SIBUMBUNG_BATOK",
    "Mesuji": "KHG_JERUJU_MESUJI",
    "Mesuji Raya": "KHG_JERUJU_MESUJI",
    "Mesuji Makmur": "KHG_JERUJU_MESUJI",
}


def build_khg(districts_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Map and dissolve districts into KHG units."""
    gdf = districts_gdf.copy()
    gdf["khg_id"] = gdf["adm3_name"].map(DISTRICT_TO_KHG).fillna("NON_KHG")
    peat_gdf = gdf[gdf["khg_id"] != "NON_KHG"]
    dissolved = peat_gdf.dissolve(by="khg_id", as_index=False)[["khg_id", "geometry"]]
    return dissolved


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--districts",
        default=str(config.RAW_DIR / "boundaries" / "oki_districts.geojson"),
        help="Path to oki_districts.geojson",
    )
    parser.add_argument(
        "--out",
        default=str(config.RAW_DIR / "boundaries" / "oki_khg.geojson"),
        help="Path to output oki_khg.geojson",
    )
    args = parser.parse_args()

    in_path = Path(args.districts)
    if not in_path.is_file():
        raise FileNotFoundError(f"Districts file not found at {in_path}")

    print(f"Loading districts from {in_path}...")
    districts = gpd.read_file(in_path)
    khg = build_khg(districts)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    khg.to_file(out_path, driver="GeoJSON")
    print(f"Wrote {len(khg)} KHG units to {out_path}:")
    for _, row in khg.iterrows():
        print(f"  - {row['khg_id']}")


if __name__ == "__main__":
    main()
