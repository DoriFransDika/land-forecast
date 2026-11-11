import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, Field

from app.services.spatial_pipeline import (
    SpatialPreprocessingService,
    SpatialFeatureService,
)
from app.services.staging_service import StagingStorageManager, STAGING_DIR
from app.services.map_preview_service import MapPreviewAndReportService

logger = logging.getLogger(__name__)
router = APIRouter()

# Direktori hasil pemrosesan bersih (terpisah dari raw temporary staging)
PROCESSED_OUTPUT_DIR = Path("outputs").resolve()
PROCESSED_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Store status job in-memory
PIPELINE_JOBS: Dict[str, Dict[str, Any]] = {}


class PipelineRunRequest(BaseModel):
    upload_id: Optional[str] = Field(None, description="ID sesi tunggal folder staging")
    spatial_upload_id: Optional[str] = Field(None, description="ID sesi staging citra satelit (.jp2/.tif)")
    non_spatial_upload_id: Optional[str] = Field(None, description="ID sesi staging data tabular (.csv)")
    label_upload_id: Optional[str] = Field(None, description="ID sesi staging data vektor/label (.zip/.shp)")

    boundary_filename: Optional[str] = Field(None, description="Nama file .shp batas administrasi (opsional)")
    population_csv_filename: Optional[str] = Field(None, description="Nama file CSV penduduk (opsional)")
    rtrw_filename: Optional[str] = Field(None, description="Nama file .shp RTRW (opsional)")
    band_filenames: Optional[Dict[str, str]] = Field(None, description="Mapping nama file per band (opsional)")

    resample_b11: bool = Field(True, description="Resample Band 11 (20m) ke resolusi 10m (Bilinear)")
    compute_indices: List[str] = Field(["NDVI", "NDWI", "NDBI"], description="Indeks spektral yang dihitung")
    purge_staging_on_success: bool = Field(
        False,
        description="Default False: simpan file mentah sementara sampai user ACC di Tahap 3"
    )


class CommitJobRequest(BaseModel):
    purge_staging: bool = Field(True, description="Bersihkan berkas mentah sementara setelah ACC lanjut ke Tahap 3")


def _append_job_log(job_id: str, message: str, progress: Optional[int] = None) -> None:
    if job_id not in PIPELINE_JOBS:
        return
    now_str = datetime.now().strftime("%H:%M:%S")
    PIPELINE_JOBS[job_id].setdefault("logs", []).append({
        "time": now_str,
        "message": message,
    })
    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if progress is not None:
        update_fields["progress"] = progress
    PIPELINE_JOBS[job_id].update(update_fields)


