import React from 'react'
import { MapPin, Bell, User } from 'lucide-react'

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">
            GeoLand Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Klasifikasi & Prediksi Luas Lahan Spasial
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifikasi"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">Admin Spasial</p>
            <p className="text-[11px] text-slate-500">Operator GIS</p>
          </div>
        </div>
      </div>
    </header>
  )
}

