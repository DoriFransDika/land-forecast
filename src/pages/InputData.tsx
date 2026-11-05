import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

export const InputData: React.FC = () => {
  const navigate = useNavigate()
  const [spatialFile, setSpatialFile] = useState<string | null>(null)
  const [nonSpatialFile, setNonSpatialFile] = useState<string | null>(null)
  const [labelFile, setLabelFile] = useState<string | null>(null)

  const handleSimulateUpload = (type: 'spatial' | 'nonSpatial' | 'label') => {
    if (type === 'spatial') setSpatialFile('Sentinel2_2024_RegionA.tif')
    if (type === 'nonSpatial') setNonSpatialFile('Data_Sosio_RTRW_2024.geojson')
    if (type === 'label') setLabelFile('Training_Polygon_4Class.shp')
  }

  return (
    <MainLayout title="1 Input Data">
      {/* Top summary paragraph */}
      <p className="text-sm text-slate-500 mb-8">
        Unggah dan validasi sumber data spasial dan non-spasial.
      </p>

      {/* Upload Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Item 1: Data Spasial */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">
            Data Spasial (Citra Satelit)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Sentinel-2 • B02, B03, B04, B08
          </p>
          <div className="bg-[#f1f6fa] rounded-2xl p-2.5 flex items-center justify-between border border-transparent focus-within:border-[#009688]/30 transition-all">
            <span className="text-xs text-slate-400 pl-3 truncate">
              {spatialFile || 'Drag & drop file atau klik untuk memilih'}
            </span>
            <button
              type="button"
              onClick={() => handleSimulateUpload('spatial')}
              className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
            >
              Pilih File
            </button>
          </div>
        </div>

        {/* Item 2: Data Non-Spasial Pendukung */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">
            Data Non-Spasial Pendukung
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Populasi • RTRW • batas wilayah
          </p>
          <div className="bg-[#f1f6fa] rounded-2xl p-2.5 flex items-center justify-between border border-transparent focus-within:border-[#009688]/30 transition-all">
            <span className="text-xs text-slate-400 pl-3 truncate">
              {nonSpatialFile || 'Drag & drop file atau klik untuk memilih'}
            </span>
            <button
              type="button"
              onClick={() => handleSimulateUpload('nonSpatial')}
              className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
            >
              Pilih File
            </button>
          </div>
        </div>

        {/* Item 3: Data Label */}
        <div>
          <h3 className="text-sm font-bold text-[#152238]">Data Label</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Poligon training • 4 kelas penggunaan lahan
          </p>
          <div className="bg-[#f1f6fa] rounded-2xl p-2.5 flex items-center justify-between border border-transparent focus-within:border-[#009688]/30 transition-all">
            <span className="text-xs text-slate-400 pl-3 truncate">
              {labelFile || 'Drag & drop file atau klik untuk memilih'}
            </span>
            <button
              type="button"
              onClick={() => handleSimulateUpload('label')}
              className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
            >
              Pilih File
            </button>
          </div>
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
          onClick={() => navigate('/preprocessing')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Jalankan Tahap
        </button>
      </div>
    </MainLayout>
  )
}

