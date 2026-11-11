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
        Schema::create('preprocessed_datasets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staging_file_id')->nullable()->constrained('staging_files')->nullOnDelete();
            $table->string('dataset_name');
            $table->string('category');
            $table->string('spatial_resolution')->nullable();
            $table->string('crs')->nullable();
            $table->json('bounds')->nullable();
            
            // Fitur hasil ekstraksi bersih (NDVI, NDWI, SAVI, raster statistics)
            $table->json('clean_features');
            
            // Status dataset di database utama: 'ready_for_split', 'embedded', 'trained'
            $table->string('status')->default('ready_for_split');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('preprocessed_datasets');
    }
};

