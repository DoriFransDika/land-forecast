import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable, TYPE_CHECKING

from fastapi import HTTPException

from app.services.spatial_io_utils import (
    build_geotiff_meta_from_raster,
    read_vector_safely,
    validate_raster_extension,
)

if TYPE_CHECKING:
    import geopandas as gpd

logger = logging.getLogger(__name__)


def _require_preprocessing_libs():
    """Lazy-import pustaka geospasial berat agar server FastAPI tetap dapat boot meskipun dependensi belum terpasang."""
    try:
        import numpy as np
        import geopandas as gpd
        import rasterio
        from rasterio.enums import Resampling
        from rasterio.mask import mask
        from shapely.geometry import box, mapping
        return np, gpd, rasterio, Resampling, mask, box, mapping
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Pustaka geospasial belum terpasang di environment Python ({exc.name}). Jalankan 'pip install -r requirements.txt'."
        ) from exc


class SpatialPreprocessingService:
    """
    Tahap 2: Spatial Preprocessing Pipeline (Headless Server Service).
    Menangani sinkronisasi CRS, pemotongan (clipping) band Sentinel-2 berdasarkan
    batas administrasi, resampling band 20m -> 10m, serta validasi raster.
    """

    DEFAULT_BAND_PATTERNS: Dict[str, List[str]] = {
        "B02": ["*B02*.jp2", "*B02*.tif", "*B02*.tiff"],
        "B03": ["*B03*.jp2", "*B03*.tif", "*B03*.tiff"],
        "B04": ["*B04*.jp2", "*B04*.tif", "*B04*.tiff"],
        "B08": ["*B08*.jp2", "*B08*.tif", "*B08*.tiff"],
        "B11": ["*B11*.tif", "*B11*.tiff", "*B11*.jp2"],
    }

    @staticmethod
    def _resolve_file(directory: Path, explicit_name: Optional[str], patterns: List[str], label: str) -> Path:
        """Mencari berkas target di dalam `directory` secara dinamis tanpa path hardcode."""
        if explicit_name:
            candidate = directory / explicit_name
            if candidate.exists():
                return candidate
            raise HTTPException(
                status_code=404,
                detail=f"Berkas {label} '{explicit_name}' tidak ditemukan di direktori input."
            )

        for pattern in patterns:
            matches = sorted(directory.rglob(pattern))
            if matches:
                return matches[0]

        raise HTTPException(
            status_code=404,
            detail=f"Berkas {label} tidak ditemukan di '{directory.name}' (pola: {patterns})."
        )

    @staticmethod
    def align_vector_to_raster_crs(vector_gdf: "gpd.GeoDataFrame", raster_path: Path) -> "gpd.GeoDataFrame":
        """Menyamakan sistem koordinat (CRS) vektor dengan raster referensi serta validasi overlap."""
        _, _, rasterio, _, _, box, _ = _require_preprocessing_libs()
        try:
            with rasterio.open(raster_path) as src:
                if src.crs is None:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Raster '{raster_path.name}' tidak memiliki definisi CRS."
                    )

                if vector_gdf.crs is None:
                    raise HTTPException(
                        status_code=422,
                        detail="Shapefile batas administrasi tidak memiliki file proyeksi (.prj / CRS)."
                    )

                aligned_gdf = vector_gdf.to_crs(src.crs)

                # Validasi awal apakah geometri poligon bersinggungan dengan bounding box raster
                raster_bbox = box(*src.bounds)
                if not aligned_gdf.geometry.intersects(raster_bbox).any():
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"Geometri vektor tidak tumpang tindih (overlap) dengan cakupan citra '{raster_path.name}'. "
                            "Pastikan batas administrasi berada pada tile Sentinel-2 yang sesuai."
                        )
                    )

                return aligned_gdf

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Gagal menyelaraskan CRS antara vektor dan raster.")
            raise HTTPException(
                status_code=500,
                detail=f"Kesalahan penyelarasan CRS: {str(exc)}"
            ) from exc

    @staticmethod
    def clip_and_save(src_path: Path, boundary_gdf: "gpd.GeoDataFrame", output_path: Path) -> Dict[str, Any]:
        """
        Memotong raster (.jp2 Sentinel-2 maupun .tif) sesuai poligon `boundary_gdf`
        secara headless dan menyimpannya sebagai GeoTIFF float32 yang bersih.
        """
        validate_raster_extension(src_path)
        np, _, rasterio, _, mask, _, mapping = _require_preprocessing_libs()
        try:
            with rasterio.open(src_path) as src:
                geoms = [mapping(geom) for geom in boundary_gdf.geometry if geom is not None]
                if not geoms:
                    raise HTTPException(
                        status_code=422,
                        detail="Shapefile batas administrasi tidak memiliki geometri valid untuk clipping."
                    )

                try:
                    # Gunakan filled=False agar rasterio tidak mencoba memaksa -9999.0 ke uint16 (Sentinel-2 .jp2)
                    clipped_masked, transform = mask(
                        src,
                        geoms,
                        crop=True,
                        filled=False,
                    )
                except ValueError as val_err:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Proses pemotongan gagal untuk '{src_path.name}': Wilayah citra dan peta batas tidak saling tumpang tindih ({str(val_err)})."
                    ) from val_err

                clipped = clipped_masked.data.astype(np.float32)
                clipped[np.ma.getmaskarray(clipped_masked)] = -9999.0
                if src.nodata is not None:
                    clipped[clipped_masked.data == src.nodata] = -9999.0

                # Gunakan helper untuk membersihkan opsi driver khusus (.jp2 JP2OpenJPEG -> GTiff)
                meta = build_geotiff_meta_from_raster(
                    src=src,
                    height=clipped.shape[1],
                    width=clipped.shape[2],
                    transform=transform,
                )

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **meta) as dst:
                    dst.write(clipped)

                band_data = clipped[0]
                valid_pixels = band_data[band_data != meta["nodata"]]
                return {
                    "path": str(output_path),
                    "filename": output_path.name,
                    "source_format": src_path.suffix.lower(),
                    "shape": [int(clipped.shape[1]), int(clipped.shape[2])],
                    "crs": str(meta["crs"]),
                    "nodata": meta["nodata"],
                    "min": float(np.min(valid_pixels)) if valid_pixels.size > 0 else 0.0,
                    "max": float(np.max(valid_pixels)) if valid_pixels.size > 0 else 0.0,
                    "nodata_pixels": int(np.sum(band_data == meta["nodata"])),
                }

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Kesalahan saat clipping raster %s", src_path.name)
            raise HTTPException(
                status_code=500,
                detail=f"Gagal memotong raster '{src_path.name}': {str(exc)}"
            ) from exc

    @staticmethod
    def resample_to_reference(src_path: Path, ref_path: Path, output_path: Path) -> Dict[str, Any]:
        """
        Melakukan resampling band (misal B11 20m -> 10m) menggunakan interpolasi bilinear
        agar dimensi piksel identik dengan band referensi (B08).
        """
        np, _, rasterio, Resampling, _, _, _ = _require_preprocessing_libs()
        try:
            with rasterio.open(ref_path) as ref:
                profile = ref.profile.copy()
                ref_shape = ref.shape

            with rasterio.open(src_path) as src:
                resampled_band = src.read(
                    out_shape=(1, ref_shape[0], ref_shape[1]),
                    resampling=Resampling.bilinear,
                )[0].astype(np.float32)

            profile.update(driver="GTiff", dtype="float32", count=1)

            output_path.parent.mkdir(parents=True, exist_ok=True)
            with rasterio.open(output_path, "w", **profile) as dst:
                dst.write(resampled_band, 1)

            return {
                "path": str(output_path),
                "filename": output_path.name,
                "shape": [int(resampled_band.shape[0]), int(resampled_band.shape[1])],
                "crs": str(profile["crs"]),
                "resampling_method": "bilinear",
                "min": float(np.min(resampled_band)),
                "max": float(np.max(resampled_band)),
            }

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Kesalahan saat resampling %s terhadap %s", src_path.name, ref_path.name)
            raise HTTPException(
                status_code=500,
                detail=f"Gagal melakukan resampling '{src_path.name}' ke resolusi referensi: {str(exc)}"
            ) from exc

    @classmethod
    def run_preprocessing(
        cls,
        input_dir: Path,
        output_dir: Path,
        boundary_filename: Optional[str] = None,
        band_filenames: Optional[Dict[str, str]] = None,
        vector_dir: Optional[Path] = None,
        resample_b11: bool = True,
        log_callback: Optional[Callable[[str, int], None]] = None,
    ) -> Dict[str, Any]:
        """
        Orkestrator Tahap 2 Preprocessing secara lengkap dan headless.
        """
        def _log(msg: str, pct: int) -> None:
            if log_callback:
                log_callback(msg, pct)

        np, _, rasterio, _, _, _, _ = _require_preprocessing_libs()

        if not input_dir.exists():
            raise HTTPException(status_code=404, detail=f"Direktori input '{input_dir}' tidak ditemukan.")

        output_dir.mkdir(parents=True, exist_ok=True)
        band_filenames = band_filenames or {}
        resolved_vector_dir = vector_dir if (vector_dir and vector_dir.exists()) else input_dir

        _log("Memeriksa berkas citra satelit & peta batas wilayah...", 8)

        # 1. Resolusi path band citra satelit yang tersedia di input_dir
        band_paths: Dict[str, Path] = {}
        for band_key, patterns in cls.DEFAULT_BAND_PATTERNS.items():
            explicit = band_filenames.get(band_key)
            if explicit and (input_dir / explicit).exists():
                band_paths[band_key] = input_dir / explicit
                continue
            for pat in patterns:
                matches = sorted(input_dir.rglob(pat))
                if matches:
                    band_paths[band_key] = matches[0]
                    break

        if not band_paths:
            generic_rasters = [
                p for p in sorted(input_dir.rglob("*"))
                if p.is_file() and p.suffix.lower() in {".tif", ".tiff", ".jp2"}
            ]
            if not generic_rasters:
                raise HTTPException(
                    status_code=404,
                    detail=f"Tidak ada berkas raster (.tif, .tiff, .jp2) ditemukan di '{input_dir.name}'."
                )
            for idx, rpath in enumerate(generic_rasters, start=1):
                band_paths[f"BAND_{idx}"] = rpath

        ref_band_key = "B02" if "B02" in band_paths else next(iter(band_paths.keys()))
        ref_raster_path = band_paths[ref_band_key]

        # 2. Cek apakah terdapat shapefile batas administrasi untuk clipping
        has_vector = any(resolved_vector_dir.rglob("*.shp")) or any(resolved_vector_dir.glob("*.zip"))
        aligned_boundary = None
        boundary_shp_path: Optional[Path] = None
        if has_vector:
            _log("Menyelaraskan sistem koordinat (CRS) batas wilayah ke citra referensi...", 14)
            batas_gdf, boundary_shp_path = read_vector_safely(
                staging_dir=resolved_vector_dir,
                filename_hint=boundary_filename,
                patterns=["*BATAS*.shp", "*.shp"],
            )
            aligned_boundary = cls.align_vector_to_raster_crs(batas_gdf, ref_raster_path)

        # 3. Proses setiap band
        clipped_outputs: Dict[str, Dict[str, Any]] = {}
        total_bands = len(band_paths)
        for idx, (band_key, src_path) in enumerate(band_paths.items(), start=1):
            target_file = output_dir / f"{band_key}_clip_geotiff.tif"
            if aligned_boundary is not None:
                clipped_outputs[band_key] = cls.clip_and_save(src_path, aligned_boundary, target_file)
                _log(f"Pemotongan (clipping) band {band_key} selesai.", 15 + int((idx / max(total_bands, 1)) * 35))
            else:
                with rasterio.open(src_path) as src:
                    arr = src.read().astype(np.float32)
                    meta = build_geotiff_meta_from_raster(src, src.height, src.width, src.transform)
                    with rasterio.open(target_file, "w", **meta) as dst:
                        dst.write(arr)
                    band_data = arr[0]
                    clipped_outputs[band_key] = {
                        "path": str(target_file),
                        "filename": target_file.name,
                        "source_format": src_path.suffix.lower(),
                        "shape": [int(src.height), int(src.width)],
                        "crs": str(meta["crs"]),
                        "nodata": meta["nodata"],
                        "min": float(np.min(band_data)),
                        "max": float(np.max(band_data)),
                        "nodata_pixels": int(np.sum(band_data == meta["nodata"])),
                    }
                _log(f"Standarisasi band {band_key} selesai.", 15 + int((idx / max(total_bands, 1)) * 35))

        # 4. Resample B11 (20m) ke resolusi 10m sesuai B08
        output_files: Dict[str, str] = {k: v["path"] for k, v in clipped_outputs.items()}
        layer_metadata: Dict[str, Any] = dict(clipped_outputs)

        if resample_b11 and "B11" in clipped_outputs and "B08" in clipped_outputs:
            b11_10m_path = output_dir / "B11_10m.tif"
            b11_resampled_meta = cls.resample_to_reference(
                src_path=Path(clipped_outputs["B11"]["path"]),
                ref_path=Path(clipped_outputs["B08"]["path"]),
                output_path=b11_10m_path,
            )
            output_files["B11_10m"] = b11_resampled_meta["path"]
            layer_metadata["B11_10m"] = b11_resampled_meta
            _log("Penyeragaman resolusi B11 (20m → 10m Bilinear) selesai.", 58)

        return {
            "stage": "02_preprocessing",
            "status": "completed",
            "crs": clipped_outputs[ref_band_key]["crs"],
            "clipped_with_boundary": aligned_boundary is not None,
            "boundary_shp_path": str(boundary_shp_path) if boundary_shp_path else None,
            "boundary_feature_count": int(len(aligned_boundary)) if aligned_boundary is not None else 0,
            "boundary_bounds": [float(x) for x in aligned_boundary.total_bounds] if aligned_boundary is not None else None,
            "output_files": output_files,
            "layer_metadata": layer_metadata,
        }
