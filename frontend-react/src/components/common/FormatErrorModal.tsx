import React from 'react'
import { AlertTriangle, X, FileX, CheckCircle } from 'lucide-react'

export interface FormatErrorInfo {
  fileName: string
  fileExtension: string
  expectedFormats: string[]
  categoryName: string
  customMessage?: string
}

interface FormatErrorModalProps {
  isOpen: boolean
  onClose: () => void
  errorInfo: FormatErrorInfo | null
}

export const FormatErrorModal: React.FC<FormatErrorModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
}) => {
  if (!isOpen || !errorInfo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon / Warning Badge */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-950">
                Format Berkas Tidak Didukung!
              </h3>
              <p className="text-xs text-red-600">
                Berkas otomatis dieliminasi dari sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-all"
            aria-label="Tutup popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Sistem pengolahan spasial dan AI menolak berkas untuk kategori{' '}
            <strong className="text-slate-900 font-semibold">{errorInfo.categoryName}</strong>. 
            Format berkas yang Anda pilih tidak sesuai dengan standar algoritma pemrosesan citra.
          </p>

          {/* Rejected File Card */}
          <div className="bg-red-50/50 rounded-xl p-3.5 border border-red-100 flex items-center space-x-3">
            <FileX className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {errorInfo.fileName}
              </p>
              <p className="text-[11px] text-red-600 font-medium">
                Terdeteksi:{' '}
                <span className="font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                  {errorInfo.fileExtension || 'Tanpa Ekstensi'}
                </span>
                {' '}(Ditolak)
              </p>
            </div>
          </div>

          {/* Expected Formats Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
            <p className="text-[11px] font-semibold text-slate-700 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              Format yang diperbolehkan untuk kategori ini:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {errorInfo.expectedFormats.map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#009688]/10 text-[#00796b] border border-[#009688]/20"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {errorInfo.customMessage && (
            <p className="text-[11px] text-slate-500 italic bg-amber-50 p-2.5 rounded-lg border border-amber-100">
              Catatan: {errorInfo.customMessage}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Mengerti & Pilih Berkas yang Sesuai
          </button>
        </div>
      </div>
    </div>
  )
}

