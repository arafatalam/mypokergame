<?php

use App\Http\Controllers\Auth\SessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [SessionController::class, 'store'])
    ->name('api.v1.login');

Route::post('/logout', [SessionController::class, 'destroy'])
    ->middleware('auth:sanctum')
    ->name('api.v1.logout');
