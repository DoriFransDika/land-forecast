import React from 'react'
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  Map,
  FileSpreadsheet,
  Settings,
} from 'lucide-react'

interface NavItem {
  name: string
  icon: React.ElementType
  active?: boolean
  badge?: string
}

const menuItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, active: true },
  { name: 'Peta Spasial (GIS)', icon: Map },
  { name: 'Klasifikasi Tutupan Lahan', icon: Layers },
  { name: 'Prediksi Perubahan Luas', icon: TrendingUp, badge: 'ML' },
  { name: 'Laporan & Ekspor Data', icon: FileSpreadsheet },
  { name: 'Pengaturan', icon: Settings },
]

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Modul Utama
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.name}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <p className="text-xs font-semibold text-slate-700">Status Engine Spasial</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Model: Random Forest & CA-Markov
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-medium text-emerald-700">Siap Proses</span>
        </div>
      </div>
    </aside>
  )
}

