<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

// Send React's entry page for the frontend's three current URLs.
Route::get('/{page?}', function (): BinaryFileResponse {
    $htmlPath = public_path('app/index.html');

    return response()->file($htmlPath);
})
    ->where('page', 'sign-in|home')
    ->name('frontend');
