import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Download, ChevronDown } from 'lucide-react'

export const StatistikLahan: React.FC = () => {
  const [startYear, setStartYear] = useState('2020')
  const [endYear, setEndYear] = useState('2025')

  // Data per tahun (dalam ha) untuk chart
  const yearlyData = [
    {
      year: '2020',
      terbangun: 882,
      pertanian: 1118,
      vegetasi: 1569,
      lahanTerbuka: 424,
    },
    {
      year: '2021',
      terbangun: 970,
      pertanian: 1090,
      vegetasi: 1513,
      lahanTerbuka: 420,
    },
    {
      year: '2022',
      terbangun: 1062,
      pertanian: 1062,
      vegetasi: 1481,
      lahanTerbuka: 388,
    },
    {
      year: '2023',
      terbangun: 1142,
      pertanian: 1030,
      vegetasi: 1453,
      lahanTerbuka: 368,
    },
    {
      year: '2024',
      terbangun: 1245,
      pertanian: 986,
      vegetasi: 1430,
      lahanTerbuka: 332,
    },
    {
      year: '2025',
      terbangun: 1350,
      pertanian: 950,
      vegetasi: 1390,
      lahanTerbuka: 303,
    },
  ]

  // Persentase tabel
  const tableData = [
    {
      name: 'Terbangun',
      p2020: '22,1',
      p2021: '24,3',
      p2022: '26,6',
      p2023: '28,6',
      p2024: '31,2',
      p2025: '33,8',
    },
    {
      name: 'Pertanian',
      p2020: '28,0',
      p2021: '27,3',
      p2022: '26,6',
      p2023: '25,8',
      p2024: '24,7',
      p2025: '23,8',
    },
    {
      name: 'Vegetasi berkayu',
      p2020: '39,3',
      p2021: '37,9',
      p2022: '37,1',
      p2023: '36,4',
      p2024: '35,8',
      p2025: '34,8',
    },
    {
      name: 'Lahan terbuka',
      p2020: '10,6',
      p2021: '10,6',
      p2022: '9,8',
      p2023: '9,3',
      p2024: '8,3',
      p2025: '7,6',
    },
  ]

  const maxVal = 4000 // skala chart

  return (
    <MainLayout
      title="Statistik dan Perubahan Penggunaan Lahan"
      subtitle="Bandingkan luas dan persentase setiap kelas dari tahun ke tahun."
    >
      {/* Top Filter and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Rentang tahun</span>
          <div className="relative">
            <select
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 pr-8 rounded-xl shadow-xs focus:outline-none"
            >
              <option value="2020">2020</option>
              <option value="2021">2021</option>
              <option value="2022">2022</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-xs text-slate-400">hingga</span>

          <div className="relative">
            <select
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 pr-8 rounded-xl shadow-xs focus:outline-none"
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert('Mengunduh Laporan Tren Spasial CSV / PDF...')}
          className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Laporan</span>
        </button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#f1f6fa] rounded-2xl p-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TOTAL WILAYAH
          </p>
          <p className="text-2xl font-black text-[#152238] mt-1.5">3.993 ha</p>
        </div>

        <div className="bg-[#f1f6fa] rounded-2xl p-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            KELAS DOMINAN
          </p>
          <p className="text-2xl font-black text-[#152238] mt-1.5">
            Vegetasi berkayu
          </p>
        </div>

        <div className="bg-[#f1f6fa] rounded-2xl p-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            PERUBAHAN TERBESAR
          </p>
          <p className="text-2xl font-black text-[#152238] mt-1.5">
            Terbangun +8,4%
          </p>
        </div>
      </div>

      {/* Middle Card: Tren Luas Penggunaan Lahan (Grouped Bar Chart) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-sm font-bold text-[#152238]">
              Tren Luas Penggunaan Lahan
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Perbandingan luas (ha) per kelas • data ilustratif untuk rancangan UI
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#e05d44]" />
              <span>Terbangun</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f5b041]" />
              <span>Pertanian</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2e8b57]" />
              <span>Vegetasi berkayu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#bfa67a]" />
              <span>Lahan terbuka</span>
            </div>
          </div>
        </div>

        {/* Custom High-Fidelity SVG / CSS Grouped Bar Chart */}
        <div className="relative pt-4 pb-2">
          {/* Grid lines & Y-axis labels */}
          <div className="h-48 flex flex-col justify-between border-l border-b border-slate-200 relative pl-2">
            {[4000, 3000, 2000, 1000, 0].map((val) => (
              <div key={val} className="w-full flex items-center relative -left-8">
                <span className="text-[10px] text-slate-400 w-6 text-right font-mono">
                  {val}
                </span>
                <div className="w-full border-t border-slate-100 ml-2" />
              </div>
            ))}

            {/* Bars container */}
            <div className="absolute inset-0 pl-4 pr-4 flex items-end justify-between">
              {yearlyData.map((d) => (
                <div key={d.year} className="flex-1 flex flex-col items-center group">
                  {/* Cluster of 4 bars */}
                  <div className="flex items-end gap-1.5 h-full pb-1">
                    {/* Bar 1: Terbangun */}
                    <div
                      className="w-3 sm:w-4 bg-[#e05d44] rounded-t-xs hover:opacity-85 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom"
                      style={{ height: `${(d.terbangun / maxVal) * 100}%` }}
                      title={`Terbangun: ${d.terbangun} ha`}
                    />
                    {/* Bar 2: Pertanian */}
                    <div
                      className="w-3 sm:w-4 bg-[#f5b041] rounded-t-xs hover:opacity-85 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom"
                      style={{ height: `${(d.pertanian / maxVal) * 100}%` }}
                      title={`Pertanian: ${d.pertanian} ha`}
                    />
                    {/* Bar 3: Vegetasi */}
                    <div
                      className="w-3 sm:w-4 bg-[#2e8b57] rounded-t-xs hover:opacity-85 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom"
                      style={{ height: `${(d.vegetasi / maxVal) * 100}%` }}
                      title={`Vegetasi: ${d.vegetasi} ha`}
                    />
                    {/* Bar 4: Lahan Terbuka */}
                    <div
                      className="w-3 sm:w-4 bg-[#bfa67a] rounded-t-xs hover:opacity-85 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom"
                      style={{ height: `${(d.lahanTerbuka / maxVal) * 100}%` }}
                      title={`Lahan terbuka: ${d.lahanTerbuka} ha`}
                    />
                  </div>
                  {/* X-axis label */}
                  <span className="text-xs font-semibold text-slate-600 mt-2">
                    {d.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Persentase Penggunaan Lahan per Tahun (Table) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-[#152238]">
          Persentase Penggunaan Lahan per Tahun
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-4">
          Proporsi tiap kelas terhadap total luas wilayah (%)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-600">
                <th className="py-2.5 font-bold text-[#152238]">Kelas</th>
                <th className="py-2.5 font-bold">2020</th>
                <th className="py-2.5 font-bold">2021</th>
                <th className="py-2.5 font-bold">2022</th>
                <th className="py-2.5 font-bold">2023</th>
                <th className="py-2.5 font-bold">2024</th>
                <th className="py-2.5 font-bold">2025</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {tableData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-[#152238]">{row.name}</td>
                  <td className="py-2.5">{row.p2020}</td>
                  <td className="py-2.5">{row.p2021}</td>
                  <td className="py-2.5">{row.p2022}</td>
                  <td className="py-2.5">{row.p2023}</td>
                  <td className="py-2.5">{row.p2024}</td>
                  <td className="py-2.5">{row.p2025}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}

