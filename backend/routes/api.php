<?php

use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserPhotoController;
use App\Models\User;
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

// Check permission before returning account-creation choices.
Route::get('/users/create-options', [UserController::class, 'createOptions'])
    ->middleware('auth:sanctum')
    ->can('create', User::class)
    ->name('api.v1.users.create-options');

// Check sign-in and creation permission before validating account details.
Route::post('/users', [UserController::class, 'store'])
    ->middleware('auth:sanctum')
    ->can('create', User::class)
    ->name('api.v1.users.store');

// Authorize the account before looking up its private photo or saved avatar.
Route::get('/users/{user}/photo', UserPhotoController::class)
    ->whereNumber('user')
    ->middleware('auth:sanctum')
    ->can('view', 'user')
    ->name('api.v1.users.photo');
