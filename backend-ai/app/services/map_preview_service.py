import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class MapPreviewAndReportService:
    """
    Layanan headless untuk:
    1. Validasi seluruh raster hasil olahan via Rasterio (Shape, CRS, Transform, Min/Max, NoData).
    2. Rendering pratinjau PNG peta raster (colormap RdYlGn, Blues, OrRd, viridis, tab20, gray)
       beserta overlay garis batas wilayah.
    3. Pembuatan laporan teks (.txt) terstruktur untuk diunduh pengguna.
    """

    @staticmethod
    def select_colormap(filename: str) -> str:
        upper = filename.upper()
        if "NDVI" in upper:
            return "RdYlGn"
        if "NDWI" in upper:
            return "Blues"
        if "NDBI" in upper:
            return "OrRd"
        if "RTRW" in upper:
            return "tab20"
        if "POPULATION" in upper:
            return "viridis"
        return "gray"

    @staticmethod
    def validate_raster_artifact(raster_path: Path) -> Dict[str, Any]:
        """Membaca metadata validasi lengkap dari berkas GeoTIFF hasil olahan."""
        import numpy as np
        import rasterio

        with rasterio.open(raster_path) as src:
            img = src.read(1).astype(np.float32)
            nodata_val = src.nodata

            nodata_mask = np.zeros(img.shape, dtype=bool)
            if nodata_val is not None:
                nodata_mask = img == nodata_val
            nodata_mask = nodata_mask | ~np.isfinite(img)

            valid = img[~nodata_mask]
            t = src.transform

            return {
                "filename": raster_path.name,
                "path": str(raster_path),
                "shape": [int(src.height), int(src.width)],
                "crs": str(src.crs) if src.crs else "Tidak terdefinisi",
                "dtype": str(src.dtypes[0]),
                "transform": [float(t.a), float(t.b), float(t.c), float(t.d), float(t.e), float(t.f)],
                "bounds": [float(src.bounds.left), float(src.bounds.bottom), float(src.bounds.right), float(src.bounds.top)],
                "nodata": float(nodata_val) if nodata_val is not None else None,
                "nodata_pixels": int(np.sum(nodata_mask)),
                "valid_pixels": int(valid.size),
                "min": float(np.min(valid)) if valid.size > 0 else 0.0,
                "max": float(np.max(valid)) if valid.size > 0 else 0.0,
                "mean": float(np.mean(valid)) if valid.size > 0 else 0.0,
                "std": float(np.std(valid)) if valid.size > 0 else 0.0,
                "file_size_mb": round(raster_path.stat().st_size / (1024 * 1024), 3),
            }

    @classmethod
    def render_raster_preview_png(
        cls,
        raster_path: Path,
        preview_out_path: Path,
        boundary_path: Optional[Path] = None,
        max_dim: int = 800,
    ) -> Optional[Path]:
        """
        Merender pratinjau peta raster menjadi PNG secara headless menggunakan Matplotlib (Agg).
        Menggunakan downsampling aman untuk preview cepat tanpa membebani RAM.
        """
        try:
            import os
            mpl_cache = Path("outputs/.mplcache").resolve()
            mpl_cache.mkdir(parents=True, exist_ok=True)
            os.environ.setdefault("MPLCONFIGDIR", str(mpl_cache))

            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            import numpy as np
            import rasterio
            import geopandas as gpd
        except ImportError as exc:
            logger.warning("Matplotlib/Rasterio tidak tersedia untuk render preview: %s", exc)
            return None

        try:
            with rasterio.open(raster_path) as src:
                scale = max(src.height / max_dim, src.width / max_dim, 1.0)
                out_h = max(1, int(src.height / scale))
                out_w = max(1, int(src.width / scale))

                img = src.read(1, out_shape=(out_h, out_w)).astype(np.float32)
                if src.nodata is not None:
                    img[img == src.nodata] = np.nan
                img[~np.isfinite(img)] = np.nan

                bounds = src.bounds
                extent = [bounds.left, bounds.right, bounds.bottom, bounds.top]
                crs = src.crs

            cmap = cls.select_colormap(raster_path.name)

            fig, ax = plt.subplots(figsize=(6.5, 5.5), dpi=130)
            fig.patch.set_facecolor("white")

            valid_vals = img[np.isfinite(img)]
            vmin, vmax = None, None
            if cmap == "gray" and valid_vals.size > 0:
                # Contrast stretch 2%-98% agar band Sentinel-2 terlihat tajam
                vmin = float(np.percentile(valid_vals, 2))
                vmax = float(np.percentile(valid_vals, 98))
            elif "NDVI" in raster_path.name.upper():
                vmin, vmax = -0.2, 0.9
            elif "NDWI" in raster_path.name.upper():
                vmin, vmax = -0.8, 0.6
            elif "NDBI" in raster_path.name.upper():
                vmin, vmax = -0.6, 0.6

            im = ax.imshow(
                img,
                cmap=cmap,
                extent=extent,
                origin="upper",
                vmin=vmin,
                vmax=vmax,
            )

            # Gambar garis batas wilayah jika tersedia dan CRS kompatibel
            if boundary_path and boundary_path.exists() and crs is not None:
                try:
                    gdf = gpd.read_file(boundary_path)
                    if gdf.crs is not None:
                        gdf = gdf.to_crs(crs)
                    gdf.boundary.plot(ax=ax, edgecolor="#ef4444", linewidth=0.9)
                except Exception as b_err:
                    logger.debug("Overlay batas dilewati untuk %s: %s", raster_path.name, b_err)

            ax.set_title(raster_path.name, fontsize=11, fontweight="bold", color="#152238", pad=10)
            ax.axis("off")

            cbar = fig.colorbar(im, ax=ax, fraction=0.042, pad=0.03)
            cbar.ax.tick_params(labelsize=8)

            preview_out_path.parent.mkdir(parents=True, exist_ok=True)
            plt.tight_layout()
            fig.savefig(preview_out_path, bbox_inches="tight", dpi=130)
            plt.close(fig)

            return preview_out_path
        except Exception as exc:
            logger.exception("Gagal merender pratinjau PNG untuk %s", raster_path.name)
            return None

    @staticmethod
    def generate_text_report(
        job_id: str,
        validations: List[Dict[str, Any]],
        logs: List[Dict[str, str]],
        created_at: str,
        completed_at: str,
    ) -> str:
        """Menghasilkan laporan lengkap hasil validasi Rasterio (.txt)."""
        lines: List[str] = [
            "========================================================================",
            "  LAPORAN VALIDASI PENGOLAHAN DATA SPASIAL (TAHAP 2 PREPROCESSING)",
            "  Sistem Klasifikasi dan Prediksi Luas Lahan Berbasis Data Spasial",
            "========================================================================",
            f"ID Proses (Job ID) : {job_id}",
            f"Waktu Mulai        : {created_at}",
            f"Waktu Selesai      : {completed_at}",
            f"Total File Output  : {len(validations)} berkas GeoTIFF tervalidasi",
            "",
            "------------------------------------------------------------------------",
            "  1. RINGKASAN VALIDASI METADATA RASTER (RASTERIO)",
            "------------------------------------------------------------------------",
        ]

        for item in validations:
            t = item.get("transform", [])
            t_str = f"[{t[0]:.4f}, {t[1]:.4f}, {t[2]:.2f}, {t[3]:.4f}, {t[4]:.4f}, {t[5]:.2f}]" if len(t) == 6 else str(t)
            lines.extend([
                "=" * 60,
                f"Nama File      : {item['filename']} ({item['file_size_mb']} MB)",
                f"Shape (H x W)  : {item['shape'][0]} x {item['shape'][1]} piksel",
                f"CRS            : {item['crs']}",
                f"Tipe Data      : {item['dtype']}",
                f"Transform      : {t_str}",
                f"Min Piksel     : {item['min']:.6f}",
                f"Max Piksel     : {item['max']:.6f}",
                f"Mean / Std     : {item['mean']:.6f} / {item['std']:.6f}",
                f"Nilai NoData   : {item['nodata']}",
                f"Jumlah NoData  : {item['nodata_pixels']} piksel (Valid: {item['valid_pixels']} piksel)",
            ])

        lines.extend([
            "",
            "------------------------------------------------------------------------",
            "  2. LOG EKSEKUSI LANGKAH DEMI LANGKAH",
            "------------------------------------------------------------------------",
        ])
        for entry in logs:
            lines.append(f"[{entry.get('time', '-')}] {entry.get('message', '')}")

        lines.append("========================================================================")
        return "\n".join(lines) + "\n"

    @staticmethod
    def generate_pdf_report(
        pdf_out_path: Path,
        job_id: str,
        artifacts: Dict[str, Dict[str, Any]],
        created_at: str,
        completed_at: str,
    ) -> Path:
        """
        Menghasilkan laporan PDF ringkas & elegan menggunakan ReportLab berisi:
        1. Header & Metadata proses (Judul, Timestamp, Job ID).
        2. Tabel Ringkasan Validasi Raster (Shape, CRS, Min/Max, Status NoData).
        3. Lampiran Visualisasi Peta Raster dari Matplotlib.
        """
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
            Image as RLImage,
        )

        pdf_out_path.parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(
            str(pdf_out_path),
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title=f"Laporan Preprocessing {job_id[:8]}",
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#152238"),
            spaceAfter=3,
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontSize=9.5,
            textColor=colors.HexColor("#475569"),
            spaceAfter=10,
        )
        section_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#00796b"),
            spaceBefore=10,
            spaceAfter=6,
        )
        cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1e293b"),
        )
        caption_style = ParagraphStyle(
            "ImgCaption",
            parent=styles["Normal"],
            fontSize=8,
            alignment=1,  # CENTER
            textColor=colors.HexColor("#334155"),
        )

        elements: List[Any] = []

        # 1. Header / Metadata
        elements.append(Paragraph("LAPORAN HASIL PREPROCESSING DATA SPASIAL", title_style))
        elements.append(Paragraph("Sistem Klasifikasi dan Prediksi Luas Lahan Berbasis Data Spasial", subtitle_style))

        meta_rows = [
            ["ID Proses (Job ID)", job_id],
            ["Waktu Mulai", created_at],
            ["Waktu Selesai", completed_at],
            ["Total File Valid", f"{len(artifacts)} berkas GeoTIFF bersih"],
        ]
        meta_table = Table(meta_rows, colWidths=[42 * mm, 136 * mm])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#152238")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 6 * mm))

        # 2. Tabel Ringkasan Hasil Raster
        elements.append(Paragraph("1. Ringkasan Validasi Metadata Raster (Rasterio)", section_style))

        table_data: List[Any] = [[
            "Nama File",
            "Dimensi (H x W)",
            "CRS",
            "Min / Max Piksel",
            "Status NoData",
        ]]

        for fname, art in artifacts.items():
            v = art.get("validation", {})
            shape = v.get("shape", [0, 0])
            nodata_val = v.get("nodata")
            nodata_px = v.get("nodata_pixels", 0)
            valid_px = v.get("valid_pixels", 0)
            nodata_text = f"Val: {nodata_val}\n({nodata_px:,} px)" if nodata_val is not None else f"None ({valid_px:,} valid)"

            table_data.append([
                Paragraph(fname, cell_style),
                f"{shape[0]} x {shape[1]}",
                Paragraph(str(v.get("crs", "-")), cell_style),
                f"{v.get('min', 0.0):.2f} / {v.get('max', 0.0):.2f}",
                Paragraph(nodata_text, cell_style),
            ])

        raster_table = Table(table_data, colWidths=[44 * mm, 28 * mm, 32 * mm, 32 * mm, 42 * mm], repeatRows=1)
        raster_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#152238")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(raster_table)

        # 3. Lampiran Visualisasi Peta Raster (Matplotlib PNGs)
        priority_order = ["NDVI.tif", "NDWI.tif", "NDBI.tif", "RTRW.tif", "PopulationDensity.tif", "B02_clip_geotiff.tif", "B04_clip_geotiff.tif", "B08_clip_geotiff.tif"]
        ordered_keys = [k for k in priority_order if k in artifacts] + [k for k in artifacts if k not in priority_order]
        preview_items = [
            artifacts[k] for k in ordered_keys
            if artifacts[k].get("preview_path") and Path(artifacts[k]["preview_path"]).exists()
        ]

        if preview_items:
            elements.append(Spacer(1, 6 * mm))
            elements.append(Paragraph("2. Lampiran Visualisasi Peta Raster &amp; Batas Wilayah", section_style))

            # Susun 2 gambar per baris
            grid_rows: List[Any] = []
            current_row: List[Any] = []
            for item in preview_items[:8]:  # Maks 8 peta utama agar PDF tetap ringkas
                img_flowable = RLImage(str(item["preview_path"]), width=82 * mm, height=64 * mm, kind="proportional")
                cell_content = [
                    img_flowable,
                    Spacer(1, 1.5 * mm),
                    Paragraph(f"<b>{item['filename']}</b> ({item.get('colormap', 'gray')})", caption_style),
                ]
                current_row.append(cell_content)
                if len(current_row) == 2:
                    grid_rows.append(current_row)
                    current_row = []

            if current_row:
                current_row.append("")
                grid_rows.append(current_row)

            img_table = Table(grid_rows, colWidths=[88 * mm, 88 * mm])
            img_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]))
            elements.append(img_table)

        doc.build(elements)
        return pdf_out_path
