<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('staging_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('upload_id')->unique()->index();
            $table->string('category'); // 'spatial' | 'nonSpatial' | 'label'
            $table->string('original_name');
            $table->string('file_path');
            $table->bigInteger('file_size_bytes');
            $table->string('file_type');
            $table->json('metadata')->nullable();
            
            // Status: pending_preprocessing, processing, completed, expired, failed
            $table->string('status')->default('pending_preprocessing')->index();
            
            // Batas waktu TTL 24 jam sejak berkas diunggah
            $table->timestamp('expires_at')->index();
            
            // Timestamp ketika berkas berhasil ditransisikan ke DB utama
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staging_files');
    }
};

