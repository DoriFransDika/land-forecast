<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SpatialUploadController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Sanctum Authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Auth & User Profile
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Staging Lifecycle (TTL 24 Jam & Quota Protection)
    Route::post('/spatial/upload', [SpatialUploadController::class, 'upload']);
    Route::get('/spatial/staging-active', [SpatialUploadController::class, 'getActiveStaging']);
    Route::post('/spatial/preprocess', [SpatialUploadController::class, 'processStagingToMainDb']);
    Route::post('/spatial/commit-preprocessed', [SpatialUploadController::class, 'commitPreprocessed']);
    Route::delete('/spatial/staging/{uploadId}', [SpatialUploadController::class, 'purgeStaging']);
});
