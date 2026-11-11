import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  AI_API_BASE,
  triggerPreprocessingJob,
  fetchPipelineJobStatus,
  downloadJobReportPdf,
  commitPreprocessingJob,
  PipelineJobStatus,
  PipelineArtifact,
} from '@/services/api'
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
  Sliders,
  Trash2,
  FileCheck2,
  Sparkles,
  Scissors,
  Download,
  Map as MapIcon,
  Terminal,
  Maximize2,
  X,
} from 'lucide-react'

interface StagedRef {
  uploadId: string
  fileName: string
  metadata?: any
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Menunggu giliran pemrosesan...',
  running_stage_2_preprocessing: 'Langkah 1/2: Memotong citra & menyeragamkan ukuran piksel (10m)...',
  running_stage_3_feature_embedding: 'Langkah 2/2: Menghitung indeks kehijauan, air, bangunan & peta tata ruang...',
  completed: 'Selesai! Seluruh data sudah bersih dan siap dianalisis.',
  failed: 'Proses berhenti karena terjadi kendala.',
}

const INDEX_OPTIONS = [
  { id: 'NDVI', label: 'NDVI', hint: 'Tingkat Kehijauan & Vegetasi' },
  { id: 'NDWI', label: 'NDWI', hint: 'Badan Air & Kelembaban' },
  { id: 'NDBI', label: 'NDBI', hint: 'Bangunan & Permukiman' },
]

