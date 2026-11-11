<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Akun Administrator Spasial
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Administrator Spasial',
                'role' => 'Admin',
                'password' => Hash::make('admin123'),
            ]
        );

        // 2. Akun Peneliti Ahli GIS
        User::updateOrCreate(
            ['email' => 'peneliti@gmail.com'],
            [
                'name' => 'Peneliti Ahli GIS',
                'role' => 'Peneliti',
                'password' => Hash::make('peneliti123'),
            ]
        );
    }
}
