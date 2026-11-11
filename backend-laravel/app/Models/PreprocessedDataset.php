<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreprocessedDataset extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'staging_file_id',
        'dataset_name',
        'category',
        'spatial_resolution',
        'crs',
        'bounds',
        'clean_features',
        'status',
    ];

    protected $casts = [
        'bounds' => 'array',
        'clean_features' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function stagingFile(): BelongsTo
    {
        return $this->belongsTo(StagingFile::class);
    }
}

