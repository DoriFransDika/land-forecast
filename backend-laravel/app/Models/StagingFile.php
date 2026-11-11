<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StagingFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'upload_id',
        'category',
        'original_name',
        'file_path',
        'file_size_bytes',
        'file_type',
        'metadata',
        'status',
        'expires_at',
        'processed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'processed_at' => 'datetime',
        'file_size_bytes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function preprocessedDataset(): HasOne
    {
        return $this->hasOne(PreprocessedDataset::class);
    }

    /**
     * Scope untuk mengambil berkas staging yang masih aktif (belum expired & pending)
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'pending_preprocessing')
            ->where('expires_at', '>', now());
    }

    /**
     * Scope untuk mengambil berkas staging yang sudah melewati batas waktu 24 jam
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'pending_preprocessing')
            ->where('expires_at', '<=', now());
    }
}

