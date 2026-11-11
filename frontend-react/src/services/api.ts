/**
 * Layanan API Client untuk komunikasi dengan Backend Laravel & Backend AI FastAPI
 */

export const LARAVEL_API_BASE = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000'
export const AI_API_BASE = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001'

export interface UploadStagingResponse {
  status: string
  message: string
  upload_id: string
  filename?: string
  filenames?: string[]
  file_size_bytes?: number
  file_type?: string
  metadata: {
    type?: string
    width_px?: number
    height_px?: number
    band_count?: number
    crs?: string
    resolution_x?: number
    resolution_y?: number
    file_size_mb?: number
    file_size_kb?: number
    total_records?: number
    total_features?: number
    geometry_type?: string
    columns?: string[]
    attribute_columns?: string[]
    [key: string]: any
  }
}

export interface ActiveStagingItem {
  id: number
  upload_id: string
  category: 'spatial' | 'nonSpatial' | 'label'
  original_name: string
  file_size_mb: number
  file_type: string
  metadata: any
  status: string
  created_at: string
  expires_at: string
  remaining_hours: number
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('geo_auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function _sendStagingXhr(
  endpointPath: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadStagingResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response)
        } else {
          const errorMessage =
            response.detail ||
            response.message ||
            `Gagal mengunggah berkas (Status: ${xhr.status})`
          reject(new Error(errorMessage))
        }
      } catch {
        reject(new Error(`Respon server tidak valid (Status: ${xhr.status})`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Koneksi ke Spatial AI Staging Server gagal atau terputus.'))
    }

    xhr.open('POST', `${AI_API_BASE}${endpointPath}`)
    xhr.send(formData)
  })
}

/**
 * Mengunggah satu berkas spasial/tabular langsung ke Staging Area FastAPI (Port 8001)
 */
export async function uploadToSpatialStaging(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadStagingResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return _sendStagingXhr('/api/v1/spatial/upload-staging', formData, onProgress)
}

/**
 * Mengunggah beberapa berkas sekaligus (misal komponen .shp, .dbf, .shx, .prj)
 * ke dalam satu sesi staging di FastAPI
 */
export async function uploadBatchToSpatialStaging(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadStagingResponse> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  return _sendStagingXhr('/api/v1/spatial/upload-staging-batch', formData, onProgress)
}

/**
 * Mengambil daftar berkas staging yang masih aktif (dalam batas TTL 24 jam)
 */
