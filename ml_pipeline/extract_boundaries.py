"""Extract Kabupaten OKI boundary, districts and build the official 1 km analysis grid.

Usage:
    uv run python extract_boundaries.py \
        [--zip data/raw/boundaries/idn_admin_boundaries.shp.zip]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd

from jejak_pipeline import boundary, config, grid


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--zip",
        default=str(config.RAW_DIR / "boundaries" / "idn_admin_boundaries.shp.zip"),
        help="Path to idn_admin_boundaries.shp.zip from HDX",
    )
    parser.add_argument(
        "--out-dir",
        default=str(config.RAW_DIR / "boundaries"),
        help="Directory to save extracted boundary files",
    )
    parser.add_argument(
        "--grid-out",
        default=str(config.INTERIM_DIR / "oki_grid_1km.parquet"),
        help="Output path for the 1 km grid",
    )
    args = parser.parse_args()

    zip_path = Path(args.zip)
    if not zip_path.is_file():
        raise FileNotFoundError(f"HDX boundaries archive not found at {zip_path}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Extract Admin 2: Kabupaten OKI
    print(f"Reading Admin 2 (Kabupaten/Kota) from {zip_path}...")
    vsi_adm2 = f"/vsizip/{zip_path.as_posix()}/idn_admin2.shp"
    gdf_adm2 = gpd.read_file(vsi_adm2)
    oki = boundary.filter_regency(gdf_adm2, "Ogan Komering Ilir")
    print(f"Found OKI boundary: {len(oki)} feature(s), bounds: {oki.total_bounds}")

    oki_geojson = out_dir / "oki_boundary.geojson"
    oki.to_file(oki_geojson, driver="GeoJSON")
    print(f"Saved OKI boundary -> {oki_geojson}")

    # 2. Extract Admin 3: Kecamatan inside OKI
    print("Reading Admin 3 (Kecamatan)...")
    vsi_adm3 = f"/vsizip/{zip_path.as_posix()}/idn_admin3.shp"
    gdf_adm3 = gpd.read_file(vsi_adm3)
    pcode_col = [c for c in gdf_adm3.columns if "adm2_pcode" in c.lower()]
    name_col = [c for c in gdf_adm3.columns if "adm2_name" in c.lower()]

    if pcode_col:
        districts = gdf_adm3[gdf_adm3[pcode_col[0]] == "ID1602"].to_crs(4326)
    elif name_col:
        districts = gdf_adm3[
            gdf_adm3[name_col[0]].str.lower().str.contains("ogan komering ilir")
        ].to_crs(4326)
    else:
        districts = gpd.sjoin(gdf_adm3.to_crs(4326), oki[["geometry"]], predicate="within")

    districts_geojson = out_dir / "oki_districts.geojson"
    districts.to_file(districts_geojson, driver="GeoJSON")
    print(f"Saved {len(districts)} OKI districts -> {districts_geojson}")

    # 3. Extract Admin 4: Desa / Kelurahan inside OKI (for village alerting F4)
    print("Reading Admin 4 (Desa/Kelurahan)...")
    vsi_adm4 = f"/vsizip/{zip_path.as_posix()}/idn_admin4.shp"
    gdf_adm4 = gpd.read_file(vsi_adm4)
    pcode4_col = [c for c in gdf_adm4.columns if "adm2_pcode" in c.lower()]
    if pcode4_col:
        villages = gdf_adm4[gdf_adm4[pcode4_col[0]] == "ID1602"].to_crs(4326)
    else:
        villages = gpd.sjoin(gdf_adm4.to_crs(4326), oki[["geometry"]], predicate="within")

    villages_geojson = out_dir / "oki_villages.geojson"
    villages.to_file(villages_geojson, driver="GeoJSON")
    print(f"Saved {len(villages)} OKI villages -> {villages_geojson}")

    # 4. Build official 1 km x 1 km grid
    print("Building official 1 km x 1 km grid for Kabupaten OKI...")
    grid_gdf = grid.build_grid(oki)
    print(f"Grid constructed: {len(grid_gdf)} cells of 1 km x 1 km")

    grid_out = Path(args.grid_out)
    grid_out.parent.mkdir(parents=True, exist_ok=True)
    # Save as Parquet (with WKT geometry) and GeoJSON for MapLibre/Tippecanoe
    grid_gdf.to_parquet(grid_out, index=False)
    print(f"Saved 1 km grid Parquet -> {grid_out}")

    wgs_grid = grid.to_wgs84(grid_gdf)
    geojson_out = grid_out.with_suffix(".geojson")
    wgs_grid.to_file(geojson_out, driver="GeoJSON")
    print(f"Saved 1 km grid GeoJSON -> {geojson_out}")


if __name__ == "__main__":
    main()
