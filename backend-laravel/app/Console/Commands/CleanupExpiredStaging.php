<?php

namespace App\Console\Commands;

use App\Models\StagingFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CleanupExpiredStaging extends Command
{
    /**
     * Nama dan signature perintah Artisan.
     */
    protected $signature = 'staging:cleanup-expired {--hours=24 : Umur maksimum file dalam jam}';

    /**
     * Deskripsi perintah.
     */
    protected $description = 'Pembersihan berkala (Garbage Collection) berkas staging yang telah melewati batas TTL 24 jam';

    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $aiServiceUrl = env('FASTAPI_SERVICE_URL', 'http://127.0.0.1:8001');

        $this->info("Memulai Garbage Collection berkas staging (Batas TTL: {$hours} jam)...");

        // 1. Ambil semua berkas staging di DB yang statusnya masih pending dan sudah expired
        $expiredFiles = StagingFile::expired()->get();
        $cleanedDbCount = 0;

        foreach ($expiredFiles as $file) {
            $uploadId = $file->upload_id;

            try {
                // Hapus fisik folder di FastAPI
                Http::timeout(10)->delete("{$aiServiceUrl}/api/v1/spatial/staging/{$uploadId}");

                // Update status di database ke 'expired'
                $file->update(['status' => 'expired']);
                $cleanedDbCount++;

                $this->line(" - Berkas [{$file->original_name}] (Upload ID: {$uploadId}) ditandai expired dan dihapus dari server.");
            } catch (\Exception $e) {
                Log::warning("Gagal menghapus berkas staging fisik untuk {$uploadId}: " . $e->getMessage());
            }
        }

        // 2. Panggil sweeper di FastAPI untuk membersihkan folder tak bertuan (orphan)
        try {
            $response = Http::timeout(15)->post("{$aiServiceUrl}/api/v1/spatial/staging/cleanup-stale?max_age_hours={$hours}");
            $sweptCount = $response->json('diagnostics.active_staging_sessions') ?? 0;
            $this->info("Sweeper FastAPI selesai: {$response->json('message')}");
        } catch (\Exception $e) {
            $this->warn("Koneksi ke FastAPI sweeper gagal: " . $e->getMessage());
        }

        $this->info("Garbage collection selesai. Total {$cleanedDbCount} rekaman expired diperbarui.");
        Log::info("Garbage Collection Staging: {$cleanedDbCount} berkas kedaluwarsa dibersihkan.");

        return Command::SUCCESS;
    }
}

