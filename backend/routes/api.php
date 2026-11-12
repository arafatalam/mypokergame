<?php

use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\BuyInController;
use App\Http\Controllers\CashoutController;
use App\Http\Controllers\CloseGameController;
use App\Http\Controllers\GameSessionController;
use App\Http\Controllers\GameTotalsController;
use App\Http\Controllers\HomeSummaryController;
use App\Http\Controllers\HouseIncomeController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\OutstandingBalancesController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RecordCorrectionController;
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

    Route::get('/leaderboard', LeaderboardController::class)
        ->can('viewAny', GameSession::class)
        ->name('api.v1.leaderboard.index');

    Route::get('/house-income', HouseIncomeController::class)
        ->can('viewAny', GameSession::class)
        ->name('api.v1.house-income.index');

    Route::get('/home/summary', HomeSummaryController::class)
        ->can('viewAny', GameSession::class)
        ->name('api.v1.home.summary');

    Route::get('/outstanding-balances', OutstandingBalancesController::class)
        ->can('viewAny', GameSession::class)
        ->name('api.v1.outstanding-balances.index');

    Route::get('/games/create-options', [GameSessionController::class, 'createOptions'])
        ->can('create', GameSession::class)
        ->name('api.v1.games.create-options');

    Route::get('/games', [GameSessionController::class, 'index'])
        ->can('viewAny', GameSession::class)
        ->name('api.v1.games.index');

    Route::get('/games/{game}', [GameSessionController::class, 'show'])
        ->whereNumber('game')
        ->can('viewAny', GameSession::class)
        ->name('api.v1.games.show');

    Route::post('/games', [GameSessionController::class, 'store'])
        ->can('create', GameSession::class)
        ->name('api.v1.games.store');

    // Authorize both reading the private options and recording a buy-in.
    Route::get('/games/buy-in-options', [BuyInController::class, 'options'])
        ->can('recordBuyIn', GameSession::class)
        ->name('api.v1.games.buy-in-options');

    Route::post('/buy-ins', [BuyInController::class, 'store'])
        ->can('recordBuyIn', GameSession::class)
        ->name('api.v1.buy-ins.store');

    Route::get('/games/cashout-options', [CashoutController::class, 'options'])
        ->can('recordCashout', GameSession::class)
        ->name('api.v1.games.cashout-options');

    Route::post('/cashouts', [CashoutController::class, 'store'])
        ->can('recordCashout', GameSession::class)
        ->name('api.v1.cashouts.store');

    Route::get('/games/totals-options', [GameTotalsController::class, 'options'])
        ->can('recordTotals', GameSession::class)
        ->name('api.v1.games.totals-options');

    Route::get('/games/{game}/totals', [GameTotalsController::class, 'show'])
        ->whereNumber('game')
        ->can('recordTotals', GameSession::class)
        ->name('api.v1.games.totals.show');

    Route::patch('/games/{game}/totals', [GameTotalsController::class, 'update'])
        ->whereNumber('game')
        ->can('recordTotals', GameSession::class)
        ->name('api.v1.games.totals.update');

    Route::get('/games/close-options', [CloseGameController::class, 'options'])
        ->can('close', GameSession::class)
        ->name('api.v1.games.close-options');

    Route::get('/games/{game}/close', [CloseGameController::class, 'show'])
        ->whereNumber('game')
        ->can('close', GameSession::class)
        ->name('api.v1.games.close.show');

    Route::post('/games/{game}/close', [CloseGameController::class, 'store'])
        ->whereNumber('game')
        ->can('close', GameSession::class)
        ->name('api.v1.games.close.store');

    Route::get('/corrections', [RecordCorrectionController::class, 'history'])
        ->can('recordTotals', GameSession::class)
        ->name('api.v1.corrections.index');

    Route::patch('/games/{game}/totals/correction', [RecordCorrectionController::class, 'gameTotals'])
        ->whereNumber('game')
        ->can('recordTotals', GameSession::class)
        ->name('api.v1.games.totals.correction');

    Route::get('/cashouts/{cashout}/correction', [RecordCorrectionController::class, 'showCashout'])
        ->whereNumber('cashout')
        ->can('recordCashout', GameSession::class)
        ->name('api.v1.cashouts.correction.show');

    Route::patch('/cashouts/{cashout}/correction', [RecordCorrectionController::class, 'cashout'])
        ->whereNumber('cashout')
        ->can('recordCashout', GameSession::class)
        ->name('api.v1.cashouts.correction.update');

    Route::patch('/payments/{payment}/correction', [RecordCorrectionController::class, 'payment'])
        ->whereNumber('payment')
        ->can('recordPayment', User::class)
        ->name('api.v1.payments.correction');

    Route::get('/payments', [PaymentController::class, 'index'])
        ->can('recordPayment', User::class)
        ->name('api.v1.payments.index');

    Route::get('/payments/options', [PaymentController::class, 'options'])
        ->can('recordPayment', User::class)
        ->name('api.v1.payments.options');

    Route::post('/payments', [PaymentController::class, 'store'])
        ->can('recordPayment', User::class)
        ->name('api.v1.payments.store');

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

        Route::get('/{user}/game-history', [UserController::class, 'gameHistory'])
            ->whereNumber('user')
            ->can('viewGameHistory', 'user')
            ->name('game-history');

        Route::get('/{user}/player-tab', [UserController::class, 'playerTab'])
            ->whereNumber('user')
            ->can('viewAny', User::class)
            ->can('view', 'user')
            ->name('player-tab');

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
