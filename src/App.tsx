import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'

// Bagian 1 Pages
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { InputData } from './pages/InputData'
import { Preprocessing } from './pages/Preprocessing'
import { FeatureEmbedding } from './pages/FeatureEmbedding'
import { KlasifikasiRF } from './pages/KlasifikasiRF'

// Bagian 2 Pages
import { SplitData } from './pages/SplitData'
import { AccuracyAssessment } from './pages/AccuracyAssessment'
import { PrediksiMLP } from './pages/PrediksiMLP'
import { HasilPeta } from './pages/HasilPeta'
import { StatistikLahan } from './pages/StatistikLahan'
import { KesesuaianRTRW } from './pages/KesesuaianRTRW'

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Bagian 1) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/input-data"
            element={
              <ProtectedRoute>
                <InputData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/preprocessing"
            element={
              <ProtectedRoute>
                <Preprocessing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feature-embedding"
            element={
              <ProtectedRoute>
                <FeatureEmbedding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/klasifikasi-rf"
            element={
              <ProtectedRoute>
                <KlasifikasiRF />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes (Bagian 2) */}
          <Route
            path="/split-data"
            element={
              <ProtectedRoute>
                <SplitData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accuracy-assessment"
            element={
              <ProtectedRoute>
                <AccuracyAssessment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prediksi-mlp"
            element={
              <ProtectedRoute>
                <PrediksiMLP />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hasil-peta"
            element={
              <ProtectedRoute>
                <HasilPeta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistik-lahan"
            element={
              <ProtectedRoute>
                <StatistikLahan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kesesuaian-rtrw"
            element={
              <ProtectedRoute>
                <KesesuaianRTRW />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
