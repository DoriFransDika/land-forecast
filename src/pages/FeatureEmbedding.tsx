import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const FeatureEmbedding: React.FC = () => {
  const navigate = useNavigate()

  const latentDimensions = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8']

  return (
    <MainLayout title="3 Feature Embedding">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-8">
        Mempelajari representasi laten dari kombinasi fitur dan kategori RTRW.
      </p>

      {/* 2x2 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-8">
        {/* Item 1: Input Encoder */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Input Encoder</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            B02, B03, B04, B08, NDVI, NDWI, NDBI, Pop + vektor One-Hot RTRW
          </p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>

        {/* Item 2: Konfigurasi VAE */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Konfigurasi VAE</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            Latent dimension = 8 ; β = 1
          </p>
          <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-[10px] font-semibold px-2.5 py-0.5 rounded">
            Siap diatur
          </span>
        </div>

        {/* Item 3: Representasi Laten */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Representasi Laten</h3>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            z_mean → z1 sampai z8
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {latentDimensions.map((z) => (
              <span
                key={z}
                className="inline-flex items-center justify-center bg-[#009688] text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs"
              >
                {z}
              </span>
            ))}
          </div>
        </div>

        {/* Item 4: Feature Fusion */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Feature Fusion</h3>
          <p className="text-xs text-slate-400 mt-1 mb-2.5">
            9 fitur asli + 8 fitur laten = 17 fitur
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
          onClick={() => navigate('/split-data')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Jalankan Tahap
        </button>
      </div>
    </MainLayout>
  )
}