export async function fetchActiveStagingFiles(): Promise<ActiveStagingItem[]> {
  try {
    const res = await fetch(`${LARAVEL_API_BASE}/api/spatial/staging-active`, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeader(),
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.active_staging_files || []
  } catch (err) {
    console.warn('Gagal memuat sesi staging aktif dari server:', err)
    return []
  }
}

/**
 * Menghapus instan berkas di area staging
 */
export async function purgeStagingSession(uploadId: string): Promise<boolean> {
  try {
    const res = await fetch(`${AI_API_BASE}/api/v1/spatial/staging/${uploadId}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (err) {
    console.error('Error purging staging session:', err)
    return false
  }
}

export interface PipelineJobPayload {
  spatial_upload_id: string
  non_spatial_upload_id?: string | null
  label_upload_id?: string | null
  resample_b11: boolean
  compute_indices: string[]
  purge_staging_on_success: boolean
}

export interface PipelineLogEntry {
  time: string
  message: string
}

export interface PipelineArtifact {
  filename: string
  path: string
  preview_path?: string | null
  preview_url?: string | null
  download_url: string
  colormap: string
  validation: {
    filename: string
    shape: [number, number]
    crs: string
    dtype: string
    transform: number[]
    nodata: number | null
    nodata_pixels: number
    valid_pixels: number
    min: number
    max: number
    mean: number
    std: number
    file_size_mb: number
  }
}

export interface PipelineJobStatus {
  job_id: string
  upload_id: string
  status:
    | 'queued'
    | 'running_stage_2_preprocessing'
    | 'running_stage_3_feature_embedding'
    | 'completed'
    | 'failed'
  progress: number
  logs?: PipelineLogEntry[]
  artifacts?: Record<string, PipelineArtifact>
  report_url?: string
  report_pdf_url?: string
  error_code?: number
  error_detail?: string
  raw_staging_purged?: boolean
  output_dir?: string
  stage_2_result?: any
  stage_3_result?: any
  created_at: string
  updated_at: string
}

/**
 * Memicu pipeline Tahap 2 & 3 secara asinkron di FastAPI (BackgroundTasks)
 */
export async function triggerPreprocessingJob(
  payload: PipelineJobPayload
): Promise<{ status: string; message: string; job_id: string; poll_url: string }> {
  const res = await fetch(`${AI_API_BASE}/api/v1/pipeline/run-preprocessing-features`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || data.message || 'Gagal menjadwalkan pipeline preprocessing.')
  }
  return data
}

/**
 * Memantau progres & mengambil hasil eksekusi pipeline berdasarkan job_id
 */
export async function fetchPipelineJobStatus(jobId: string): Promise<PipelineJobStatus> {
  const res = await fetch(`${AI_API_BASE}/api/v1/pipeline/jobs/${jobId}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Gagal mengambil status job preprocessing.')
  }
  return data
}

/**
 * Mengunduh laporan hasil preprocessing dalam format PDF (.pdf)
 */
export async function downloadJobReportPdf(jobId: string): Promise<void> {
  const res = await fetch(`${AI_API_BASE}/api/v1/pipeline/jobs/${jobId}/report-pdf`, {
    method: 'GET',
  })

  if (!res.ok) {
    let errDetail = 'Gagal mengunduh laporan PDF.'
    try {
      const errJson = await res.json()
      errDetail = errJson.detail || errDetail
    } catch {}
    throw new Error(errDetail)
  }

  const blob = await res.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = `Laporan_Preprocessing_${jobId.slice(0, 8)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

/**
 * Commit permanen setelah hasil Preprocessing dinyatakan ACC oleh user
 * dan user menekan tombol Lanjut ke Tahap 3.
 */
export async function commitPreprocessingJob(
  jobId: string,
  purgeStaging: boolean,
  metadataPayload?: {
    spatial_upload_id?: string | null
    non_spatial_upload_id?: string | null
    label_upload_id?: string | null
    crs?: string
    bounds?: number[] | null
    clean_features?: any
  }
): Promise<{ status: string; purged_upload_ids: string[] }> {
  // 1. Commit di FastAPI & bersihkan temp staging (jika purgeStaging = true)
  const aiRes = await fetch(`${AI_API_BASE}/api/v1/pipeline/jobs/${jobId}/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ purge_staging: purgeStaging }),
  })

  if (!aiRes.ok) {
    const err = await aiRes.json().catch(() => ({}))
    throw new Error(err.detail || 'Gagal melakukan commit preprocessing di server AI.')
  }

  const aiResult = await aiRes.json()

  // 2. Jika user memiliki token Sanctum Laravel, simpan permanen ke MySQL preprocessed_datasets
  const authHeaders = getAuthHeader()
  if (authHeaders.Authorization && metadataPayload) {
    try {
      await fetch(`${LARAVEL_API_BASE}/api/spatial/commit-preprocessed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          job_id: jobId,
          spatial_upload_id: metadataPayload.spatial_upload_id,
          non_spatial_upload_id: metadataPayload.non_spatial_upload_id,
          label_upload_id: metadataPayload.label_upload_id,
          crs: metadataPayload.crs,
          bounds: metadataPayload.bounds,
          clean_features: metadataPayload.clean_features || {},
        }),
      })
    } catch (e) {
      console.warn('Gagal menyinkronkan commit permanen ke Laravel DB:', e)
    }
  }

  return aiResult
}

/**
 * Eksekusi transisi Preprocessing via Laravel Gateway:
 * Memproses data di FastAPI, menghapus berkas mentah temp, dan menyimpan hasil ke DB Utama.
 */
export async function executePreprocessingPipeline(spatialUploadId: string): Promise<any> {
  const res = await fetch(`${LARAVEL_API_BASE}/api/spatial/preprocess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      spatial_upload_id: spatialUploadId,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal mengeksekusi pipeline preprocessing.')
  }

  return await res.json()
}
