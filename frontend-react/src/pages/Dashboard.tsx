import React from 'react'
import {
  Layers,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Overview Analisis Spasial
          </h2>
          <p className="text-sm text-slate-500">
            Monitoring klasifikasi tutupan lahan & estimasi tren perubahan di masa depan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            Periode: 2019 - 2024
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Jalankan Prediksi Baru
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Luas Area Studi
            </span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">124.580</span>
            <span className="text-xs font-medium text-slate-500">Hektar (Ha)</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Cakupan citra Landsat/Sentinel</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Kelas Tutupan Dominan
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">Pertanian</span>
            <span className="text-xs font-medium text-slate-500">42,6%</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">53.071 Ha terdeteksi</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Konversi Lahan (5 Thn)
            </span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">+8.420</span>
            <span className="text-xs font-medium text-slate-500">Ha Pemukiman</span>
          </div>
          <p className="mt-2 text-xs text-emerald-600 font-medium">Laju konversi +6.7%/thn</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Prediksi Luas (2030)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">-12,4%</span>
            <span className="text-xs font-medium text-slate-500">Hutan Lindung</span>
          </div>
          <p className="mt-2 text-xs text-rose-500 font-medium flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> Deforestasi diproyeksi
          </p>
        </div>
      </div>

      {/* Main Content Area Placeholder for GIS Map and Prediction Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placeholder Peta */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Visualisasi Peta Spasial
              </h3>
              <p className="text-xs text-slate-500">
                Layer Tutupan Lahan Multi-Temporal (Leaflet / Mapbox ready)
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Koordinat EPSG:4326
            </span>
          </div>

          <div className="mt-4 flex-1 min-h-[340px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <MapPin className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">
              Area Container Peta Interaktif
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Modul peta GIS (Leaflet, MapLibre, atau OpenLayers) siap diintegrasikan pada langkah berikutnya.
            </p>
          </div>
        </div>

        {/* Legend & Klasifikasi List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-800 pb-4 border-b border-slate-100">
            Distribusi Kelas Lahan
          </h3>
          <ul className="mt-4 space-y-3">
            {[
              { label: 'Hutan & Vegetasi Rapat', area: '38.450 Ha', pct: '30.8%', color: 'bg-emerald-600' },
              { label: 'Lahan Pertanian & Kebun', area: '53.071 Ha', pct: '42.6%', color: 'bg-lime-500' },
              { label: 'Kawasan Terbangun / Pemukiman', area: '21.340 Ha', pct: '17.1%', color: 'bg-amber-500' },
              { label: 'Badan Air & Sungai', area: '6.210 Ha', pct: '5.0%', color: 'bg-sky-500' },
              { label: 'Lahan Terbuka / Tambang', area: '5.509 Ha', pct: '4.5%', color: 'bg-stone-400' },
            ].map((item) => (
              <li key={item.label} className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${item.color}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.area}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700">{item.pct}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

