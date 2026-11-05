import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ChevronDown } from 'lucide-react'

export const KesesuaianRTRW: React.FC = () => {
  const [tahunKlasifikasi, setTahunKlasifikasi] = useState('2025')
  const [layerRTRW, setLayerRTRW] = useState('Pola Ruang')

  // Matrix cells 7 columns x 5 rows matching the screenshot layout
  const overlayMatrix = [
    // Row 1
    ['green', 'green', 'red', 'green', 'red', 'green', 'green'],
    // Row 2
    ['green', 'red', 'green', 'green', 'green', 'red', 'green'],
    // Row 3
    ['red', 'green', 'green', 'red', 'green', 'green', 'red'],
    // Row 4
    ['green', 'green', 'red', 'green', 'red', 'green', 'green'],
    // Row 5
    ['green', 'red', 'green', 'green', 'green', 'red', 'green'],
  ]

  const getCellBg = (type: string) => {
    return type === 'green' ? 'bg-[#2e8b57]' : 'bg-[#e05d44]'
  }

  return (
    <MainLayout
      title="Analisis Kesesuaian dengan RTRW"
      subtitle="Overlay hasil klasifikasi penggunaan lahan dengan arahan pola ruang RTRW."
    >
      {/* Top Filter and Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-6">
          {/* Tahun klasifikasi */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600">
              Tahun klasifikasi
            </span>
            <div className="relative">
              <select
                value={tahunKlasifikasi}
                onChange={(e) => setTahunKlasifikasi(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 pr-8 rounded-xl shadow-xs focus:outline-none focus:ring-1 focus:ring-[#009688]"
              >
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Layer RTRW */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600">
              Layer RTRW
            </span>
            <div className="relative">
              <select
                value={layerRTRW}
                onChange={(e) => setLayerRTRW(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 pr-8 rounded-xl shadow-xs focus:outline-none focus:ring-1 focus:ring-[#009688]"
              >
                <option value="Pola Ruang">Pola Ruang</option>
                <option value="Struktur Ruang">Struktur Ruang</option>
                <option value="Kawasan Strategis">Kawasan Strategis</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => alert('Memproses analisis overlay spasial dengan layer RTRW...')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          Analisis Overlay
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Card 1: SESUAI RTRW */}
        <div className="bg-[#f1f6fa] rounded-2xl p-5 border-l-4 border-[#2e8b57]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            SESUAI RTRW
          </p>
          <p className="text-3xl font-black text-[#2e8b57] mt-1.5">76,4%</p>
        </div>

        {/* Card 2: TIDAK SESUAI */}
        <div className="bg-[#f1f6fa] rounded-2xl p-5 border-l-4 border-[#e05d44]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TIDAK SESUAI
          </p>
          <p className="text-3xl font-black text-[#e05d44] mt-1.5">23,6%</p>
        </div>

        {/* Card 3: LUAS ANALISIS */}
        <div className="bg-[#f1f6fa] rounded-2xl p-5 border-l-4 border-[#152238]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            LUAS ANALISIS
          </p>
          <p className="text-3xl font-black text-[#152238] mt-1.5">3.993 ha</p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Column: Peta Overlay Kesesuaian RTRW */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#152238]">
              Peta Overlay Kesesuaian RTRW
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              Hijau = sesuai • Merah = tidak sesuai
            </p>

            {/* Thematic Matrix Container */}
            <div className="bg-[#ebf2ea] rounded-2xl p-6 min-h-[290px] flex items-center justify-center border border-slate-200/50">
              <div className="grid grid-cols-7 gap-1.5 w-full max-w-lg">
                {overlayMatrix.flat().map((color, idx) => (
                  <div
                    key={idx}
                    className={`h-11 rounded-sm transition-all duration-300 hover:opacity-90 ${getCellBg(
                      color
                    )}`}
                  />
                ))}
              </div>
            </div>

            {/* Map Legend */}
            <div className="flex items-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#2e8b57]" />
                <span className="text-slate-700 font-medium">Sesuai RTRW</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#e05d44]" />
                <span className="text-slate-700 font-medium">Tidak sesuai RTRW</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              Ilustrasi visual. Persentase aktual dihitung dari luas piksel/poligon hasil overlay.
            </p>
          </div>
        </div>

        {/* Right Column: Rincian Kesesuaian */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#152238]">Rincian Kesesuaian</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">
              Proporsi terhadap total wilayah analisis
            </p>

            {/* Circular Chart & Stats */}
            <div className="flex items-center gap-6 mb-6">
              {/* Circular Progress Gauge */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-[#dcfce7]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Stroke */}
                  <path
                    className="text-[#2e8b57]"
                    strokeDasharray="76.4, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-slate-800 leading-none">
                    76,4%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Sesuai
                  </span>
                </div>
              </div>

              {/* Progress Labels */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700">Sesuai RTRW</p>
                  <p className="text-lg font-black text-[#2e8b57] leading-tight">
                    3.050 ha
                  </p>
                  <div className="h-1.5 w-full bg-[#dcfce7] rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-[#2e8b57] w-[76.4%] rounded-full" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700">Tidak sesuai RTRW</p>
                  <p className="text-lg font-black text-[#e05d44] leading-tight">
                    943 ha
                  </p>
                  <div className="h-1.5 w-full bg-rose-100 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-[#e05d44] w-[23.6%] rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan interpretasi Box */}
            <div className="bg-[#f1f6fa] rounded-2xl p-4 mt-6">
              <h4 className="text-xs font-bold text-slate-800">
                Catatan interpretasi
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Kesesuaian ditentukan dengan aturan pencocokan kelas hasil klasifikasi terhadap kategori pola ruang RTRW. Kelas yang tidak memiliki padanan aturan harus ditandai untuk ditinjau, bukan otomatis dianggap sesuai.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Ringkasan per kelas */}
      <div className="bg-[#f1f6fa] rounded-2xl p-5 mt-2">
        <h3 className="text-xs font-bold text-[#152238]">Ringkasan per kelas</h3>
        <p className="text-xs text-slate-500 mt-1">
          Kelas hasil • Kategori RTRW • Luas sesuai • Luas tidak sesuai • Persentase sesuai
        </p>
      </div>
    </MainLayout>
  )
}
