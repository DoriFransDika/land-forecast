import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable, TYPE_CHECKING

from fastapi import HTTPException

if TYPE_CHECKING:
    import numpy as np

logger = logging.getLogger(__name__)


def _require_feature_libs():
    """Lazy-import pustaka geospasial dan tabular agar server FastAPI tetap dapat boot cleanly."""
    try:
        import numpy as np
        import pandas as pd
        import geopandas as gpd
        import rasterio
        from rasterio.features import rasterize
        return np, pd, gpd, rasterio, rasterize
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Pustaka geospasial/tabular belum terpasang ({exc.name}). Jalankan 'pip install -r requirements.txt'."
        ) from exc


class SpatialFeatureService:
    """
    Tahap 3: Feature Engineering & Spatial Rasterization (Headless Server Service).
    Menghasilkan indeks spektral (NDVI, NDWI, NDBI) serta rasterisasi atribut
    non-spasial (Kepadatan Penduduk & Rencana Pola Ruang / RTRW).
    """

    DEFAULT_RTRW_EXCLUDE: List[str] = [
        "AURBIRUGOTIGOBALEH",
        "GUGUKPANJANG",
        "MANDIANGINKOTOSELAYAN",
    ]

    DEFAULT_RTRW_MAPPING: Dict[str, int] = {
        "Badan Jalan": 1,
        "Kawasan Fasilitas Umum dan Fasilitas Sosial": 2,
        "Kawasan Hortikultura": 3,
        "Kawasan Pariwisata": 4,
        "Kawasan Perdagangan dan Jasa": 5,
        "Kawasan Perkantoran": 6,
        "Kawasan Perkebunan": 7,
        "Kawasan Perlindungan Setempat": 8,
        "Kawasan Pertahanan dan Keamanan": 9,
        "Kawasan Perumahan": 10,
        "Kawasan Tanaman Pangan": 11,
        "Kawasan Transportasi": 12,
        "Pemakaman": 13,
        "Rimba Kota": 14,
        "Taman Kota": 15,
    }

    @staticmethod
    def _find_optional_file(directory: Path, explicit_name: Optional[str], patterns: List[str]) -> Optional[Path]:
        if explicit_name:
            candidate = directory / explicit_name
            return candidate if candidate.exists() else None
        for pattern in patterns:
            matches = sorted(directory.rglob(pattern))
            if matches:
                return matches[0]
        return None

    @staticmethod
    def _compute_band_stats(arr: "np.ndarray", nodata_val: Optional[float] = None) -> Dict[str, float]:
        import numpy as np
        valid = arr.astype(np.float32)
        if nodata_val is not None:
            valid = np.where(valid == nodata_val, np.nan, valid)
        valid = valid[np.isfinite(valid)]
        if valid.size == 0:
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "std": 0.0}
        return {
            "min": float(np.min(valid)),
            "max": float(np.max(valid)),
            "mean": float(np.mean(valid)),
            "std": float(np.std(valid)),
        }

    @classmethod
    def compute_spectral_indices(
        cls,
        preprocessed_dir: Path,
        output_dir: Path,
        requested_indices: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Menghitung NDVI, NDWI, dan NDBI secara adaptif berdasarkan band yang tersedia di `preprocessed_dir`."""
        np, _, _, rasterio, _ = _require_feature_libs()
        try:
            band_files = {
                "B03": preprocessed_dir / "B03_clip_geotiff.tif",
                "B04": preprocessed_dir / "B04_clip_geotiff.tif",
                "B08": preprocessed_dir / "B08_clip_geotiff.tif",
                "B11": preprocessed_dir / "B11_10m.tif",
            }
            loaded_bands: Dict[str, Any] = {}
            nodata_masks: Dict[str, Any] = {}
            ref_meta = None

            for key, path in band_files.items():
                if path.exists():
                    with rasterio.open(path) as src:
                        arr = src.read(1).astype(np.float32)
                        loaded_bands[key] = arr
                        nd_mask = (arr == -9999.0)
                        if src.nodata is not None:
                            nd_mask = nd_mask | (arr == src.nodata)
                        nodata_masks[key] = nd_mask
                        if ref_meta is None:
                            ref_meta = src.profile.copy()

            if ref_meta is None:
                return {}

            ref_meta.update(driver="GTiff", dtype="float32", count=1, nodata=-9999.0)
            eps = 1e-10
            targets = set(requested_indices or ["NDVI", "NDWI", "NDBI"])
            indices_data: Dict[str, Any] = {}

            def _calc_index(b_num_key: str, b_den_key: str):
                num = loaded_bands[b_num_key]
                den = loaded_bands[b_den_key]
                invalid = nodata_masks[b_num_key] | nodata_masks[b_den_key]
                res = np.where(invalid, -9999.0, (num - den) / (num + den + eps))
                return res.astype(np.float32)

            if "NDVI" in targets and "B08" in loaded_bands and "B04" in loaded_bands:
                indices_data["NDVI"] = _calc_index("B08", "B04")
            if "NDWI" in targets and "B03" in loaded_bands and "B08" in loaded_bands:
                indices_data["NDWI"] = _calc_index("B03", "B08")
            if "NDBI" in targets and "B11" in loaded_bands and "B08" in loaded_bands:
                indices_data["NDBI"] = _calc_index("B11", "B08")

            output_dir.mkdir(parents=True, exist_ok=True)
            results: Dict[str, Any] = {}

            for name, arr_f32 in indices_data.items():
                out_path = output_dir / f"{name}.tif"
                with rasterio.open(out_path, "w", **ref_meta) as dst:
                    dst.write(arr_f32, 1)

                results[name] = {
                    "path": str(out_path),
                    "filename": out_path.name,
                    "shape": [int(arr_f32.shape[0]), int(arr_f32.shape[1])],
                    "stats": cls._compute_band_stats(arr_f32, nodata_val=-9999.0),
                }

            return results

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Gagal menghitung indeks spektral.")
            raise HTTPException(
                status_code=500,
                detail=f"Kesalahan perhitungan indeks spektral (NDVI/NDWI/NDBI): {str(exc)}"
            ) from exc

    @classmethod
    def generate_population_density_raster(
        cls,
        boundary_path: Path,
        population_csv_path: Path,
        ref_raster_path: Path,
        output_path: Path,
        join_column: str = "DESAKEL",
        count_column: str = "jumlah",
    ) -> Dict[str, Any]:
        """Menggabungkan batas administrasi dengan data penduduk CSV lalu merasterisasi kepadatan (jiwa/ha)."""
        np, pd, gpd, rasterio, rasterize = _require_feature_libs()
        try:
            batas_gdf = gpd.read_file(boundary_path)
            penduduk_df = pd.read_csv(population_csv_path)

            if join_column not in batas_gdf.columns or join_column not in penduduk_df.columns:
                raise HTTPException(
                    status_code=422,
                    detail=f"Kolom join '{join_column}' tidak ditemukan pada shapefile batas atau file CSV penduduk."
                )

            if count_column not in penduduk_df.columns:
                raise HTTPException(
                    status_code=422,
                    detail=f"Kolom jumlah penduduk '{count_column}' tidak ditemukan pada file CSV."
                )

            with rasterio.open(ref_raster_path) as ref:
                ref_crs = ref.crs
                ref_shape = ref.shape
                ref_transform = ref.transform
                meta = ref.profile.copy()

            batas_aligned = batas_gdf.to_crs(ref_crs)
            batas_pop = batas_aligned.merge(penduduk_df, on=join_column, how="left")

            batas_pop["luas_m2"] = batas_pop.geometry.area
            batas_pop["luas_ha"] = batas_pop["luas_m2"] / 10000.0
            batas_pop[count_column] = pd.to_numeric(batas_pop[count_column], errors="coerce").fillna(0.0)
            batas_pop["density"] = np.where(
                batas_pop["luas_ha"] > 0,
                batas_pop[count_column] / batas_pop["luas_ha"],
                0.0,
            )

            shapes = [
                (geom, float(val))
                for geom, val in zip(batas_pop.geometry, batas_pop["density"])
                if geom is not None and np.isfinite(val)
            ]

            population_raster = rasterize(
                shapes,
                out_shape=ref_shape,
                transform=ref_transform,
                fill=0.0,
                dtype="float32",
            )

            meta.update(driver="GTiff", dtype="float32", count=1)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with rasterio.open(output_path, "w", **meta) as dst:
                dst.write(population_raster, 1)

            return {
                "path": str(output_path),
                "filename": output_path.name,
                "shape": [int(population_raster.shape[0]), int(population_raster.shape[1])],
                "stats": cls._compute_band_stats(population_raster, nodata_val=0.0),
                "matched_regions": int(len(batas_pop)),
            }

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Gagal menghasilkan raster PopulationDensity.")
            raise HTTPException(
                status_code=500,
                detail=f"Kesalahan rasterisasi PopulationDensity: {str(exc)}"
            ) from exc

    @classmethod
    def generate_rtrw_raster(
        cls,
        rtrw_shp_path: Path,
        ref_raster_path: Path,
        output_path: Path,
        zone_column: str = "NAMOBJ",
        exclude_zones: Optional[List[str]] = None,
        zone_mapping: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """Membersihkan poligon RTRW, memetakan kode pola ruang (1-15), dan merasterisasi ke uint8 GeoTIFF."""
        np, _, gpd, rasterio, rasterize = _require_feature_libs()
        try:
            rtrw_gdf = gpd.read_file(rtrw_shp_path)
            if zone_column not in rtrw_gdf.columns:
                raise HTTPException(
                    status_code=422,
                    detail=f"Kolom zona RTRW '{zone_column}' tidak ditemukan pada shapefile RTRW."
                )

            with rasterio.open(ref_raster_path) as ref:
                ref_crs = ref.crs
                ref_shape = ref.shape
                ref_transform = ref.transform
                meta = ref.profile.copy()

            rtrw_aligned = rtrw_gdf.to_crs(ref_crs)
            exclude_list = exclude_zones if exclude_zones is not None else cls.DEFAULT_RTRW_EXCLUDE
            mapping_dict = zone_mapping if zone_mapping is not None else cls.DEFAULT_RTRW_MAPPING

            rtrw_clean = rtrw_aligned[~rtrw_aligned[zone_column].isin(exclude_list)].copy()
            rtrw_clean["RTRW_CODE"] = rtrw_clean[zone_column].map(mapping_dict)
            rtrw_valid = rtrw_clean.dropna(subset=["RTRW_CODE"])

            if rtrw_valid.empty:
                raise HTTPException(
                    status_code=422,
                    detail="Tidak ada poligon RTRW yang cocok dengan tabel pemetaan kelas pola ruang."
                )

            shapes = [
                (geom, int(val))
                for geom, val in zip(rtrw_valid.geometry, rtrw_valid["RTRW_CODE"])
                if geom is not None
            ]

            rtrw_raster = rasterize(
                shapes,
                out_shape=ref_shape,
                transform=ref_transform,
                fill=0,
                dtype="uint8",
            )

            meta.update(driver="GTiff", dtype="uint8", count=1, nodata=0)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with rasterio.open(output_path, "w", **meta) as dst:
                dst.write(rtrw_raster, 1)

            unique_codes, counts = np.unique(rtrw_raster, return_counts=True)
            class_pixel_counts = {
                int(code): int(cnt) for code, cnt in zip(unique_codes, counts) if code != 0
            }

            return {
                "path": str(output_path),
                "filename": output_path.name,
                "shape": [int(rtrw_raster.shape[0]), int(rtrw_raster.shape[1])],
                "mapped_polygon_count": int(len(rtrw_valid)),
                "class_pixel_distribution": class_pixel_counts,
            }

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Gagal menghasilkan raster RTRW.")
            raise HTTPException(
                status_code=500,
                detail=f"Kesalahan rasterisasi RTRW: {str(exc)}"
            ) from exc

    @classmethod
    def run_feature_extraction(
        cls,
        input_dir: Path,
        preprocessed_dir: Path,
        output_dir: Path,
        boundary_filename: Optional[str] = None,
        population_csv_filename: Optional[str] = None,
        rtrw_filename: Optional[str] = None,
        vector_dir: Optional[Path] = None,
        tabular_dir: Optional[Path] = None,
        requested_indices: Optional[List[str]] = None,
        log_callback: Optional[Callable[[str, int], None]] = None,
    ) -> Dict[str, Any]:
        """
        Orkestrator Tahap 3 secara headless:
        1. Hitung indeks spektral adaptif: NDVI.tif, NDWI.tif, NDBI.tif
        2. Rasterisasi Kepadatan Penduduk (jika data CSV penduduk & batas tersedia)
        3. Rasterisasi RTRW (jika shapefile RTRW tersedia)
        """
        def _log(msg: str, pct: int) -> None:
            if log_callback:
                log_callback(msg, pct)

        _require_feature_libs()
        output_dir.mkdir(parents=True, exist_ok=True)
        resolved_vector_dir = vector_dir if (vector_dir and vector_dir.exists()) else input_dir
        resolved_tabular_dir = tabular_dir if (tabular_dir and tabular_dir.exists()) else input_dir

        ref_raster = preprocessed_dir / "B02_clip_geotiff.tif"
        if not ref_raster.exists():
            tif_candidates = sorted(preprocessed_dir.glob("*.tif"))
            if tif_candidates:
                ref_raster = tif_candidates[0]

        # 1. Indeks Spektral
        _log("Menghitung indeks kondisi lahan (NDVI, NDWI, NDBI)...", 62)
        spectral_results = cls.compute_spectral_indices(
            preprocessed_dir,
            output_dir,
            requested_indices=requested_indices,
        )
        for name in spectral_results:
            _log(f"Perhitungan {name} selesai.", 68)

        output_files: Dict[str, str] = {
            name: info["path"] for name, info in spectral_results.items()
        }
        layer_metadata: Dict[str, Any] = dict(spectral_results)

        # 2. Kepadatan Penduduk (Opsional jika CSV tersedia)
        boundary_path = cls._find_optional_file(resolved_vector_dir, boundary_filename, ["*BATAS*.shp", "*.shp"])
        pop_csv_path = cls._find_optional_file(resolved_tabular_dir, population_csv_filename, ["*Penduduk*.csv", "*.csv"])

        if boundary_path and pop_csv_path and ref_raster.exists():
            _log("Menggabungkan batas wilayah & CSV penduduk menjadi peta Kepadatan Penduduk...", 74)
            pop_out = output_dir / "PopulationDensity.tif"
            pop_meta = cls.generate_population_density_raster(
                boundary_path=boundary_path,
                population_csv_path=pop_csv_path,
                ref_raster_path=ref_raster,
                output_path=pop_out,
            )
            output_files["PopulationDensity"] = pop_meta["path"]
            layer_metadata["PopulationDensity"] = pop_meta
            _log("Rasterisasi Kepadatan Penduduk (PopulationDensity.tif) selesai.", 79)

        # 3. Raster RTRW (Opsional jika SHP RTRW tersedia)
        rtrw_path = cls._find_optional_file(resolved_vector_dir, rtrw_filename, ["*Rencana*.shp", "*RTRW*.shp", "*Pola*.shp"])
        if rtrw_path and ref_raster.exists():
            _log("Memetakan & merasterisasi 15 kelas Tata Ruang (RTRW)...", 83)
            rtrw_out = output_dir / "RTRW.tif"
            rtrw_meta = cls.generate_rtrw_raster(
                rtrw_shp_path=rtrw_path,
                ref_raster_path=ref_raster,
                output_path=rtrw_out,
            )
            output_files["RTRW"] = rtrw_meta["path"]
            layer_metadata["RTRW"] = rtrw_meta
            _log("Rasterisasi Tata Ruang (RTRW.tif) selesai.", 88)

        return {
            "stage": "03_feature_embedding",
            "status": "completed",
            "output_files": output_files,
            "layer_metadata": layer_metadata,
        }
