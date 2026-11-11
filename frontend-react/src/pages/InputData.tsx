import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { FormatErrorModal, FormatErrorInfo } from '@/components/common/FormatErrorModal'
import {
  uploadToSpatialStaging,
  uploadBatchToSpatialStaging,
  purgeStagingSession,
  UploadStagingResponse
} from '@/services/api'
import {
  UploadCloud,
  FileCheck,
  Trash2,
  Loader2,
  Layers,
  FileSpreadsheet,
  MapPin,
  CheckCircle2,
  Info,
  Clock
} from 'lucide-react'

interface UploadSlotState {
  file: File | null
  uploadId: string | null
  fileName: string | null
  isUploading: boolean
  progress: number
  metadata: UploadStagingResponse['metadata'] | null
  error: string | null
}

const INITIAL_SLOT_STATE: UploadSlotState = {
  file: null,
  uploadId: null,
  fileName: null,
  isUploading: false,
  progress: 0,
  metadata: null,
  error: null,
}

const CATEGORY_SPECS = {
  spatial: {
    title: 'Data Spasial (Citra Satelit)',
    subtitle: 'Sentinel-2 • B02, B03, B04, B08, B11 (.jp2 / .tif)',
    allowedExtensions: ['.tif', '.tiff', '.jp2'],
    acceptAttr: '.tif,.tiff,.jp2',
    allowMultiple: true,
    icon: Layers,
    description: 'Format GeoTIFF atau JPEG 2000 (.jp2) asli Sentinel-2 untuk klasifikasi tutupan lahan.'
  },
  nonSpatial: {
    title: 'Data Non-Spasial Pendukung',
    subtitle: 'Populasi • Data tabular statistik wilayah (.csv)',
    allowedExtensions: ['.csv'],
    acceptAttr: '.csv',
    allowMultiple: false,
    icon: FileSpreadsheet,
    description: 'Data tabular atribut penduduk atau sosio-ekonomi berformat .csv.'
  },
  label: {
    title: 'Data Vektor / Label (Ground Truth)',
    subtitle: 'Shapefile terkompresi (.zip) atau komponen .shp/.dbf/.shx/.prj',
    allowedExtensions: ['.zip', '.shp', '.dbf', '.shx', '.prj'],
    acceptAttr: '.zip,.shp,.dbf,.shx,.prj',
    allowMultiple: true,
    icon: MapPin,
    description: 'Arsip ZIP berisi Shapefile atau unggah komponen .shp, .dbf, .shx, dan .prj secara bersamaan.'
  }
}

