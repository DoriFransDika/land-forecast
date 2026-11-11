import os
import shutil
import time
import uuid
import zipfile
from pathlib import Path
from typing import Dict, Any, Tuple
from fastapi import HTTPException, UploadFile

# Folder staging terisolasi di dalam backend-ai
STAGING_DIR = Path("staging").resolve()
STAGING_DIR.mkdir(parents=True, exist_ok=True)

# Batas Maksimum Ukuran File Individual (2GB)
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
CHUNK_SIZE_BYTES = 1024 * 1024  # 1 MB buffer

# Batas Kuota Penyimpanan Global Staging (Anti-Bloat Protection)
MAX_STAGING_STORAGE_BYTES = 50 * 1024 * 1024 * 1024  # 50 GB Total Staging Quota
MIN_FREE_DISK_BYTES = 10 * 1024 * 1024 * 1024        # 10 GB Minimum Free Disk Threshold

# Magic bytes signature untuk verifikasi tipe file riil
MAGIC_SIGNATURES = {
    "geotiff_little_endian": b"II*\x00",
    "geotiff_big_endian": b"MM\x00*",
    "bigtiff_little_endian": b"II+\x00",
    "jp2_container": b"\x00\x00\x00\x0cjP  \r\n\x87\n",
    "jp2_codestream": b"\xff\x4f\xff\x51",
    "shapefile_header": b"\x00\x00\x27\x0a",
    "zip": b"PK\x03\x04",
}


