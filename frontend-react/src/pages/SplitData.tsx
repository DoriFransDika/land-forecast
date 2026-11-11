import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const SplitData: React.FC = () => {
  const navigate = useNavigate()

  return (
    <MainLayout title="4 Split Data">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-8">
        Atur strategi pemisahan data latih dan data uji sebelum evaluasi.
      </p>

      {/* Row 1: Split Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10 max-w-3xl">
        {/* Rasio Data Latih */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Rasio Data Latih</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">70%</p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>

        {/* Rasio Data Uji */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Rasio Data Uji</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">30%</p>
        </div>

        {/* Total Persentasi Data */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Total Persentasi Data</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">100%</p>
        </div>
      </div>

      {/* Row 2: Reproducibility */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-[#152238]">Reproducibility</h3>
        <p className="text-xs text-slate-400 mt-1 mb-2.5">
          Random state = 42 • stratifikasi kelas
        </p>
        <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
          Siap diatur
        </span>
      </div>

      {/* Ringkasan Tahap */}
      <div className="mt-auto pt-8">
        <h3 className="text-sm font-bold text-[#152238]">Ringkasan Tahap</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Parameter, log proses, dan hasil tahap ini akan ditampilkan di sini.
        </p>
        <p className="text-xs font-bold text-[#152238] mt-3">Status proses</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Belum dijalankan — unggah data atau konfigurasi parameter terlebih dahulu.
        </p>
      </div>

      {/* Bottom Action Button */}
      <div className="flex justify-end pt-6 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={() => navigate('/klasifikasi-rf')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Jalankan Tahap
        </button>
      </div>
    </MainLayout>
  )
}

