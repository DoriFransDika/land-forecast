import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const PrediksiMLP: React.FC = () => {
  const navigate = useNavigate()

  const mlpCards = [
    {
      title: 'Horizon Prediksi',
      desc: 'Pilih tahun target dan periode historis',
    },
    {
      title: 'Input Prediksi',
      desc: 'Fitur spasial • variabel pendorong • data historis',
    },
    {
      title: 'Model MLP',
      desc: 'Konfigurasi layer • epoch • learning rate',
    },
    {
      title: 'Output Prediksi',
      desc: 'Peta prediksi • luas per kelas • perubahan area',
    },
  ]

  return (
    <MainLayout title="7 Prediksi MLP">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-8">
        Gunakan fitur spasial dan hasil klasifikasi sebagai masukan model prediksi.
      </p>

      {/* 2x2 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-8">
        {mlpCards.map((card) => (
          <div key={card.title}>
            <h3 className="text-sm font-bold text-[#152238]">{card.title}</h3>
            <p className="text-xs text-slate-400 mt-1 mb-2.5">{card.desc}</p>
            <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
              Siap diatur
            </span>
          </div>
        ))}
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
          onClick={() => navigate('/hasil-peta')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Jalankan Tahap
        </button>
      </div>
    </MainLayout>
  )
}

