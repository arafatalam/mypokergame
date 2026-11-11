<?php

use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\GameSessionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserPasswordController;
use App\Http\Controllers\UserPhotoController;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [SessionController::class, 'store'])
    ->name('api.v1.login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [SessionController::class, 'destroy'])
        ->name('api.v1.logout');

    Route::get('/games/create-options', [GameSessionController::class, 'createOptions'])
        ->can('create', GameSession::class)
        ->name('api.v1.games.create-options');

    Route::post('/games', [GameSessionController::class, 'store'])
        ->can('create', GameSession::class)
        ->name('api.v1.games.store');

    Route::prefix('users')->name('api.v1.users.')->group(function (): void {
        // Check list permission before the controller retrieves accounts.
        Route::get('/', [UserController::class, 'index'])
            ->can('viewAny', User::class)
            ->name('index');

        // Check permission before returning account-creation choices.
        Route::get('/create-options', [UserController::class, 'createOptions'])
            ->can('create', User::class)
            ->name('create-options');

        // Check creation permission before validating account details.
        Route::post('/', [UserController::class, 'store'])
            ->can('create', User::class)
            ->name('store');

        // Check whether the signed-in person may view this account.
        Route::get('/{user}', [UserController::class, 'show'])
            ->whereNumber('user')
            ->can('view', 'user')
            ->name('show');

        Route::patch('/{user}', [UserController::class, 'update'])
            ->whereNumber('user')
            ->name('update');

        Route::patch('/{user}/password', UserPasswordController::class)
            ->whereNumber('user')
            ->name('password.update');

        // Authorize the account before looking up its private photo or saved avatar.
        Route::get('/{user}/photo', UserPhotoController::class)
            ->whereNumber('user')
            ->can('view', 'user')
            ->name('photo');

        Route::post('/{user}/photo', [UserPhotoController::class, 'replace'])
            ->whereNumber('user')
            ->can('updatePhoto', 'user')
            ->name('photo.replace');

        Route::delete('/{user}/photo', [UserPhotoController::class, 'remove'])
            ->whereNumber('user')
            ->can('updatePhoto', 'user')
            ->name('photo.remove');
    });
});