class StagingStorageManager:
    """Mengelola siklus hidup berkas di staging area: kuota disk, TTL 24 jam, dan pembersihan instan."""

    @staticmethod
    def check_storage_quota() -> None:
        """
        Proteksi Kapasitas Disk (Anti-Bloated):
        Mengecek total ukuran folder staging dan ruang harddisk yang tersisa.
        Mencegah server kehabisan penyimpanan (Disk Full DoS) saat banyak file gigabyte diunggah.
        """
        # 1. Cek ruang disk kosong pada partisi tempat staging berada
        disk_usage = shutil.disk_usage(STAGING_DIR)
        if disk_usage.free < MIN_FREE_DISK_BYTES:
            free_gb = round(disk_usage.free / (1024 ** 3), 2)
            raise HTTPException(
                status_code=507,
                detail=f"Kapasitas harddisk server kritis (Sisa {free_gb} GB). Upload ditolak demi menjaga kestabilan server."
            )

        # 2. Cek total akumulasi ukuran berkas di folder staging
        current_staging_size = StagingStorageManager.get_total_staging_size()
        if current_staging_size > MAX_STAGING_STORAGE_BYTES:
            used_gb = round(current_staging_size / (1024 ** 3), 2)
            limit_gb = round(MAX_STAGING_STORAGE_BYTES / (1024 ** 3), 2)
            raise HTTPException(
                status_code=507,
                detail=f"Kuota temporary staging area penuh ({used_gb} GB dari batas {limit_gb} GB). Tunggu proses auto-cleanup atau jalankan preprocessing."
            )

    @staticmethod
    def get_total_staging_size() -> int:
        """Menghitung total ukuran bytes dari seluruh folder sesi staging."""
        total = 0
        if not STAGING_DIR.exists():
            return 0
        for entry in STAGING_DIR.rglob("*"):
            if entry.is_file():
                try:
                    total += entry.stat().st_size
                except OSError:
                    pass
        return total

    @staticmethod
    def create_upload_session() -> Tuple[str, Path]:
        """Membuat direktori kerja terisolasi berbasis UUID v4 setelah validasi kuota disk."""
        StagingStorageManager.check_storage_quota()
        upload_id = str(uuid.uuid4())
        session_dir = STAGING_DIR / upload_id
        session_dir.mkdir(parents=True, exist_ok=True)
        return upload_id, session_dir

    @staticmethod
    async def save_streaming_file(upload_file: UploadFile, target_dir: Path) -> Path:
        """
        Menyimpan file secara streaming dengan buffer 1MB per chunk.
        Memverifikasi batas ukuran maksimum secara real-time.
        """
        safe_filename = Path(upload_file.filename or "uploaded_file").name
        destination_path = target_dir / safe_filename

        total_bytes_written = 0
        first_chunk = True

        try:
            with open(destination_path, "wb") as buffer:
                while True:
                    chunk = await upload_file.read(CHUNK_SIZE_BYTES)
                    if not chunk:
                        break

                    if first_chunk:
                        StagingStorageManager.validate_file_signature(safe_filename, chunk)
                        first_chunk = False

                    total_bytes_written += len(chunk)
                    if total_bytes_written > MAX_FILE_SIZE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="Ukuran berkas melebihi batas kapasitas maksimum 2GB. Operasi dihentikan."
                        )

                    buffer.write(chunk)

            return destination_path

        except Exception as e:
            if destination_path.exists():
                destination_path.unlink(missing_ok=True)
            raise e

    @staticmethod
    def validate_file_signature(filename: str, chunk_head: bytes) -> None:
        """Memverifikasi bahwa ekstensi file sesuai dengan magic byte aslinya."""
        ext = Path(filename).suffix.lower()

        if ext in [".tif", ".tiff"]:
            valid = (
                chunk_head.startswith(MAGIC_SIGNATURES["geotiff_little_endian"]) or
                chunk_head.startswith(MAGIC_SIGNATURES["geotiff_big_endian"]) or
                chunk_head.startswith(MAGIC_SIGNATURES["bigtiff_little_endian"])
            )
            if not valid:
                raise HTTPException(
                    status_code=400,
                    detail="Berkas berekstensi .tif namun isi biner bukan GeoTIFF yang valid."
                )

        elif ext == ".jp2":
            valid = (
                chunk_head.startswith(MAGIC_SIGNATURES["jp2_container"]) or
                chunk_head.startswith(MAGIC_SIGNATURES["jp2_codestream"])
            )
            if not valid:
                raise HTTPException(
                    status_code=400,
                    detail="Berkas berekstensi .jp2 bukan citra JPEG 2000 Sentinel-2 yang valid."
                )

        elif ext in [".shp", ".shx"]:
            if not chunk_head.startswith(MAGIC_SIGNATURES["shapefile_header"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Berkas berekstensi {ext} tidak memiliki header biner Shapefile yang valid."
                )

        elif ext == ".prj":
            try:
                chunk_head[:512].decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Berkas .prj harus berupa teks proyeksi WKT yang valid."
                )

        elif ext == ".zip":
            if not chunk_head.startswith(MAGIC_SIGNATURES["zip"]):
                raise HTTPException(
                    status_code=400,
                    detail="Berkas berekstensi .zip bukan arsip kompresi ZIP yang valid."
                )

        elif ext == ".csv":
            try:
                chunk_head[:512].decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Berkas .csv tidak valid atau terdeteksi biner mencurigakan."
                )

    @staticmethod
    def extract_zip_safely(zip_path: Path, extract_to: Path) -> Path:
        """Mengekstrak arsip ZIP dengan proteksi Zip Slip (Path Traversal)."""
        shp_found: Path | None = None
        target_dir = extract_to.resolve()

        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.namelist():
                resolved_target = (extract_to / member).resolve()
                if not str(resolved_target).startswith(str(target_dir)):
                    raise HTTPException(
                        status_code=400,
                        detail="Terdeteksi upaya eksploitasi Zip Slip / Path Traversal dalam file ZIP."
                    )

            zf.extractall(extract_to)

        for root, _, files in os.walk(extract_to):
            for file in files:
                if file.lower().endswith(".shp"):
                    shp_found = Path(root) / file
                    break

        if not shp_found:
            raise HTTPException(
                status_code=400,
                detail="File ZIP valid tetapi tidak ditemukan berkas Shapefile (.shp) di dalamnya."
            )

        return shp_found

    @staticmethod
    def cleanup_session(upload_id: str) -> bool:
        """Menghapus seketika folder staging sesi tertentu beserta seluruh file mentahnya."""
        session_dir = STAGING_DIR / upload_id
        if session_dir.exists() and session_dir.is_dir():
            shutil.rmtree(session_dir, ignore_errors=True)
            return True
        return False

    @staticmethod
    def garbage_collect_stale_files(max_age_hours: float = 24.0) -> int:
        """
        Garbage Collection Otomatis:
        Membersihkan file fisik pada staging area yang umurnya sudah melebihi 24 jam.
        """
        deleted_count = 0
        now = time.time()
        max_age_seconds = max_age_hours * 3600

        if not STAGING_DIR.exists():
            return 0

        for session_folder in STAGING_DIR.iterdir():
            if session_folder.is_dir():
                try:
                    folder_mtime = session_folder.stat().st_mtime
                    if (now - folder_mtime) > max_age_seconds:
                        shutil.rmtree(session_folder, ignore_errors=True)
                        deleted_count += 1
                except Exception:
                    continue

        return deleted_count

    @staticmethod
    def get_staging_diagnostics() -> Dict[str, Any]:
        """Mengembalikan metrik status kapasitas staging untuk audit server."""
        disk_usage = shutil.disk_usage(STAGING_DIR)
        staging_size = StagingStorageManager.get_total_staging_size()
        active_sessions = len([d for d in STAGING_DIR.iterdir() if d.is_dir()]) if STAGING_DIR.exists() else 0

        return {
            "staging_used_mb": round(staging_size / (1024 * 1024), 2),
            "staging_max_quota_gb": round(MAX_STAGING_STORAGE_BYTES / (1024 ** 3), 2),
            "server_disk_free_gb": round(disk_usage.free / (1024 ** 3), 2),
            "active_staging_sessions": active_sessions,
            "ttl_hours": 24,
            "status": "healthy" if disk_usage.free > MIN_FREE_DISK_BYTES else "warning"
        }
