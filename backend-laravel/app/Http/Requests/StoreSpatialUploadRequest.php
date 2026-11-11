<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

class StoreSpatialUploadRequest extends FormRequest
{
    /**
     * Batas ukuran maksimum: 2GB dalam Kilobytes (2 * 1024 * 1024)
     */
    public const MAX_FILE_SIZE_KB = 2097152;

    /**
     * Peta ekstensi yang diizinkan per kategori dataset
     */
    public const ALLOWED_EXTENSIONS = [
        'raster' => ['tif', 'tiff', 'jp2'],
        'vector' => ['zip', 'shp', 'dbf', 'shx', 'prj'],
        'tabular' => ['csv'],
    ];

    /**
     * Komponen wajib jika mengunggah Shapefile tanpa kompresi .zip
     */
    public const REQUIRED_SHP_COMPONENTS = ['shp', 'dbf', 'shx', 'prj'];

    public function authorize(): bool
    {
        // Hanya user terautentikasi (Admin / Peneliti) yang diizinkan mengunggah
        return $this->user() !== null;
    }

    /**
     * Normalisasi nama kategori agar kompatibel dengan alias UI ('spatial', 'nonSpatial', 'label')
     */
    protected function prepareForValidation(): void
    {
        $categoryMap = [
            'spatial' => 'raster',
            'raster' => 'raster',
            'label' => 'vector',
            'vector' => 'vector',
            'nonspatial' => 'tabular',
            'tabular' => 'tabular',
        ];

        $rawCategory = strtolower((string) $this->input('category', ''));
        if (isset($categoryMap[$rawCategory])) {
            $this->merge(['normalized_category' => $categoryMap[$rawCategory]]);
        }
    }

    public function rules(): array
    {
        return [
            'category' => ['required', 'string', 'in:raster,vector,tabular,spatial,nonSpatial,label'],
            'normalized_category' => ['required', 'string', 'in:raster,vector,tabular'],

            // Mendukung single file ('file') maupun multiple files ('files.*') untuk komponen SHP bersamaan
            'file' => ['required_without:files', 'file', 'max:' . self::MAX_FILE_SIZE_KB],
            'files' => ['required_without:file', 'array', 'min:1', 'max:10'],
            'files.*' => ['file', 'max:' . self::MAX_FILE_SIZE_KB],
        ];
    }

