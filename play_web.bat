@echo off
setlocal enabledelayedexpansion
title Launcher - Sistem Klasifikasi dan Prediksi Luas Lahan

set "ROOT_DIR=%~dp0"

echo ============================================================================
echo   SISTEM KLASIFIKASI DAN PREDIKSI LUAS LAHAN BERBASIS DATA SPASIAL
echo   Multi-Service Launcher (React + Laravel + Scheduler + FastAPI AI)
echo ============================================================================
echo.

:: 1. Cek kelengkapan direktori service
if not exist "%ROOT_DIR%frontend-react\package.json" (
    echo [ERROR] Folder frontend-react tidak ditemukan!
    pause
    exit /b 1
)
if not exist "%ROOT_DIR%backend-laravel\artisan" (
    echo [ERROR] Folder backend-laravel tidak ditemukan!
    pause
    exit /b 1
)
if not exist "%ROOT_DIR%backend-ai\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment backend-ai\venv tidak ditemukan!
    pause
    exit /b 1
)

:: 2. Cek apakah MySQL (port 3306) sudah menyala
echo [CHECK] Memeriksa koneksi MySQL (127.0.0.1:3306)...
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 3306); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] MySQL di port 3306 belum terdeteksi aktif!
    echo           Pastikan XAMPP / Laragon MySQL sudah dijalankan agar database
    echo           'sistem-klasifikasi-dan-prediksi' dapat diakses oleh Laravel.
    echo.
) else (
    echo [OK] MySQL aktif di port 3306.
    echo.
)

:: 3. Jalankan Backend Laravel (Port 8000)
echo [1/4] Menyalakan Backend Laravel API (Port 8000)...
start "[1/4] Backend Laravel API (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend-laravel" && php artisan serve --host=127.0.0.1 --port=8000"

:: 4. Jalankan Laravel Scheduler (Auto-Cleanup Staging TTL 24 Jam)
echo [2/4] Menyalakan Laravel Scheduler (Garbage Collection 24 Jam)...
start "[2/4] Laravel Scheduler (Auto-Cleanup 24h)" cmd /k "cd /d "%ROOT_DIR%backend-laravel" && php artisan schedule:work"

:: 5. Jalankan Backend AI FastAPI (Port 8001)
echo [3/4] Menyalakan Backend AI Spatial Engine - FastAPI (Port 8001)...
start "[3/4] Backend AI FastAPI (Port 8001)" cmd /k "cd /d "%ROOT_DIR%backend-ai" && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

:: 6. Jalankan Frontend React Vite (Port 5173)
echo [4/4] Menyalakan Frontend React SPA (Port 5173)...
start "[4/4] Frontend React Vite (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend-react" && npm run dev"

echo.
echo ============================================================================
echo   Semua service sedang dijalankan di jendela terminal terpisah:
echo   - Frontend React      : http://localhost:5173
echo   - Backend Laravel API : http://localhost:8000
echo   - Backend AI FastAPI  : http://localhost:8001
echo   - Swagger AI Docs     : http://localhost:8001/docs
echo ============================================================================
echo.
echo Menunggu 4 detik sebelum membuka browser otomatis...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo Selesai! Tutup jendela masing-masing service jika ingin menghentikannya.
pause

