import csv
from pathlib import Path
from typing import Dict, Any, List

class SpatialMetadataExtractor:
    """Ekstraksi metadata secara instan tanpa memuat seluruh piksel raster atau ribuan baris vektor ke RAM."""

    @staticmethod
    def extract_geotiff_metadata(file_path: Path) -> Dict[str, Any]:
        """
        Membaca header GeoTIFF menggunakan Rasterio.
        Catatan: HANYA membaca atribut header (profile, bounds, transform, crs)
        dan TIDAK memanggil read() piksel mentah ke RAM.
        """
        try:
            import rasterio
            from rasterio.warp import transform_bounds

            with rasterio.open(file_path) as src:
                # Dapatkan koordinat batas (Bounding Box) asli
                bounds = src.bounds
                crs_str = str(src.crs) if src.crs else "Tidak terdefinisi"

                # Hitung estimasi lat/lng bounds (WGS84 EPSG:4326) untuk rendering Leaflet jika CRS diketahui
                wgs84_bounds = None
                if src.crs:
                    try:
                        min_x, min_y, max_x, max_y = transform_bounds(src.crs, "EPSG:4326", *bounds)
                        wgs84_bounds = {
                            "min_lat": min_y,
                            "min_lng": min_x,
                            "max_lat": max_y,
                            "max_lng": max_x
                        }
                    except Exception:
                        pass

                return {
                    "type": "Raster GeoTIFF",
                    "width_px": src.width,
                    "height_px": src.height,
                    "band_count": src.count,
                    "crs": crs_str,
                    "resolution_x": src.res[0],
                    "resolution_y": src.res[1],
                    "nodata_value": src.nodata,
                    "driver": src.driver,
                    "native_bounds": {
                        "left": bounds.left,
                        "bottom": bounds.bottom,
                        "right": bounds.right,
                        "top": bounds.top,
                    },
                    "wgs84_bounds": wgs84_bounds,
                    "file_size_mb": round(file_path.stat().st_size / (1024 * 1024), 2)
                }

        except ImportError:
            # Fallback ringan jika rasterio belum dikompilasi di environment lokal
            return {
                "type": "Raster GeoTIFF (Fast-Header Fallback)",
                "filename": file_path.name,
                "file_size_mb": round(file_path.stat().st_size / (1024 * 1024), 2),
                "note": "Rasterio belum terpasang. File berhasil di-stage dan siap diproses."
            }

    @staticmethod
    def extract_shapefile_metadata(shp_path: Path) -> Dict[str, Any]:
        """
        Membaca struktur layer vektor Shapefile menggunakan Fiona / GeoPandas.
        Hanya mengambil skema atribut, total fitur (poligon/garis/titik), dan bounds.
        """
        try:
            import geopandas as gpd

            # Membaca hanya 5 baris pertama untuk preview skema atribut agar sangat cepat
            gdf_sample = gpd.read_file(shp_path, rows=5)
            
            # Hitung total fitur tanpa memuat geometries ke memori penuh jika memungkinkan
            total_features = len(gpd.read_file(shp_path, ignore_geometry=True))
            
            bounds = gdf_sample.total_bounds  # [minx, miny, maxx, maxy]
            crs_str = str(gdf_sample.crs) if gdf_sample.crs else "Tidak terdefinisi"

            return {
                "type": "Vector Shapefile",
                "geometry_type": gdf_sample.geom_type.iloc[0] if not gdf_sample.empty else "Unknown",
                "total_features": total_features,
                "crs": crs_str,
                "attribute_columns": list(gdf_sample.columns.drop("geometry", errors="ignore")),
                "preview_sample": gdf_sample.drop(columns=["geometry"], errors="ignore").to_dict(orient="records"),
                "bounds": {
                    "min_x": bounds[0] if len(bounds) > 0 else None,
                    "min_y": bounds[1] if len(bounds) > 1 else None,
                    "max_x": bounds[2] if len(bounds) > 2 else None,
                    "max_y": bounds[3] if len(bounds) > 3 else None,
                }
            }

        except ImportError:
            # Fallback jika geopandas belum dikompilasi
            return {
                "type": "Vector Shapefile (Fallback)",
                "filename": shp_path.name,
                "file_size_kb": round(shp_path.stat().st_size / 1024, 2),
                "note": "Shapefile berhasil diekstraksi ke staging area."
            }

    @staticmethod
    def extract_csv_metadata(csv_path: Path) -> Dict[str, Any]:
        """
        Membaca file tabular CSV secara cepat:
        Hanya membaca header dan 5 baris pertama untuk preview skema,
        serta menghitung total baris secara streaming tanpa memuat seluruh file ke memori.
        """
        columns: List[str] = []
        preview_rows: List[Dict[str, Any]] = []
        total_rows = 0

        with open(csv_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            columns = reader.fieldnames or []
            for i, row in enumerate(reader):
                if i < 5:
                    preview_rows.append(row)
                total_rows += 1

        return {
            "type": "Tabular CSV",
            "total_records": total_rows,
            "column_count": len(columns),
            "columns": columns,
            "preview_sample": preview_rows,
            "file_size_kb": round(csv_path.stat().st_size / 1024, 2)
        }

