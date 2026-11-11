<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Console Tasks (Cron Job)
|--------------------------------------------------------------------------
| Pembersihan otomatis berkas staging yang telah melebihi batas waktu TTL 24 jam.
| Dijalankan setiap jam secara otomatis.
*/
Schedule::command('staging:cleanup-expired --hours=24')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();