def _execute_stage_2_and_3_task(job_id: str, req: PipelineRunRequest) -> None:
    """Worker latar belakang untuk menjalankan Tahap 2, Tahap 3, Validasi Raster, dan Render Preview Peta."""
    primary_id = req.spatial_upload_id or req.upload_id
    input_dir = (STAGING_DIR / primary_id).resolve()
    vector_dir = (STAGING_DIR / req.label_upload_id).resolve() if req.label_upload_id else input_dir
    tabular_dir = (STAGING_DIR / req.non_spatial_upload_id).resolve() if req.non_spatial_upload_id else input_dir

    output_dir = (PROCESSED_OUTPUT_DIR / job_id).resolve()
    preprocessed_dir = output_dir / "02_preprocessed"
    features_dir = output_dir / "03_features"
    previews_dir = output_dir / "previews"

    def log_cb(msg: str, pct: int) -> None:
        _append_job_log(job_id, msg, pct)

    try:
        PIPELINE_JOBS[job_id]["status"] = "running_stage_2_preprocessing"
        _append_job_log(job_id, "Memulai Tahap 2: Penyeragaman & pemotongan citra satelit...", 5)

        stage2_result = SpatialPreprocessingService.run_preprocessing(
            input_dir=input_dir,
            output_dir=preprocessed_dir,
            boundary_filename=req.boundary_filename,
            band_filenames=req.band_filenames,
            vector_dir=vector_dir,
            resample_b11=req.resample_b11,
            log_callback=log_cb,
        )

        PIPELINE_JOBS[job_id].update({
            "status": "running_stage_3_feature_embedding",
            "stage_2_result": stage2_result,
        })
        _append_job_log(job_id, "Memulai Tahap 3: Kalkulasi indeks spektral & rasterisasi peta pendukung...", 60)

        stage3_result = SpatialFeatureService.run_feature_extraction(
            input_dir=input_dir,
            preprocessed_dir=preprocessed_dir,
            output_dir=features_dir,
            boundary_filename=req.boundary_filename,
            population_csv_filename=req.population_csv_filename,
            rtrw_filename=req.rtrw_filename,
            vector_dir=vector_dir,
            tabular_dir=tabular_dir,
            requested_indices=req.compute_indices,
            log_callback=log_cb,
        )

        # Validasi semua raster output & render pratinjau PNG (SEBELUM menghapus raw staging batas)
        _append_job_log(job_id, "Memvalidasi metadata seluruh berkas GeoTIFF & merender pratinjau peta...", 92)
        boundary_shp_raw = stage2_result.get("boundary_shp_path")
        boundary_shp_path = Path(boundary_shp_raw) if boundary_shp_raw else None

        all_output_paths: List[Path] = []
        for p_str in stage2_result.get("output_files", {}).values():
            all_output_paths.append(Path(p_str))
        for p_str in stage3_result.get("output_files", {}).values():
            all_output_paths.append(Path(p_str))

        artifacts: Dict[str, Dict[str, Any]] = {}
        validations: List[Dict[str, Any]] = []

        for tif_path in all_output_paths:
            if not tif_path.exists():
                continue

            val_info = MapPreviewAndReportService.validate_raster_artifact(tif_path)
            validations.append(val_info)

            preview_png = previews_dir / f"{tif_path.stem}.png"
            rendered = MapPreviewAndReportService.render_raster_preview_png(
                raster_path=tif_path,
                preview_out_path=preview_png,
                boundary_path=boundary_shp_path,
            )

            fname = tif_path.name
            artifacts[fname] = {
                "filename": fname,
                "path": str(tif_path),
                "preview_path": str(rendered) if rendered else None,
                "preview_url": f"/api/v1/pipeline/jobs/{job_id}/preview/{fname}" if rendered else None,
                "download_url": f"/api/v1/pipeline/jobs/{job_id}/download/{fname}",
                "colormap": MapPreviewAndReportService.select_colormap(fname),
                "validation": val_info,
            }

        # Pembersihan otomatis raw staging files (dilakukan setelah preview boundary selesai dirender)
        purged_ids: List[str] = []
        if req.purge_staging_on_success:
            for sid in {req.upload_id, req.spatial_upload_id, req.non_spatial_upload_id, req.label_upload_id}:
                if sid and StagingStorageManager.cleanup_session(sid):
                    purged_ids.append(sid)
            if purged_ids:
                _append_job_log(job_id, "File mentah sementara di server telah dibersihkan otomatis.", 98)

        completed_at = datetime.now(timezone.utc).isoformat()
        _append_job_log(job_id, f"Selesai! {len(artifacts)} berkas peta bersih siap dilihat, diunduh, dan dilanjutkan.", 100)

        # Generate file laporan lengkap (.txt & .pdf)
        report_text = MapPreviewAndReportService.generate_text_report(
            job_id=job_id,
            validations=validations,
            logs=PIPELINE_JOBS[job_id].get("logs", []),
            created_at=PIPELINE_JOBS[job_id]["created_at"],
            completed_at=completed_at,
        )
        report_path = output_dir / f"Laporan_Preprocessing_{job_id[:8]}.txt"
        report_path.write_text(report_text, encoding="utf-8")

        report_pdf_path = output_dir / f"Laporan_Preprocessing_{job_id[:8]}.pdf"
        MapPreviewAndReportService.generate_pdf_report(
            pdf_out_path=report_pdf_path,
            job_id=job_id,
            artifacts=artifacts,
            created_at=PIPELINE_JOBS[job_id]["created_at"],
            completed_at=completed_at,
        )

        PIPELINE_JOBS[job_id].update({
            "status": "completed",
            "progress": 100,
            "raw_staging_purged": len(purged_ids) > 0,
            "purged_upload_ids": purged_ids,
            "output_dir": str(output_dir),
            "stage_2_result": stage2_result,
            "stage_3_result": stage3_result,
            "artifacts": artifacts,
            "report_url": f"/api/v1/pipeline/jobs/{job_id}/report",
            "report_path": str(report_path),
            "report_pdf_url": f"/api/v1/pipeline/jobs/{job_id}/report-pdf",
            "report_pdf_path": str(report_pdf_path),
            "updated_at": completed_at,
        })

    except HTTPException as http_exc:
        logger.warning("Pipeline job %s gagal (HTTP %s): %s", job_id, http_exc.status_code, http_exc.detail)
        _append_job_log(job_id, f"ERROR ({http_exc.status_code}): {http_exc.detail}")
        PIPELINE_JOBS[job_id].update({
            "status": "failed",
            "error_code": http_exc.status_code,
            "error_detail": http_exc.detail,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as exc:
        logger.exception("Pipeline job %s mengalami error tak terduga.", job_id)
        _append_job_log(job_id, f"ERROR: {str(exc)}")
        PIPELINE_JOBS[job_id].update({
            "status": "failed",
            "error_code": 500,
            "error_detail": f"Kesalahan pemrosesan spasial: {str(exc)}",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })


@router.post(
    "/run-preprocessing-features",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Jalankan Tahap 2 & Tahap 3 secara Asynchronous dengan Real-Time Logs"
)
def trigger_preprocessing_and_features(
    request: PipelineRunRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    primary_id = request.spatial_upload_id or request.upload_id
    if not primary_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Harap sertakan 'spatial_upload_id' atau 'upload_id' dari Tahap 1 Input Data."
        )

    input_dir = (STAGING_DIR / primary_id).resolve()
    if not input_dir.exists() or not input_dir.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Direktori staging '{primary_id}' tidak ditemukan atau sudah kedaluwarsa (>24 jam)."
        )

    job_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    staging_ids = list({
        sid for sid in [
            request.upload_id,
            request.spatial_upload_id,
            request.non_spatial_upload_id,
            request.label_upload_id,
        ] if sid
    })

    PIPELINE_JOBS[job_id] = {
        "job_id": job_id,
        "upload_id": primary_id,
        "staging_ids": staging_ids,
        "status": "queued",
        "progress": 0,
        "committed": False,
        "logs": [{"time": datetime.now().strftime("%H:%M:%S"), "message": "Permintaan diterima, menyiapkan antrean..."}],
        "artifacts": {},
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    background_tasks.add_task(_execute_stage_2_and_3_task, job_id, request)

    return {
        "status": "accepted",
        "message": "Pipeline Preprocessing & Feature Extraction telah dijadwalkan di latar belakang.",
        "job_id": job_id,
        "poll_url": f"/api/v1/pipeline/jobs/{job_id}",
    }


@router.get("/jobs/{job_id}", summary="Cek status, log real-time, pratinjau & metadata hasil")
def get_pipeline_job_status(job_id: str) -> Dict[str, Any]:
    job = PIPELINE_JOBS.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' tidak ditemukan."
        )
    return job


@router.get("/jobs/{job_id}/preview/{filename}", summary="Ambil gambar pratinjau PNG peta raster")
def get_artifact_preview_image(job_id: str, filename: str):
    job = PIPELINE_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan.")
    artifact = job.get("artifacts", {}).get(filename)
    if not artifact or not artifact.get("preview_path"):
        raise HTTPException(status_code=404, detail="Pratinjau gambar tidak ditemukan.")
    preview_file = Path(artifact["preview_path"])
    if not preview_file.exists():
        raise HTTPException(status_code=404, detail="Berkas pratinjau tidak tersedia.")
    return FileResponse(preview_file, media_type="image/png")


@router.get("/jobs/{job_id}/download/{filename}", summary="Unduh berkas GeoTIFF bersih hasil olahan")
def download_artifact_file(job_id: str, filename: str):
    job = PIPELINE_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan.")
    artifact = job.get("artifacts", {}).get(filename)
    if not artifact or not artifact.get("path"):
        raise HTTPException(status_code=404, detail="Berkas hasil tidak ditemukan.")
    target_file = Path(artifact["path"])
    if not target_file.exists():
        raise HTTPException(status_code=404, detail="Berkas fisik tidak ditemukan.")
    return FileResponse(target_file, media_type="image/tiff", filename=filename)


@router.get("/jobs/{job_id}/report", summary="Unduh Laporan Validasi Lengkap (.txt)")
def download_validation_report(job_id: str):
    job = PIPELINE_JOBS.get(job_id)
    if not job or not job.get("report_path"):
        raise HTTPException(status_code=404, detail="Laporan belum tersedia atau job belum selesai.")
    report_file = Path(job["report_path"])
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="Berkas laporan tidak ditemukan.")
    return FileResponse(
        report_file,
        media_type="text/plain; charset=utf-8",
        filename=report_file.name,
    )