export const Preprocessing: React.FC = () => {
  const navigate = useNavigate()

  const [spatialRef, setSpatialRef] = useState<StagedRef | null>(null)
  const [nonSpatialRef, setNonSpatialRef] = useState<StagedRef | null>(null)
  const [labelRef, setLabelRef] = useState<StagedRef | null>(null)

  const [resampleB11, setResampleB11] = useState(true)
  const [selectedIndices, setSelectedIndices] = useState<string[]>(['NDVI', 'NDWI', 'NDBI'])
  const [purgeStaging, setPurgeStaging] = useState(true)

  const [isRunning, setIsRunning] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [jobStatus, setJobStatus] = useState<PipelineJobStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [zoomArtifact, setZoomArtifact] = useState<PipelineArtifact | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const loadRef = (key: string): StagedRef | null => {
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    }

    setSpatialRef(loadRef('staging_spatial'))
    setNonSpatialRef(loadRef('staging_nonSpatial'))
    setLabelRef(loadRef('staging_label'))

    const savedResult = sessionStorage.getItem('pipeline_stage_2_3_result')
    if (savedResult) {
      try {
        setJobStatus(JSON.parse(savedResult))
      } catch {}
    }

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  const toggleIndex = (idxName: string) => {
    setSelectedIndices((prev) =>
      prev.includes(idxName) ? prev.filter((item) => item !== idxName) : [...prev, idxName]
    )
  }

  const handleDownloadPdf = async () => {
    if (!jobStatus?.job_id) return
    setIsDownloadingPdf(true)
    try {
      await downloadJobReportPdf(jobStatus.job_id)
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunduh laporan PDF.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleRunPreprocessing = async () => {
    if (!spatialRef?.uploadId) {
      setErrorMessage('Data Citra Satelit belum diunggah. Silakan unggah terlebih dahulu di Tahap 1 Input Data.')
      return
    }

    setErrorMessage(null)
    setIsRunning(true)

    try {
      // File mentah sementara (staging) TIDAK dihapus selama proses berlangsung
      // agar pengguna dapat mengulang preprocessing atau mengubah data kapan saja
      const triggerRes = await triggerPreprocessingJob({
        spatial_upload_id: spatialRef.uploadId,
        non_spatial_upload_id: nonSpatialRef?.uploadId || null,
        label_upload_id: labelRef?.uploadId || null,
        resample_b11: resampleB11,
        compute_indices: selectedIndices,
        purge_staging_on_success: false,
      })

      const jobId = triggerRes.job_id

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const statusRes = await fetchPipelineJobStatus(jobId)
          setJobStatus(statusRes)

          if (statusRes.status === 'completed') {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
            setIsRunning(false)
            sessionStorage.setItem('pipeline_stage_2_3_result', JSON.stringify(statusRes))
          } else if (statusRes.status === 'failed') {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
            setIsRunning(false)
            setErrorMessage(
              statusRes.error_detail || 'Terjadi kendala saat memproses dan merapikan data.'
            )
          }
        } catch (pollErr: any) {
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
          setIsRunning(false)
          setErrorMessage(pollErr.message || 'Koneksi ke server pemrosesan terputus saat memantau progres.')
        }
      }, 800)
    } catch (err: any) {
      setIsRunning(false)
      setErrorMessage(err.message || 'Gagal menghubungi server pemrosesan data (Pastikan FastAPI berjalan).')
    }
  }

  /**
   * Reset state preprocessing frontend (log, preview, status) dan arahkan kembali ke Tahap 1.
   * Berkas di folder temporary/staging server TETAP AMAN TERSIMPAN (tidak dihapus).
   */
  const handleChangeOrReuploadData = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setIsRunning(false)
    setJobStatus(null)
    setErrorMessage(null)
    setZoomArtifact(null)
    sessionStorage.removeItem('pipeline_stage_2_3_result')

    // Arahkan kembali ke menu 1. Input Data dengan berkas staging tetap utuh
    navigate('/input-data')
  }

  /**
   * Dipanggil saat user ACC hasil preprocessing & lanjut ke Tahap 3.
   * Menyimpan hasil secara permanen ke database utama & membersihkan temp staging jika dicentang.
   */
  const handleContinueToStage3 = async () => {
    if (isCompleted && jobStatus?.job_id) {
      setIsCommitting(true)
      try {
        await commitPreprocessingJob(jobStatus.job_id, purgeStaging, {
          spatial_upload_id: spatialRef?.uploadId || null,
          non_spatial_upload_id: nonSpatialRef?.uploadId || null,
          label_upload_id: labelRef?.uploadId || null,
          crs: jobStatus.stage_2_result?.crs,
          bounds: jobStatus.stage_2_result?.boundary_bounds,
          clean_features: {
            stage_2_outputs: jobStatus.stage_2_result?.output_files || {},
            stage_3_outputs: jobStatus.stage_3_result?.output_files || {},
            artifacts: jobStatus.artifacts || {},
          },
        })

        if (purgeStaging) {
          sessionStorage.removeItem('staging_spatial')
          sessionStorage.removeItem('staging_nonSpatial')
          sessionStorage.removeItem('staging_label')
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal menyimpan status permanen ke database.')
        setIsCommitting(false)
        return
      } finally {
        setIsCommitting(false)
      }
    }

    navigate('/feature-embedding')
  }

  const isCompleted = jobStatus?.status === 'completed'
  const friendlyStatusText = jobStatus ? STATUS_LABELS[jobStatus.status] || jobStatus.status : ''
  const artifactList: PipelineArtifact[] = jobStatus?.artifacts
    ? Object.values(jobStatus.artifacts)
    : []

  return (
    <MainLayout title="2 Preprocessing">
      {/* Deskripsi ramah pengguna */}
      <div className="text-sm text-slate-600 mb-6 bg-[#f1f6fa] rounded-2xl p-4 border border-slate-200/70">
        <p className="leading-relaxed">
          Tahap ini bertugas <strong>merapikan dan menyeragamkan seluruh data</strong> sebelum dianalisis oleh AI:
          memotong citra satelit sesuai batas wilayah penelitian, menyamakan ukuran piksel menjadi 10 meter,
          menghitung skor kondisi lahan (vegetasi, air, bangunan), serta mengubah data penduduk &amp; tata ruang (RTRW) menjadi peta siap pakai.
        </p>
      </div>

      {/* Ringkasan Berkas dari Tahap 1 */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold text-[#152238] uppercase tracking-wider flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-[#009688]" />
            Data yang Siap Diproses (Dari Tahap 1)
          </h3>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
            Tersimpan Aman Sementara (24 Jam)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className={`p-3 rounded-xl border ${spatialRef ? 'bg-white border-emerald-200' : 'bg-amber-50/70 border-amber-200'}`}>
            <p className="text-[11px] font-bold text-slate-400">Citra Satelit (Wajib)</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">
              {spatialRef ? spatialRef.fileName : isCompleted ? 'Sudah selesai diproses' : 'Belum ada file diunggah'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${nonSpatialRef ? 'bg-white border-emerald-200' : 'bg-white border-slate-200'}`}>
            <p className="text-[11px] font-bold text-slate-400">Data Penduduk / Tabel (Opsional)</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">
              {nonSpatialRef ? nonSpatialRef.fileName : isCompleted ? 'Sudah diproses (bila tersedia)' : 'Tidak diunggah (dilewati)'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${labelRef ? 'bg-white border-emerald-200' : 'bg-white border-slate-200'}`}>
            <p className="text-[11px] font-bold text-slate-400">Peta Batas / Tata Ruang RTRW (Opsional)</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">
              {labelRef ? labelRef.fileName : isCompleted ? 'Sudah diproses (bila tersedia)' : 'Tidak diunggah (proses utuh)'}
            </p>
          </div>
        </div>
      </div>

      {/* 2x2 Kartu Pengaturan yang Mudah Dipahami */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#152238] flex items-center">
              <Sliders className="w-4 h-4 mr-2 text-[#009688]" />
              Penyeragaman Peta &amp; Ukuran Piksel
            </h3>
            <span className="bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
              Otomatis Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Menyamakan sistem koordinat peta agar seluruh lapisan sejajar sempurna dengan ukuran piksel seragam 10 × 10 meter.
          </p>
          <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={resampleB11}
              onChange={(e) => setResampleB11(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#009688] focus:ring-[#009688]"
            />
            <span>Samakan resolusi Band B11 (20 meter) menjadi 10 meter agar sejajar dengan Band B08</span>
          </label>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#152238] flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-[#009688]" />
              Indeks Kondisi Lahan (Otomatis)
            </h3>
            <span className="bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
              {selectedIndices.length} Dipilih
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Mengubah pantulan warna satelit menjadi indikator tutupan lahan (dihitung sesuai band yang Anda unggah):
          </p>
          <div className="space-y-2 text-xs text-slate-700">
            {INDEX_OPTIONS.map((idx) => (
              <label key={idx.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(idx.id)}
                  onChange={() => toggleIndex(idx.id)}
                  className="rounded border-slate-300 text-[#009688] focus:ring-[#009688]"
                />
                <span>
                  <strong className="font-semibold">{idx.label}</strong>{' '}
                  <span className="text-slate-400">— {idx.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#152238] flex items-center">
              <Scissors className="w-4 h-4 mr-2 text-[#009688]" />
              Pemotongan Wilayah Penelitian
            </h3>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2.5 py-0.5 rounded">
              {labelRef ? 'Potong Sesuai Batas' : 'Proses Area Penuh'}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {labelRef
              ? `Citra satelit akan dipotong rapi mengikuti bentuk wilayah pada '${labelRef.fileName}' agar hanya area penelitian yang dianalisis.`
              : 'Jika peta batas wilayah belum diunggah, seluruh cakupan citra satelit akan diproses secara utuh.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#152238] flex items-center">
              <Trash2 className="w-4 h-4 mr-2 text-[#009688]" />
              Pembersihan Ruang Penyimpanan Server
            </h3>
            <span className="bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
              Hemat Memori
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Berkas mentah tetap aman selama Anda meninjau hasil, dan hanya disimpan permanen/dibersihkan saat Anda menyetujui ke Tahap 3.
          </p>
          <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={purgeStaging}
              onChange={(e) => setPurgeStaging(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#009688] focus:ring-[#009688]"
            />
            <span>Hapus file mentah sementara setelah Anda menekan tombol Lanjut ke Tahap 3 (ACC)</span>
          </label>
        </div>
      </div>

      {/* Ringkasan, Log Real-Time, Pratinjau Peta, & Daftar File Hasil */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#152238] flex items-center">
            <FileCheck2 className="w-4 h-4 mr-2 text-[#009688]" />
            Status Proses, Log Langkah Demi Langkah &amp; Hasil Pengolahan
          </h3>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Proses Pembersihan &amp; Penyeragaman Data Gagal</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {(isRunning || (jobStatus && jobStatus.logs && jobStatus.logs.length > 0)) && (
          <div className="space-y-3">
            {isRunning && jobStatus && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{friendlyStatusText}</span>
                  <span>{jobStatus.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#009688] h-full transition-all duration-300"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Real-time Transparent Step Log */}
            {jobStatus?.logs && jobStatus.logs.length > 0 && (
              <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 border border-slate-800">
                <div className="flex items-center text-emerald-400 font-semibold mb-1.5 pb-1 border-b border-slate-800">
                  <Terminal className="w-3.5 h-3.5 mr-1.5" />
                  <span>Log Aktivitas Pemrosesan Spasial (Real-Time)</span>
                </div>
                {jobStatus.logs.map((entry, idx) => (
                  <div key={idx} className="flex space-x-2 leading-relaxed">
                    <span className="text-slate-500 flex-shrink-0">[{entry.time}]</span>
                    <span className={entry.message.startsWith('ERROR') ? 'text-red-400' : 'text-slate-200'}>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isCompleted && jobStatus && (
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Data Berhasil Dirapikan &amp; Siap Digunakan (100%)</p>
                <p className="text-[11px] mt-0.5">
                  Kode Proses: <code className="font-mono">{jobStatus.job_id}</code> • File mentah sementara:{' '}
                  <strong>
                    {jobStatus.raw_staging_purged
                      ? 'Sudah dibersihkan otomatis (hemat ruang)'
                      : 'Masih tersimpan sementara'}
                  </strong>
                </p>
              </div>
            </div>

            {/* 2. Pratinjau Visualisasi Peta (Map Preview Gallery) */}
            {artifactList.some((a) => a.preview_url) && (
              <div>
                <h4 className="text-xs font-bold text-[#152238] uppercase tracking-wider mb-3 flex items-center">
                  <MapIcon className="w-4 h-4 mr-1.5 text-[#009688]" />
                  Pratinjau Visualisasi Peta Raster &amp; Garis Batas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {artifactList
                    .filter((a) => a.preview_url)
                    .map((artifact) => (
                      <div
                        key={artifact.filename}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="relative bg-slate-100 aspect-[4/3] overflow-hidden">
                          <img
                            src={`${AI_API_BASE}${artifact.preview_url}`}
                            alt={`Pratinjau ${artifact.filename}`}
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setZoomArtifact(artifact)}
                            title="Perbesar peta"
                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 flex items-center justify-between text-xs border-t border-slate-100">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{artifact.filename}</p>
                            <p className="text-[11px] text-slate-400">
                              Skema Warna: <span className="font-mono">{artifact.colormap}</span>
                            </p>
                          </div>
                          <a
                            href={`${AI_API_BASE}${artifact.download_url}`}
                            download
                            title={`Unduh ${artifact.filename}`}
                            className="p-1.5 text-[#009688] hover:bg-[#009688]/10 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 3. Daftar File Bersih & Unduh Hasil (Artifacts Table) */}
            {artifactList.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-[#152238] uppercase tracking-wider mb-3">
                  Daftar Berkas Hasil Bersih &amp; Metadata Validasi Rasterio
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Nama Berkas</th>
                        <th className="py-2.5 px-3 font-bold">Dimensi (H × W)</th>
                        <th className="py-2.5 px-3 font-bold">Koordinat (CRS)</th>
                        <th className="py-2.5 px-3 font-bold">Min / Max Piksel</th>
                        <th className="py-2.5 px-3 font-bold">Ukuran</th>
                        <th className="py-2.5 px-3 font-bold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {artifactList.map((artifact) => {
                        const v = artifact.validation
                        return (
                          <tr key={artifact.filename} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                              {artifact.filename}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {v.shape[0]} × {v.shape[1]} px
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{v.crs}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {v.min.toFixed(2)} / {v.max.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{v.file_size_mb} MB</td>
                            <td className="py-2.5 px-3 text-right">
                              <a
                                href={`${AI_API_BASE}${artifact.download_url}`}
                                download
                                className="inline-flex items-center space-x-1 text-[#009688] hover:underline font-semibold"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh</span>
                              </a>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tombol Download Report PDF di bawah ringkasan hasil */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80">
              <p className="text-xs text-slate-500">
                Laporan PDF merangkum metadata validasi Rasterio seluruh file serta lampiran visualisasi peta.
              </p>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="inline-flex items-center space-x-2 bg-[#152238] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isDownloadingPdf ? 'Mengunduh PDF...' : 'Download Report PDF'}</span>
              </button>
            </div>
          </div>
        )}

        {!isRunning && !isCompleted && !errorMessage && (
          <p className="text-xs text-slate-500">
            {spatialRef
              ? `Data '${spatialRef.fileName}' sudah siap. Klik tombol hijau "Jalankan Preprocessing" di bawah untuk memulai.`
              : 'Belum dijalankan — silakan unggah minimal 1 citra satelit di menu "1 Input Data" terlebih dahulu.'}
          </p>
        )}
      </div>

      {/* Tombol Aksi Utama */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleChangeOrReuploadData}
            disabled={isRunning || isCommitting}
            className="flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Ubah / Unggah Ulang Data</span>
          </button>

          <button
            type="button"
            onClick={handleRunPreprocessing}
            disabled={isRunning || isCommitting || !spatialRef}
            className={`flex items-center space-x-2 text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all ${
              isRunning || isCommitting || !spatialRef
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#009688] hover:bg-[#00796b] text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sedang Merapikan Data...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>{isCompleted ? 'Jalankan Ulang Preprocessing' : 'Jalankan Preprocessing'}</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinueToStage3}
          disabled={isRunning || isCommitting}
          className={`flex items-center space-x-1.5 text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${
            isCompleted
              ? 'bg-[#152238] hover:bg-slate-800 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          } disabled:opacity-50`}
        >
          {isCommitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Permanen...</span>
            </>
          ) : (
            <>
              <span>Lanjut ke Tahap 3 (ACC &amp; Simpan)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Modal Zoom Pratinjau Peta */}
      {zoomArtifact && zoomArtifact.preview_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm"
          onClick={() => setZoomArtifact(null)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-[#152238]">{zoomArtifact.filename}</h4>
                <p className="text-xs text-slate-400">
                  Dimensi: {zoomArtifact.validation.shape[0]} × {zoomArtifact.validation.shape[1]} px • CRS: {zoomArtifact.validation.crs}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setZoomArtifact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={`${AI_API_BASE}${zoomArtifact.preview_url}`}
              alt={zoomArtifact.filename}
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </MainLayout>
  )
}
