import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const Overview: React.FC = () => {
  const navigate = useNavigate()

  const metrics = [
    { label: 'DATASET', value: '3 sumber data' },
    { label: 'TAHAPAN', value: '7 tahap' },
    { label: 'AKURASI RF', value: '94.84%' },
    { label: 'MODEL PREDIKSI', value: 'MLP' },
  ]

  const steps = [
    { num: '01', title: 'Input Data', path: '/input-data', active: false },
    { num: '02', title: 'Preprocessing', path: '/preprocessing', active: false },
    { num: '03', title: 'Feature Embedding', path: '/feature-embedding', active: false },
    { num: '04', title: 'Split Data', path: '/split-data', active: false },
    { num: '05', title: 'Klasifikasi RF', path: '/klasifikasi-rf', active: false },
    { num: '06', title: 'Accuracy Assessment', path: '/accuracy-assessment', active: false },
    { num: '07', title: 'Prediksi MLP', path: '/prediksi-mlp', active: true },
  ]

  return (
    <MainLayout title="Overview">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-6">
        Ringkasan alur kerja klasifikasi dan prediksi luas lahan.
      </p>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-[#f1f6fa] rounded-2xl p-6 transition-all hover:shadow-sm"
          >
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {m.label}
            </p>
            <p className="text-2xl font-black text-[#152238] mt-2">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Alur Pemrosesan */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#152238]">Alur Pemrosesan</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Pilih tahapan dari menu samping untuk mengelola setiap proses.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {steps.map((step) => {
            if (step.active) {
              return (
                <div
                  key={step.num}
                  onClick={() => navigate(step.path)}
                  className="bg-[#152238] text-white rounded-2xl p-4 cursor-pointer hover:opacity-95 transition-all shadow-sm flex flex-col justify-between min-h-[90px]"
                >
                  <span className="text-xs font-bold text-slate-300">{step.num}</span>
                  <span className="text-xs font-bold leading-tight">{step.title}</span>
                </div>
              )
            }

            return (
              <div
                key={step.num}
                onClick={() => navigate(step.path)}
                className="bg-[#f1f6fa] text-[#152238] rounded-2xl p-4 cursor-pointer hover:bg-slate-200/60 transition-all flex flex-col justify-between min-h-[90px]"
              >
                <span className="text-xs font-bold text-[#009688]">{step.num}</span>
                <span className="text-xs font-bold leading-tight">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aktivitas Terbaru */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-[#152238]">Aktivitas Terbaru</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          Riwayat proses dan status eksekusi model.
        </p>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Input data: menunggu unggahan</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Preprocessing: belum dijalankan</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Model RF: siap dikonfigurasi</span>
          </li>
        </ul>
      </div>

      {/* Bottom Action Button */}
      <div className="flex justify-end pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => navigate('/input-data')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Mulai Pipeline
        </button>
      </div>
    </MainLayout>
  )
}