export const InputData: React.FC = () => {
  const navigate = useNavigate()

  // State untuk masing-masing slot berkas
  const [spatialSlot, setSpatialSlot] = useState<UploadSlotState>(INITIAL_SLOT_STATE)
  const [nonSpatialSlot, setNonSpatialSlot] = useState<UploadSlotState>(INITIAL_SLOT_STATE)
  const [labelSlot, setLabelSlot] = useState<UploadSlotState>(INITIAL_SLOT_STATE)

  // State untuk modal pop-up error format
  const [formatError, setFormatError] = useState<FormatErrorInfo | null>(null)
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

  // State drag-over untuk efek visual
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)

  // Otomatis pulihkan berkas staging aktif (Persistent 24 Jam) jika pengguna me-refresh halaman
  React.useEffect(() => {
    ;(['spatial', 'nonSpatial', 'label'] as const).forEach((cat) => {
      const saved = sessionStorage.getItem(`staging_${cat}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.uploadId) {
            setSlotState(cat, (prev) => ({
              ...prev,
              uploadId: parsed.uploadId,
              fileName: parsed.fileName,
              metadata: parsed.metadata,
              progress: 100,
            }))
          }
        } catch (e) {
          console.warn('Gagal mem-parse sesi staging:', e)
        }
      }
    })
  }, [])

  // Input file references
  const spatialInputRef = useRef<HTMLInputElement>(null)
  const nonSpatialInputRef = useRef<HTMLInputElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const getSlotState = (key: 'spatial' | 'nonSpatial' | 'label') => {
    if (key === 'spatial') return spatialSlot
    if (key === 'nonSpatial') return nonSpatialSlot
    return labelSlot
  }

  const setSlotState = (
    key: 'spatial' | 'nonSpatial' | 'label',
    updater: (prev: UploadSlotState) => UploadSlotState
  ) => {
    if (key === 'spatial') setSpatialSlot(updater)
    else if (key === 'nonSpatial') setNonSpatialSlot(updater)
    else setLabelSlot(updater)
  }

  /**
   * Logika Eliminasi Format yang Berbeda & Trigger Pop-up (Mendukung Single & Multi-File)
   */
  const resetInputRef = (categoryKey: 'spatial' | 'nonSpatial' | 'label') => {
    if (categoryKey === 'spatial' && spatialInputRef.current) spatialInputRef.current.value = ''
    if (categoryKey === 'nonSpatial' && nonSpatialInputRef.current) nonSpatialInputRef.current.value = ''
    if (categoryKey === 'label' && labelInputRef.current) labelInputRef.current.value = ''
  }

  const handleValidateAndUpload = async (
    fileList: FileList | File[],
    categoryKey: 'spatial' | 'nonSpatial' | 'label'
  ) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const spec = CATEGORY_SPECS[categoryKey]
    const receivedExts: string[] = []

    // 1. ELIMINASI: Validasi ekstensi seluruh berkas yang dipilih
    for (const file of files) {
      const fileName = file.name
      const extIndex = fileName.lastIndexOf('.')
      const ext = extIndex !== -1 ? fileName.substring(extIndex).toLowerCase() : ''

      if (!spec.allowedExtensions.includes(ext)) {
        setFormatError({
          fileName: fileName,
          fileExtension: ext || 'Tanpa ekstensi',
          expectedFormats: spec.allowedExtensions,
          categoryName: spec.title,
          customMessage: `Berkas '${fileName}' otomatis dieliminasi dari sistem karena format ${ext || 'tidak dikenal'} tidak dapat diproses oleh modul ${spec.title}.`
        })
        setIsErrorModalOpen(true)
        resetInputRef(categoryKey)
        return
      }
      receivedExts.push(ext)
    }

    // 2. Validasi khusus Kategori Vektor (label): .zip tunggal ATAU bundel lengkap .shp/.dbf/.shx/.prj
    if (categoryKey === 'label') {
      const hasZip = receivedExts.includes('.zip')
      if (hasZip && files.length > 1) {
        setFormatError({
          fileName: files.map((f) => f.name).join(', '),
          fileExtension: 'Campuran .zip + file lain',
          expectedFormats: ['.zip', '.shp + .dbf + .shx + .prj'],
          categoryName: spec.title,
          customMessage: 'Unggah 1 arsip .zip secara tunggal, atau unggah komponen .shp, .dbf, .shx, dan .prj secara bersamaan tanpa .zip.'
        })
        setIsErrorModalOpen(true)
        resetInputRef(categoryKey)
        return
      }

      if (!hasZip) {
        const requiredShp = ['.shp', '.dbf', '.shx', '.prj']
        const missing = requiredShp.filter((req) => !receivedExts.includes(req))
        if (missing.length > 0) {
          setFormatError({
            fileName: files.map((f) => f.name).join(', '),
            fileExtension: receivedExts.join(', '),
            expectedFormats: ['.zip', '.shp', '.dbf', '.shx', '.prj'],
            categoryName: spec.title,
            customMessage: `Komponen Shapefile tidak lengkap! Jika tidak memakai .zip, harap pilih bersamaan file: ${missing.join(', ')}.`
          })
          setIsErrorModalOpen(true)
          resetInputRef(categoryKey)
          return
        }
      }
    }

    const displayFileName =
      files.length === 1
        ? files[0].name
        : `${files.find((f) => f.name.toLowerCase().endsWith('.shp'))?.name || files[0].name} (+${files.length - 1} file)`

    // 3. Lolos validasi: Mulai streaming ke Staging Area
    setSlotState(categoryKey, (prev) => ({
      ...prev,
      file: files[0],
      fileName: displayFileName,
      isUploading: true,
      progress: 5,
      error: null
    }))

    try {
      const onProgress = (percent: number) => {
        setSlotState(categoryKey, (prev) => ({ ...prev, progress: percent }))
      }

      const res =
        files.length === 1
          ? await uploadToSpatialStaging(files[0], onProgress)
          : await uploadBatchToSpatialStaging(files, onProgress)

      setSlotState(categoryKey, (prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadId: res.upload_id,
        metadata: res.metadata,
        error: null
      }))

      sessionStorage.setItem(`staging_${categoryKey}`, JSON.stringify({
        uploadId: res.upload_id,
        fileName: displayFileName,
        metadata: res.metadata
      }))

    } catch (err: any) {
      const errorMsg = err.message || 'Gagal mengunggah berkas ke staging area.'
      setFormatError({
        fileName: displayFileName,
        fileExtension: receivedExts.join(', '),
        expectedFormats: spec.allowedExtensions,
        categoryName: spec.title,
        customMessage: errorMsg
      })
      setIsErrorModalOpen(true)

      setSlotState(categoryKey, () => ({
        ...INITIAL_SLOT_STATE,
        error: errorMsg
      }))
      resetInputRef(categoryKey)
    }
  }

  /**
   * Menghapus berkas dan memanggil pembersihan (Auto-Cleanup) di server
   */
  const handleRemoveFile = async (categoryKey: 'spatial' | 'nonSpatial' | 'label') => {
    const slot = getSlotState(categoryKey)
    if (slot.uploadId) {
      await purgeStagingSession(slot.uploadId)
      sessionStorage.removeItem(`staging_${categoryKey}`)
    }

    setSlotState(categoryKey, () => INITIAL_SLOT_STATE)

    if (categoryKey === 'spatial' && spatialInputRef.current) spatialInputRef.current.value = ''
    if (categoryKey === 'nonSpatial' && nonSpatialInputRef.current) nonSpatialInputRef.current.value = ''
    if (categoryKey === 'label' && labelInputRef.current) labelInputRef.current.value = ''
  }

  // Handler Drag and Drop
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    categoryKey: 'spatial' | 'nonSpatial' | 'label'
  ) => {
    e.preventDefault()
    setDragOverCategory(null)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleValidateAndUpload(e.dataTransfer.files, categoryKey)
    }
  }

  const isAllReady = Boolean(spatialSlot.uploadId && nonSpatialSlot.uploadId && labelSlot.uploadId)

  return (
    <MainLayout title="1 Input Data">
      {/* Top summary paragraph */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-slate-500">
            Unggah dan validasi sumber data spasial dan non-spasial ke Temporary Staging Area.
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            <Info className="w-3.5 h-3.5 mr-1 text-[#009688]" />
            Sistem otomatis menolak dan mengeliminasi format berkas yang tidak sesuai standar pengolahan citra.
          </p>
        </div>
      </div>

      {/* Upload Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {(['spatial', 'nonSpatial', 'label'] as const).map((categoryKey) => {
          const spec = CATEGORY_SPECS[categoryKey]
          const slot = getSlotState(categoryKey)
          const Icon = spec.icon
          const isDragging = dragOverCategory === categoryKey

          return (
            <div
              key={categoryKey}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-[#009688]/10 text-[#009688] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#152238] leading-tight">
                      {spec.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3 pl-0.5">
                  {spec.subtitle}
                </p>

                {/* Dropzone Container */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverCategory(categoryKey)
                  }}
                  onDragLeave={() => setDragOverCategory(null)}
                  onDrop={(e) => handleDrop(e, categoryKey)}
                  className={`relative rounded-2xl p-4 text-center transition-all border-2 border-dashed ${
                    isDragging
                      ? 'border-[#009688] bg-[#009688]/5 scale-[0.99]'
                      : slot.uploadId
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-[#009688]/50 bg-[#f8fafc]'
                  }`}
                >
                  {/* Hidden Native File Input */}
                  <input
                    ref={
                      categoryKey === 'spatial'
                        ? spatialInputRef
                        : categoryKey === 'nonSpatial'
                        ? nonSpatialInputRef
                        : labelInputRef
                    }
                    type="file"
                    accept={spec.acceptAttr}
                    multiple={spec.allowMultiple}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleValidateAndUpload(e.target.files, categoryKey)
                      }
                    }}
                    className="hidden"
                  />

                  {slot.isUploading ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-7 h-7 text-[#009688] animate-spin" />
                      <p className="text-xs font-semibold text-slate-700">
                        Memverifikasi & Streaming ({slot.progress}%)...
                      </p>
                      <div className="w-36 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#009688] h-full transition-all duration-200"
                          style={{ width: `${slot.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : slot.uploadId ? (
                    <div className="py-2 text-left space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {slot.fileName}
                            </p>
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                              <Clock className="w-3 h-3 mr-1" />
                              Staging Aktif (TTL 24 Jam)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(categoryKey)}
                          title="Hapus dan bersihkan dari staging"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Metadata Highlights */}
                      {slot.metadata && (
                        <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                          {slot.metadata.crs && (
                            <p className="truncate">
                              <span className="font-semibold text-slate-800">CRS:</span> {slot.metadata.crs}
                            </p>
                          )}
                          {slot.metadata.width_px && (
                            <p>
                              <span className="font-semibold text-slate-800">Dimensi:</span> {slot.metadata.width_px} × {slot.metadata.height_px} px ({slot.metadata.band_count} Band)
                            </p>
                          )}
                          {slot.metadata.file_size_mb && (
                            <p>
                              <span className="font-semibold text-slate-800">Ukuran:</span> {slot.metadata.file_size_mb} MB
                            </p>
                          )}
                          {slot.metadata.total_features !== undefined && (
                            <p>
                              <span className="font-semibold text-slate-800">Total Fitur:</span> {slot.metadata.total_features} Poligon
                            </p>
                          )}
                          {slot.metadata.total_records !== undefined && (
                            <p>
                              <span className="font-semibold text-slate-800">Total Rekord:</span> {slot.metadata.total_records} Baris
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <UploadCloud className="w-5 h-5 text-[#009688]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Tarik file ke sini, atau{' '}
                          <button
                            type="button"
                            onClick={() => {
                              if (categoryKey === 'spatial') spatialInputRef.current?.click()
                              else if (categoryKey === 'nonSpatial') nonSpatialInputRef.current?.click()
                              else labelInputRef.current?.click()
                            }}
                            className="text-[#009688] hover:underline font-bold"
                          >
                            telusuri
                          </button>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Hanya menerima: {spec.allowedExtensions.join(', ')} (Maks 2GB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {slot.uploadId ? 'Siap diproses' : 'Belum ada berkas'}
                </span>
                {!slot.uploadId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (categoryKey === 'spatial') spatialInputRef.current?.click()
                      else if (categoryKey === 'nonSpatial') nonSpatialInputRef.current?.click()
                      else labelInputRef.current?.click()
                    }}
                    className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                  >
                    Pilih File
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Ringkasan Tahap */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 mb-6">
        <h3 className="text-sm font-bold text-[#152238] flex items-center">
          <FileCheck className="w-4 h-4 mr-2 text-[#009688]" />
          Ringkasan Tahap & Status Staging
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Parameter, status verifikasi berkas sementara (staging), dan metadata sebelum masuk ke tahap Preprocessing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Citra Satelit</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {spatialSlot.fileName || 'Belum diunggah'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Non-Spasial</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {nonSpatialSlot.fileName || 'Belum diunggah'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Label</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {labelSlot.fileName || 'Belum diunggah'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Status Kesiapan Pipeline:</span>
          {isAllReady ? (
            <span className="text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Semua Dataset Lengkap & Terverifikasi
            </span>
          ) : (
            <span className="text-amber-700 font-semibold bg-amber-100 px-3 py-1 rounded-full">
              Menunggu unggahan berkas yang valid
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => navigate('/preprocessing')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
        >
          <span>Lanjut ke Preprocessing</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* Modal Pop-up Error Format yang Mengeliminasi Berkas */}
      <FormatErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        errorInfo={formatError}
      />
    </MainLayout>
  )
}
