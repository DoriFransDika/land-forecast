import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogOut, ChevronDown, CheckCircle2, UserCheck } from 'lucide-react'

interface NavMenuItem {
  name: string
  path: string
}

const navItems: NavMenuItem[] = [
  { name: 'Overview', path: '/' },
  { name: '1 Input Data', path: '/input-data' },
  { name: '2 Preprocessing', path: '/preprocessing' },
  { name: '3 Feature Embedding', path: '/feature-embedding' },
  { name: '4 Split Data', path: '/split-data' },
  { name: '5 Klasifikasi RF', path: '/klasifikasi-rf' },
  { name: '6 Accuracy Assessment', path: '/accuracy-assessment' },
  { name: '7 Prediksi MLP', path: '/prediksi-mlp' },
  { name: 'Hasil & Peta', path: '/hasil-peta' },
  { name: 'Statistik Lahan', path: '/statistik-lahan' },
  { name: 'Kesesuaian RTRW', path: '/kesesuaian-rtrw' },
]

interface MainLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  headerAction?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  title,
  subtitle = 'Sistem klasifikasi dan prediksi luas lahan berbasis data spasial',
  children,
  headerAction,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, switchRole } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f3f6f9] flex font-sans antialiased">
      {/* Sidebar - Dark Navy (#132038) */}
      <aside className="w-64 lg:w-72 bg-[#132038] text-white flex-shrink-0 min-h-screen flex flex-col justify-between p-6 select-none">
        <div>
          {/* Logo Brand: LANDSCOPE */}
          <div className="pt-2 pb-7">
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              LANDSCOPE
            </h1>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
              Land Classification & Forecast
            </p>
          </div>

          {/* Navigation Links with new ML pipeline order */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/' || location.pathname === '/overview'
                  : location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#009688] text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 font-normal'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="pt-6 border-t border-slate-700/50 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300">Modul Spasial v2.0</p>
          <p className="mt-0.5">Klasifikasi Tutupan & Prediksi</p>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <header className="px-8 lg:px-10 pt-8 pb-6 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#009688]">
              WORKSPACE
            </span>
            <h2 className="text-3xl font-extrabold text-[#152238] mt-1 tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {headerAction}

            {/* User Role Badge / Dropdown (Dynamic Admin / Peneliti) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-2.5 transition-all"
              >
                <div className="w-2 h-2 rounded-full bg-[#009688] animate-pulse" />
                <span>{user ? user.role : 'Admin / Peneliti'}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {/* Dropdown Menu for role switching & logout */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-3 bg-slate-50 rounded-xl mb-2">
                      <p className="text-xs text-slate-500 font-medium">Akun Aktif:</p>
                      <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Ganti Peran Cepat
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        switchRole('Admin')
                        setDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                        user?.role === 'Admin'
                          ? 'bg-[#009688]/10 text-[#009688] font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span>Masuk sebagai Admin</span>
                      </div>
                      {user?.role === 'Admin' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        switchRole('Peneliti')
                        setDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                        user?.role === 'Peneliti'
                          ? 'bg-[#009688]/10 text-[#009688] font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span>Masuk sebagai Peneliti</span>
                      </div>
                      {user?.role === 'Peneliti' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar Akun (Logout)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="px-8 lg:px-10 pb-10 flex-1 flex flex-col">
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-slate-100/80 flex-1 flex flex-col justify-between">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
