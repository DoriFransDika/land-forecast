# Sistem Klasifikasi dan Prediksi Luas Lahan Berbasis Data Spasial

Arsitektur sistem multi-service (Decoupled Monorepo) untuk klasifikasi tutupan lahan dan prediksi spasial menggunakan data citra satelit, Deep Learning (VAE), dan Machine Learning (Random Forest & MLP).

---

## 🏗️ Arsitektur Direktori

```text
Sistem-Klasifikasi-dan-Prediksi-Luas-Lahan/
├── frontend-react/        # Antarmuka SPA (React 18 + Vite + Tailwind + Charts + Maps)
├── backend-laravel/       # Database relasional, Auth (Sanctum/JWT), & Manajemen User
└── backend-ai/            # Spatial Engine (FastAPI + Rasterio + GeoPandas + VAE + RF + MLP)
```

---

## 🚀 Panduan Menjalankan Setiap Service

### 1. Frontend (React SPA)
```bash
cd frontend-react
npm install
npm run dev
# Berjalan di http://localhost:5173
```

### 2. Backend Manajemen & Otentikasi (Laravel)
```bash
cd backend-laravel
composer install
php artisan migrate
php artisan serve --port=8000
# Berjalan di http://localhost:8000
```

### 3. Backend AI & Spatial Engine (Python FastAPI)
```bash
cd backend-ai
# Aktivasi Virtual Environment:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependensi:
pip install -r requirements.txt

# Jalankan server:
uvicorn app.main:app --port 8001 --reload
# Berjalan di http://localhost:8001
# Dokumentasi Swagger UI: http://localhost:8001/docs
```
