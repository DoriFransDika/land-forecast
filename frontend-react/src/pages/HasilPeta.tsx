import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Download, ChevronDown } from 'lucide-react'

export const HasilPeta: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState('2025')

  const classStats = [
    {
      name: 'Terbangun',
      area: '1.245 ha',
      percentage: '31,2%',
      color: 'bg-[#e05d44]',
      barColor: 'bg-[#e05d44]',
      width: '31.2%',
    },
    {
      name: 'Pertanian',
      area: '986 ha',
      percentage: '24,7%',
      color: 'bg-[#f5b041]',
      barColor: 'bg-[#f5b041]',
      width: '24.7%',
    },
    {
      name: 'Vegetasi berkayu',
      area: '1.430 ha',
      percentage: '35,8%',
      color: 'bg-[#2e8b57]',
      barColor: 'bg-[#2e8b57]',
      width: '35.8%',
    },
    {
      name: 'Lahan terbuka',
      area: '332 ha',
      percentage: '8,3%',
      color: 'bg-[#bfa67a]',
      barColor: 'bg-[#bfa67a]',
      width: '8.3%',
    },
  ]

  // Mock thematic grid matrix resembling the prototype image layout
  const gridCells = [
    // Row 1
    ['green', 'yellow', 'yellow', 'red', 'red', 'green'],
    // Row 2
    ['green', 'yellow', 'red', 'red', 'tan', 'green'],
    // Row 3
    ['tan', 'yellow', 'green', 'red', 'tan', 'yellow'],
    // Row 4
    ['tan', 'green', 'green', 'yellow', 'red', 'red'],
    // Row 5
    ['green', 'yellow', 'tan', 'yellow', 'green', 'tan'],
    // Row 6 (small tail)
    ['', '', '', '', 'green', 'red'],
  ]

  const getColorClass = (type: string) => {
    switch (type) {
      case 'red':
        return 'bg-[#e05d44]'
      case 'yellow':
        return 'bg-[#f5b041]'
      case 'green':
        return 'bg-[#2e8b57]'
      case 'tan':
        return 'bg-[#bfa67a]'
      default:
        return 'transparent'
    }
  }

  return (
    <MainLayout
      title="Hasil Klasifikasi Penggunaan Lahan"
      subtitle="Peta tematik hasil Random Forest dan ringkasan luas setiap kelas."
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Periode</span>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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

        <button
          type="button"
          onClick={() => alert('Mengekspor GeoTIFF & Laporan Ringkasan Luas Lahan...')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor Hasil</span>
        </button>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Column: Peta Hasil Klasifikasi */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#152238]">
              Peta Hasil Klasifikasi
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              Klasifikasi empat kelas • contoh visual
            </p>

            {/* Simulated Thematic Map Visualization */}
            <div className="bg-[#ebf2ea] rounded-2xl p-6 min-h-[290px] flex items-center justify-center border border-slate-200/50">
              <div className="grid grid-cols-6 gap-1 w-full max-w-md">
                {gridCells.flat().map((color, idx) => (
                  <div
                    key={idx}
                    className={`h-10 rounded-sm transition-all duration-300 hover:opacity-85 ${
                      color ? getColorClass(color) : 'invisible'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              Ilustrasi tata letak peta — layer raster aktual ditampilkan dari hasil model.
            </p>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#e05d44]" />
                <span>Terbangun</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f5b041]" />
                <span>Pertanian</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2e8b57]" />
                <span>Vegetasi berkayu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#bfa67a]" />
                <span>Lahan terbuka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Statistik Luas per Kelas */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-[#152238]">
            Statistik Luas per Kelas
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-6">
            Luas dan persentase dari total wilayah
          </p>

          <div className="space-y-6">
            {classStats.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="font-bold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.percentage}</span>
                </div>
                <div className="text-[11px] text-slate-400 mb-1.5 pl-4.5">
                  {item.area}
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row Summary Cards */}
      <div className="bg-[#f1f6fa] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-4">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TOTAL LUAS TERKLASIFIKASI
          </p>
          <p className="text-3xl font-black text-[#152238] mt-1">3.993 ha</p>
          <p className="text-xs text-slate-400 mt-1">
            Contoh angka untuk mockup — ganti dengan hasil perhitungan raster aktual.
          </p>
        </div>

        <div className="sm:text-right sm:border-l sm:border-slate-200 sm:pl-8">
          <p className="text-xs text-slate-500 font-medium">Jumlah kelas</p>
          <p className="text-2xl font-black text-[#152238] mt-1">4 kelas</p>
        </div>
      </div>
    </MainLayout>
  )
}

