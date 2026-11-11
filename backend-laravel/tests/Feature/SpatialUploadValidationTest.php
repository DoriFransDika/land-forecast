<?php

namespace Tests\Feature;

use App\Http\Requests\StoreSpatialUploadRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SpatialUploadValidationTest extends TestCase
{
    use RefreshDatabase;

    private function createAuthenticatedUser(): User
    {
        return User::factory()->create([
            'role' => 'Peneliti',
        ]);
    }

    public function test_sanitize_filename_prevents_path_traversal(): void
    {
        $request = new StoreSpatialUploadRequest();

        $this->assertEquals('passwd.tif', $request->sanitizeFilename('../../../../etc/passwd.tif'));
        $this->assertEquals('cmd.shp', $request->sanitizeFilename('..\\..\\windows\\system32\\cmd.shp'));
        $this->assertEquals('Sentinel2_2025_B02.jp2', $request->sanitizeFilename('Sentinel2 2025@B02!.JP2'));
        $this->assertEquals('safe_file.csv', $request->sanitizeFilename("safe\0..file.csv"));
    }

    public function test_raster_accepts_sentinel2_jp2_and_tif(): void
    {
        Http::fake([
            '*/api/v1/spatial/upload-staging' => Http::response([
                'status' => 'success',
                'upload_id' => 'uuid-jp2-123',
                'metadata' => ['type' => 'Raster Sentinel-2 JP2'],
            ], 200),
        ]);

        $user = $this->createAuthenticatedUser();
        $jp2File = UploadedFile::fake()->create('T47MPV_B02_10m.jp2', 500);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/spatial/upload', [
                'category' => 'raster',
                'file' => $jp2File,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('staging_data.file_type', 'jp2')
            ->assertJsonPath('staging_data.original_name', 'T47MPV_B02_10m.jp2');
    }

    public function test_raster_rejects_invalid_extension_like_png(): void
    {
        $user = $this->createAuthenticatedUser();
        $badFile = UploadedFile::fake()->create('photo.png', 100);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/spatial/upload', [
                'category' => 'raster',
                'file' => $badFile,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_vector_accepts_simultaneous_shapefile_components(): void
    {
        Http::fake([
            '*/api/v1/spatial/upload-staging-batch' => Http::response([
                'status' => 'success',
                'upload_id' => 'uuid-shp-bundle-456',
                'metadata' => ['type' => 'Vector Shapefile', 'total_features' => 42],
            ], 200),
        ]);

        $user = $this->createAuthenticatedUser();

        $shp = UploadedFile::fake()->create('BATAS_ADMIN.shp', 120);
        $dbf = UploadedFile::fake()->create('BATAS_ADMIN.dbf', 80);
        $shx = UploadedFile::fake()->create('BATAS_ADMIN.shx', 20);
        $prj = UploadedFile::fake()->create('BATAS_ADMIN.prj', 5);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/spatial/upload', [
                'category' => 'vector',
                'files' => [$shp, $dbf, $shx, $prj],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('staging_data.file_type', 'shp_bundle')
            ->assertJsonPath('staging_data.original_name', 'BATAS_ADMIN.shp');
    }

    public function test_vector_rejects_incomplete_shapefile_components(): void
    {
        $user = $this->createAuthenticatedUser();

        $shp = UploadedFile::fake()->create('batas.shp', 50);
        $dbf = UploadedFile::fake()->create('batas.dbf', 50);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/spatial/upload', [
                'category' => 'vector',
                'files' => [$shp, $dbf],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files']);
    }

    public function test_tabular_rejects_non_csv_files(): void
    {
        $user = $this->createAuthenticatedUser();
        $excelFile = UploadedFile::fake()->create('penduduk.xlsx', 100);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/spatial/upload', [
                'category' => 'tabular',
                'file' => $excelFile,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }
}
