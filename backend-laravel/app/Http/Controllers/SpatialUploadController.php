<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSpatialUploadRequest;
use App\Models\StagingFile;
use App\Models\PreprocessedDataset;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SpatialUploadController extends Controller
{
    protected string $aiServiceUrl;

    public function __construct()
    {
        $this->aiServiceUrl = env('FASTAPI_SERVICE_URL', 'http://127.0.0.1:8001');
    }

    /**
     * 1. Upload ke Staging Area & Pencatatan Log Persistent TTL 24 Jam
     * Mendukung Raster (.tif, .tiff, .jp2), Vektor (.zip atau komponen .shp/.dbf/.shx/.prj), dan Tabular (.csv)
     */
    public function upload(StoreSpatialUploadRequest $request): JsonResponse
    {
        $sanitizedItems = $request->sanitizedFiles();
        $category = $request->input('normalized_category');
        $user = $request->user();

        $streams = [];

        try {
            $pendingRequest = Http::timeout(300);

            if (count($sanitizedItems) === 1) {
                $item = $sanitizedItems[0];
                $stream = fopen($item['file']->getRealPath(), 'r');
                $streams[] = $stream;

                $response = $pendingRequest
                    ->attach('file', $stream, $item['safe_name'])
                    ->post("{$this->aiServiceUrl}/api/v1/spatial/upload-staging");
            } else {
                // Multi-file upload (misal .shp, .dbf, .shx, .prj bersamaan)
                foreach ($sanitizedItems as $item) {
                    $stream = fopen($item['file']->getRealPath(), 'r');
                    $streams[] = $stream;
                    $pendingRequest = $pendingRequest->attach('files', $stream, $item['safe_name']);
                }

                $response = $pendingRequest
                    ->post("{$this->aiServiceUrl}/api/v1/spatial/upload-staging-batch");
            }

            if ($response->failed()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal memproses berkas di Staging Server.',
                    'details' => $response->json() ?? $response->body(),
                ], $response->status());
            }

            $aiResult = $response->json();
            $uploadId = $aiResult['upload_id'];

            // Tentukan nama berkas utama & total ukuran
            $primaryItem = collect($sanitizedItems)->firstWhere('ext', 'shp') ?? $sanitizedItems[0];
            $totalBytes = array_sum(array_map(fn ($item) => $item['file']->getSize(), $sanitizedItems));
            $fileType = count($sanitizedItems) > 1 ? 'shp_bundle' : $primaryItem['ext'];

            // Gantikan sesi staging lama yang masih pending untuk kategori yang sama
            $oldStaging = StagingFile::where('user_id', $user->id)
                ->where('category', $category)
                ->where('status', 'pending_preprocessing')
                ->first();

            if ($oldStaging) {
                try {
                    Http::delete("{$this->aiServiceUrl}/api/v1/spatial/staging/{$oldStaging->upload_id}");
                } catch (\Exception $e) {}
                $oldStaging->update(['status' => 'replaced']);
            }

            $stagingFile = StagingFile::create([
                'user_id' => $user->id,
                'upload_id' => $uploadId,
                'category' => $category,
                'original_name' => $primaryItem['safe_name'],
                'file_path' => "staging/{$uploadId}/{$primaryItem['safe_name']}",
                'file_size_bytes' => $totalBytes,
                'file_type' => $fileType,
                'metadata' => $aiResult['metadata'] ?? [],
                'status' => 'pending_preprocessing',
                'expires_at' => now()->addHours(24),
            ]);

            Log::info("Staging File Dicatat: {$primaryItem['safe_name']} (Upload ID: {$uploadId}) oleh {$user->email}");

            return response()->json([
                'status' => 'success',
                'message' => 'Berkas berhasil divalidasi, disanitasi, dan di-stage (TTL: 24 jam).',
                'staging_data' => $stagingFile,
                'ai_metadata' => $aiResult['metadata'] ?? [],
            ], 201);

        } catch (\Exception $e) {
            Log::error("Gagal melakukan staging berkas: " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengunggah berkas ke staging area: ' . $e->getMessage(),
            ], 500);
        } finally {
            foreach ($streams as $stream) {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
        }
    }

    /**
     * Mengambil daftar berkas staging yang masih aktif (belum 24 jam) untuk user ini.
     * Mengembalikan data agar saat user refresh atau buka kembali halamannya, berkas tidak hilang!
     */
    public function getActiveStaging(Request $request): JsonResponse
    {
        $user = $request->user();

        $activeFiles = StagingFile::where('user_id', $user->id)
            ->active()
            ->get()
            ->map(function ($file) {
                $remainingSeconds = max(0, now()->diffInSeconds($file->expires_at, false));
                return [
                    'id' => $file->id,
                    'upload_id' => $file->upload_id,
                    'category' => $file->category,
                    'original_name' => $file->original_name,
                    'file_size_mb' => round($file->file_size_bytes / (1024 * 1024), 2),
                    'file_type' => $file->file_type,
                    'metadata' => $file->metadata,
                    'status' => $file->status,
                    'created_at' => $file->created_at->toIso8601String(),
                    'expires_at' => $file->expires_at->toIso8601String(),
                    'remaining_hours' => round($remainingSeconds / 3600, 1),
                ];
            });

        return response()->json([
            'status' => 'success',
            'active_staging_files' => $activeFiles,
        ]);
    }

    /**
     * 2. Transisi ke Database Utama saat tombol "Preprocessing" ditekan
     */
    public function processStagingToMainDb(Request $request): JsonResponse
    {
        $request->validate([
            'spatial_upload_id' => 'required|string',
            'dataset_name' => 'nullable|string',
        ]);

        $user = $request->user();
        $uploadId = $request->input('spatial_upload_id');

        // Validasi keberadaan file di staging database
        $staging = StagingFile::where('user_id', $user->id)
            ->where('upload_id', $uploadId)
            ->where('status', 'pending_preprocessing')
            ->first();

        if (! $staging) {
            return response()->json([
                'status' => 'error',
                'message' => 'Berkas staging tidak ditemukan atau statusnya sudah bukan pending.',
            ], 404);
        }

        if (now()->isAfter($staging->expires_at)) {
            $staging->update(['status' => 'expired']);
            return response()->json([
                'status' => 'error',
                'message' => 'Masa berlaku berkas di staging area telah melebihi 24 jam (Expired). Silakan unggah kembali.',
            ], 410);
        }

        // Tandai status sementara sedang diproses
        $staging->update(['status' => 'processing']);

        try {
            // Panggil endpoint preprocessing di FastAPI
            $response = Http::timeout(180)->post("{$this->aiServiceUrl}/api/v1/spatial/preprocess", [
                'upload_id' => $uploadId,
                'compute_indices' => ['NDVI', 'NDWI', 'SAVI'],
            ]);

            if ($response->failed()) {
                $staging->update(['status' => 'failed']);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Proses preprocessing di AI Engine gagal.',
                    'details' => $response->json() ?? $response->body(),
                ], 500);
            }

            $aiData = $response->json();
            $cleanFeatures = $aiData['clean_features'] ?? [];

            // SIMPAN PERMANEN KE DATABASE UTAMA
            $datasetName = $request->input('dataset_name') ?: "Dataset Preprocessed - {$staging->original_name}";
            $meta = $staging->metadata ?? [];

            $mainDataset = PreprocessedDataset::create([
                'user_id' => $user->id,
                'staging_file_id' => $staging->id,
                'dataset_name' => $datasetName,
                'category' => $staging->category,
                'spatial_resolution' => isset($meta['resolution_x']) ? "{$meta['resolution_x']}m" : '10m',
                'crs' => $meta['crs'] ?? 'EPSG:32647',
                'bounds' => $meta['wgs84_bounds'] ?? $meta['native_bounds'] ?? null,
                'clean_features' => $cleanFeatures,
                'status' => 'ready_for_split',
            ]);

            // UPDATE STATUS STAGING KE 'COMPLETED' (File fisik mentah telah dihapus oleh FastAPI)
            $staging->update([
                'status' => 'completed',
                'processed_at' => now(),
            ]);

            Log::info("Transisi Berhasil: Staging {$uploadId} dipindahkan permanen ke PreprocessedDataset ID: {$mainDataset->id}. Berkas mentah dihapus.");

            return response()->json([
                'status' => 'success',
                'message' => 'Preprocessing tuntas! Berkas mentah telah dihapus dari temp storage, dan hasil bersih telah disimpan permanen ke database utama.',
                'main_dataset' => $mainDataset,
            ], 200);

        } catch (\Exception $e) {
            $staging->update(['status' => 'failed']);
            Log::error("Error saat transisi staging ke DB utama: " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan sistem saat mengeksekusi preprocessing: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 3. Hapus Manual Berkas Staging jika dibatalkan oleh pengguna
     */
    public function purgeStaging(string $uploadId, Request $request): JsonResponse
    {
        $user = $request->user();

        $staging = StagingFile::where('user_id', $user->id)
            ->where('upload_id', $uploadId)
            ->first();

        try {
            Http::delete("{$this->aiServiceUrl}/api/v1/spatial/staging/{$uploadId}");

            if ($staging) {
                $staging->delete();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Berkas staging dan catatannya berhasil dihapus.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus berkas staging: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 4. Commit Permanen ke Database Utama setelah user ACC hasil Preprocessing
     *    dan menekan tombol Lanjut ke Tahap 3.
     */
    public function commitPreprocessed(Request $request): JsonResponse
    {
        $request->validate([
            'job_id' => 'required|string',
            'spatial_upload_id' => 'nullable|string',
            'non_spatial_upload_id' => 'nullable|string',
            'label_upload_id' => 'nullable|string',
            'dataset_name' => 'nullable|string',
            'crs' => 'nullable|string',
            'bounds' => 'nullable|array',
            'clean_features' => 'required|array',
        ]);

        $user = $request->user();
        $uploadIds = array_filter([
            $request->input('spatial_upload_id'),
            $request->input('non_spatial_upload_id'),
            $request->input('label_upload_id'),
        ]);

        $primaryStaging = null;
        if ($request->filled('spatial_upload_id')) {
            $primaryStaging = StagingFile::where('user_id', $user->id)
                ->where('upload_id', $request->input('spatial_upload_id'))
                ->first();
        }

        $mainDataset = PreprocessedDataset::create([
            'user_id' => $user->id,
            'staging_file_id' => $primaryStaging?->id,
            'dataset_name' => $request->input('dataset_name') ?: ('Dataset Preprocessed - ' . ($primaryStaging?->original_name ?? $request->input('job_id'))),
            'category' => 'raster',
            'spatial_resolution' => '10m',
            'crs' => $request->input('crs', 'EPSG:32647'),
            'bounds' => $request->input('bounds'),
            'clean_features' => $request->input('clean_features'),
            'status' => 'ready_for_feature_embedding',
        ]);

        if (! empty($uploadIds)) {
            StagingFile::where('user_id', $user->id)
                ->whereIn('upload_id', $uploadIds)
                ->update([
                    'status' => 'completed',
                    'processed_at' => now(),
                ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Data hasil preprocessing telah disimpan permanen ke database utama.',
            'main_dataset' => $mainDataset,
        ], 201);
    }
}
