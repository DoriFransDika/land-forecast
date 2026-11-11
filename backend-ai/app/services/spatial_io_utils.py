import os
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from fastapi import HTTPException

# Komponen wajib agar GeoPandas/Fiona dapat membaca Shapefile beserta CRS dan atributnya
REQUIRED_SHP_COMPANIONS = (".dbf", ".shx", ".prj")
SUPPORTED_RASTER_EXTENSIONS = {".tif", ".tiff", ".jp2"}


def extract_zip_safely(zip_path: Path, extract_to: Path) -> Path:
    """
    Mengekstrak arsip ZIP dengan proteksi terhadap kerentanan Zip Slip (Path Traversal),
    lalu mengembalikan path direktori ekstraksi.
    """
    target_dir = extract_to.resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.namelist():
                resolved_target = (extract_to / member).resolve()
                # Pastikan path target selalu berada di dalam target_dir
                try:
                    resolved_target.relative_to(target_dir)
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Terdeteksi upaya Path Traversal (Zip Slip) pada entri '{member}'."
                    )

            zf.extractall(extract_to)
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Berkas arsip '{zip_path.name}' rusak atau bukan file ZIP yang valid."
        ) from exc

    return extract_to


def validate_shapefile_companions(shp_path: Path) -> Dict[str, Path]:
    """
    Memastikan file pendukung Shapefile (.dbf, .shx, .prj) berada di folder yang sama
    dengan basename yang identik (case-insensitive) agar GeoPandas/Fiona dapat membacanya.
    """
    if not shp_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Berkas Shapefile utama '{shp_path.name}' tidak ditemukan."
        )

    parent_dir = shp_path.parent
    target_stem_lower = shp_path.stem.lower()

    # Petakan seluruh file di folder yang sama berdasarkan (stem.lower(), suffix.lower())
    available_siblings: Dict[str, Path] = {}
    for item in parent_dir.iterdir():
        if item.is_file() and item.stem.lower() == target_stem_lower:
            available_siblings[item.suffix.lower()] = item

    missing: List[str] = [
        ext for ext in REQUIRED_SHP_COMPANIONS if ext not in available_siblings
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Komponen Shapefile '{shp_path.name}' tidak lengkap di folder staging. "
                f"Berkas pendukung yang hilang: {', '.join(missing)}. "
                "Pastikan .shp, .dbf, .shx, dan .prj memiliki nama dasar yang sama dan berada dalam satu folder."
            )
        )

    return {
        ".shp": shp_path,
        ".dbf": available_siblings[".dbf"],
        ".shx": available_siblings[".shx"],
        ".prj": available_siblings[".prj"],
    }


def resolve_vector_shapefile(
    staging_dir: Path,
    filename_hint: Optional[str] = None,
    patterns: Optional[List[str]] = None,
) -> Path:
    """
    Utilitas terpadu untuk menangani input vektor (.zip ATAU .shp terpisah):
    1. Jika terdapat file .zip di `staging_dir`, otomatis ekstrak ke subfolder terisolasi.
    2. Cari file .shp (sesuai `filename_hint` atau pola glob).
    3. Validasi kelengkapan file pendamping (.dbf, .shx, .prj) di folder yang sama.
    4. Mengembalikan Path siap-baca untuk GeoPandas/Fiona.
    """
    if not staging_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Direktori staging '{staging_dir}' tidak ditemukan."
        )

    # 1. Cek jika ada arsip .zip yang belum diekstrak
    zip_files = sorted(staging_dir.glob("*.zip"))
    for zip_path in zip_files:
        extract_dir = staging_dir / f"extracted_{zip_path.stem}"
        if not extract_dir.exists():
            extract_zip_safely(zip_path, extract_dir)

    # 2. Cari file .shp di staging_dir (termasuk hasil ekstraksi zip)
    shp_candidate: Optional[Path] = None

    if filename_hint:
        # Cari persis atau di dalam subfolder ekstraksi
        direct_match = staging_dir / filename_hint
        if direct_match.exists() and direct_match.suffix.lower() == ".shp":
            shp_candidate = direct_match
        else:
            matches = sorted(staging_dir.rglob(filename_hint))
            shp_matches = [m for m in matches if m.is_file() and m.suffix.lower() == ".shp"]
            if shp_matches:
                shp_candidate = shp_matches[0]
    else:
        search_patterns = patterns or ["*.shp"]
        for pat in search_patterns:
            matches = [
                m for m in sorted(staging_dir.rglob(pat))
                if m.is_file() and m.suffix.lower() == ".shp"
            ]
            if matches:
                shp_candidate = matches[0]
                break

    if not shp_candidate:
        raise HTTPException(
            status_code=404,
            detail="Berkas Shapefile (.shp) tidak ditemukan di folder staging maupun di dalam arsip ZIP."
        )

    # 3. Validasi kelengkapan (.dbf, .shx, .prj)
    validate_shapefile_companions(shp_candidate)

    return shp_candidate


def read_vector_safely(
    staging_dir: Path,
    filename_hint: Optional[str] = None,
    patterns: Optional[List[str]] = None,
):
    """
    Meresolusi, memvalidasi kelengkapan komponen, lalu memuat Shapefile ke GeoDataFrame.
    """
    try:
        import geopandas as gpd
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Pustaka GeoPandas belum terpasang ({exc.name}). Jalankan 'pip install -r requirements.txt'."
        ) from exc

    shp_path = resolve_vector_shapefile(
        staging_dir=staging_dir,
        filename_hint=filename_hint,
        patterns=patterns,
    )

    try:
        gdf = gpd.read_file(shp_path)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"GeoPandas/Fiona gagal membaca Shapefile '{shp_path.name}': {str(exc)}"
        ) from exc

    if gdf.empty:
        raise HTTPException(
            status_code=422,
            detail=f"Shapefile '{shp_path.name}' valid secara struktur tetapi tidak memiliki fitur geometri."
        )

    return gdf, shp_path


def build_geotiff_meta_from_raster(src, height: int, width: int, transform) -> Dict[str, Any]:
    """
    Membangun metadata GTiff yang bersih dari sumber raster (.jp2 Sentinel-2 maupun .tif).
    Menghapus properti driver khusus JP2OpenJPEG agar penulisan GTiff bebas error.
    """
    meta = src.meta.copy()
    # Buang opsi spesifik driver sumber (misal tiled/blocksize JP2) agar tidak bentrok dengan GTiff
    for incompatible_key in ("blockxsize", "blockysize", "tiled", "photometric", "interleave"):
        meta.pop(incompatible_key, None)

    meta.update({
        "driver": "GTiff",
        "height": height,
        "width": width,
        "transform": transform,
        "dtype": "float32",
        "nodata": -9999.0,
        "compress": "lzw",
    })
    return meta


def validate_raster_extension(raster_path: Path) -> None:
    """Memastikan ekstensi berkas raster merupakan .tif, .tiff, atau .jp2."""
    if raster_path.suffix.lower() not in SUPPORTED_RASTER_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format raster '{raster_path.suffix}' tidak didukung. Gunakan .tif, .tiff, atau .jp2."
        )

