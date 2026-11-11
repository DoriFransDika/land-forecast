import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const AccuracyAssessment: React.FC = () => {
  const navigate = useNavigate()

  return (
    <MainLayout title="6 Accuracy Assessment">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-8">
        Evaluasi hasil klasifikasi terhadap label referensi pada data uji.
      </p>

      {/* 2x2 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-8">
        {/* Item 1: Overall Accuracy */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Overall Accuracy</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2">
            94.84% • contoh hasil eksperimen
          </p>
          <p className="text-3xl font-black text-[#009688] tracking-tight">
            94.84%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Overall accuracy (contoh hasil eksperimen)
          </p>
        </div>

        {/* Item 2: Precision */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Precision</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            Per kelas dan macro / weighted average
          </p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>

        {/* Item 3: Recall & F1-score */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Recall & F1-score</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            Pantau kelas yang sulit dikenali
          </p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>

        {/* Item 4: Confusion Matrix */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Confusion Matrix</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            Bandingkan kelas aktual dan prediksi
          </p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>
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
          onClick={() => navigate('/prediksi-mlp')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Jalankan Tahap
        </button>
      </div>
    </MainLayout>
  )
}

