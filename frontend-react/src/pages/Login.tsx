import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Lock, Mail, ArrowRight, ShieldCheck, Database, AlertCircle } from 'lucide-react'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = login(email, password)
    if (res.success) {
      navigate('/')
    } else {
      setError(res.message || 'Login gagal')
    }
  }

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail)
    setPassword(rolePass)
    const res = login(roleEmail, rolePass)
    if (res.success) {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#132038] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#009688]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#009688] text-white shadow-lg shadow-[#009688]/20 mb-4">
            <Database className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black uppercase text-white tracking-wider">
            APLIKASI
          </h1>
          <p className="text-xs text-slate-300 font-medium uppercase tracking-widest mt-1">
            Land Classification & Forecast
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Sistem klasifikasi dan prediksi luas lahan berbasis data spasial
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <h2 className="text-xl font-bold text-[#152238] mb-1">Masuk ke Sistem</h2>
          <p className="text-xs text-slate-500 mb-6">
            Gunakan akun Admin atau Peneliti untuk melanjutkan.
          </p>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@gmail.com / peneliti@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009688] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009688] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-[#009688] hover:bg-[#00796b] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#009688]/20 flex items-center justify-center gap-2 transition-all"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Credential Helpers */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Akses Cepat (Klik untuk Mengisi):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@gmail.com', 'admin123')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#009688]" />
                  <span>Role Admin</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">admin@gmail.com</p>
                <p className="text-[10px] text-slate-400">sandi: admin123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('peneliti@gmail.com', 'peneliti123')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Role Peneliti</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">peneliti@gmail.com</p>
                <p className="text-[10px] text-slate-400">sandi: peneliti123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