@router.get("/jobs/{job_id}/report-pdf", summary="Unduh Laporan Hasil Preprocessing Lengkap (.pdf)")
def download_validation_report_pdf(job_id: str):
    job = PIPELINE_JOBS.get(job_id)
    if not job or job.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Laporan PDF belum tersedia atau proses belum selesai.")

    pdf_path_str = job.get("report_pdf_path")
    pdf_file = Path(pdf_path_str) if pdf_path_str else None

    if not pdf_file or not pdf_file.exists():
        # Fallback: generate on-demand jika belum terbuat
        output_dir = Path(job.get("output_dir", PROCESSED_OUTPUT_DIR / job_id))
        pdf_file = output_dir / f"Laporan_Preprocessing_{job_id[:8]}.pdf"
        MapPreviewAndReportService.generate_pdf_report(
            pdf_out_path=pdf_file,
            job_id=job_id,
            artifacts=job.get("artifacts", {}),
            created_at=job.get("created_at", "-"),
            completed_at=job.get("updated_at", "-"),
        )
        job["report_pdf_path"] = str(pdf_file)

    return FileResponse(
        pdf_file,
        media_type="application/pdf",
        filename=pdf_file.name,
    )


@router.post("/jobs/{job_id}/commit", summary="ACC hasil preprocessing & bersihkan temp storage")
def commit_preprocessing_job(job_id: str, body: CommitJobRequest) -> Dict[str, Any]:
    """
    Dipanggil hanya ketika hasil preprocessing dinyatakan sukses (ACC) dan pengguna
    menekan tombol Lanjut ke Tahap 3. Membersihkan berkas mentah sementara jika diaktifkan.
    """
    job = PIPELINE_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID tidak ditemukan.")
    if job.get("status") != "completed":
        raise HTTPException(
            status_code=422,
            detail="Job preprocessing belum selesai (status harus completed) untuk dapat di-commit."
        )

    purged_ids: List[str] = []
    if body.purge_staging:
        for sid in job.get("staging_ids", []):
            if sid and StagingStorageManager.cleanup_session(sid):
                purged_ids.append(sid)

    job.update({
        "committed": True,
        "committed_at": datetime.now(timezone.utc).isoformat(),
        "raw_staging_purged": job.get("raw_staging_purged", False) or len(purged_ids) > 0,
        "purged_upload_ids": list(set(job.get("purged_upload_ids", []) + purged_ids)),
    })

    return {
        "status": "committed",
        "message": "Hasil preprocessing telah di-ACC. File sementara dibersihkan.",
        "job_id": job_id,
        "purged_upload_ids": job["purged_upload_ids"],
    }