    /**
     * Validasi lanjutan per kategori (Raster, Vektor ZIP/SHP Komponen, Tabular CSV)
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $category = $this->input('normalized_category');
            $uploadedFiles = $this->collectUploadedFiles();

            if (empty($uploadedFiles)) {
                $validator->errors()->add('file', 'Minimal satu berkas wajib diunggah.');
                return;
            }

            $allowedExts = self::ALLOWED_EXTENSIONS[$category] ?? [];
            $receivedExts = [];

            foreach ($uploadedFiles as $index => $file) {
                $ext = strtolower($file->getClientOriginalExtension());
                $originalName = $this->sanitizeFilename($file->getClientOriginalName());

                if (! in_array($ext, $allowedExts, true)) {
                    $expectedList = implode(', ', array_map(fn ($e) => ".{$e}", $allowedExts));
                    $validator->errors()->add(
                        'file',
                        "Berkas '{$originalName}' ditolak. Kategori {$category} hanya menerima format: {$expectedList}."
                    );
                    return;
                }

                $receivedExts[] = $ext;
            }

            // Aturan Khusus Kategori 1: Raster (.tif, .tiff, .jp2) - hanya 1 berkas per unggahan atau validasi ekstensi
            if ($category === 'raster' && count($uploadedFiles) > 1) {
                // Diperbolehkan jika mengunggah multi-band sekaligus, seluruhnya sudah tervalidasi .tif/.tiff/.jp2
            }

            // Aturan Khusus Kategori 2: Vektor (.zip ATAU komponen lengkap .shp, .dbf, .shx, .prj)
            if ($category === 'vector') {
                $hasZip = in_array('zip', $receivedExts, true);

                if ($hasZip && count($uploadedFiles) > 1) {
                    $validator->errors()->add(
                        'files',
                        'Unggah arsip .zip secara tunggal, atau unggah komponen Shapefile (.shp, .dbf, .shx, .prj) tanpa .zip.'
                    );
                    return;
                }

                if (! $hasZip) {
                    $missingComponents = array_diff(self::REQUIRED_SHP_COMPONENTS, $receivedExts);
                    if (! empty($missingComponents)) {
                        $missingStr = implode(', ', array_map(fn ($e) => ".{$e}", $missingComponents));
                        $validator->errors()->add(
                            'files',
                            "Komponen Shapefile tidak lengkap! Jika tidak menggunakan arsip .zip, Anda wajib menyertakan: {$missingStr}."
                        );
                        return;
                    }
                }
            }

            // Aturan Khusus Kategori 3: Tabular (Terkunci HANYA .csv)
            if ($category === 'tabular' && count($uploadedFiles) > 1) {
                $validator->errors()->add(
                    'files',
                    'Data tabular hanya memperbolehkan 1 berkas .csv per proses unggah.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'category.required' => 'Kategori dataset wajib ditentukan (raster, vector, atau tabular).',
            'category.in' => 'Kategori dataset tidak valid.',
            'file.required_without' => 'Berkas wajib diunggah.',
            'file.max' => 'Ukuran berkas melebihi batas maksimum 2GB.',
            'files.required_without' => 'Berkas wajib diunggah.',
            'files.*.max' => 'Salah satu komponen berkas melebihi batas maksimum 2GB.',
        ];
    }

    /**
     * Mengumpulkan semua file baik dari field `file` tunggal maupun array `files[]`
     *
     * @return UploadedFile[]
     */
    public function collectUploadedFiles(): array
    {
        $files = [];
        if ($this->hasFile('file')) {
            $files[] = $this->file('file');
        }
        if ($this->hasFile('files')) {
            foreach ($this->file('files') as $f) {
                if ($f instanceof UploadedFile) {
                    $files[] = $f;
                }
            }
        }
        return $files;
    }

    /**
     * Mengembalikan daftar berkas beserta nama file yang telah disanitasi (Safe Filename)
     *
     * @return array<int, array{file: UploadedFile, safe_name: string, ext: string}>
     */
    public function sanitizedFiles(): array
    {
        return array_map(function (UploadedFile $file) {
            $safeName = $this->sanitizeFilename($file->getClientOriginalName());
            return [
                'file' => $file,
                'safe_name' => $safeName,
                'ext' => strtolower($file->getClientOriginalExtension()),
            ];
        }, $this->collectUploadedFiles());
    }

    /**
     * Sanitasi Nama File (Path Traversal & Command Injection Defense):
     * - Menghapus prefix direktori (../, ..\, /, C:\)
     * - Menghilangkan null bytes dan karakter kontrol
     * - Menjaga hanya karakter alfanumerik, titik, strip, dan underscore
     * - Menghindari rangkaian titik ganda (..)
     */
    public function sanitizeFilename(string $rawFilename): string
    {
        // 1. Hapus null bytes & ambil basename murni
        $clean = str_replace("\0", '', $rawFilename);
        $base = basename(str_replace('\\', '/', $clean));

        // 2. Pisahkan nama dasar dan ekstensi
        $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
        $name = pathinfo($base, PATHINFO_FILENAME);

        // 3. Hapus semua rangkaian '..' dan ganti karakter non-safe menjadi '_'
        $name = str_replace('..', '_', $name);
        $name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $name) ?? 'dataset';
        $name = trim($name, '_');

        if ($name === '') {
            $name = 'spatial_file_' . time();
        }

        // Batasi panjang nama file agar aman di sistem berkas Windows/Linux
        $name = substr($name, 0, 120);

        return $ext !== '' ? "{$name}.{$ext}" : $name;
    }
}

