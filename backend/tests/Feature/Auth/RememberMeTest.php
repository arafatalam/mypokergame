<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('a remembered sign-in is restored without a session cookie and revoked by sign-out', function (?float $rememberMinutes, int $expectedLifetimeSeconds): void {
    config([
        'sanctum.stateful' => ['localhost:8000'],
        'session.driver' => 'database',
    ]);
    if ($rememberMinutes !== null) {
        config(['auth.guards.web.remember' => $rememberMinutes]);
    }

    $this->freezeSecond();
    $this->withHeader('Origin', 'http://localhost:8000');
    $user = User::factory()->create();
    $rememberCookieName = Auth::guard('web')->getRecallerName();

    $signIn = $this->postJson('/api/v1/login', [
        'login' => $user->username,
        'password' => 'password',
        'remember' => true,
    ])->assertOk()->assertCookie($rememberCookieName);

    $rememberCookie = $signIn->getCookie($rememberCookieName, false);
    expect($rememberCookie->getExpiresTime() - now()->timestamp)->toBe($expectedLifetimeSeconds);

    Auth::forgetGuards();

    $this->withCredentials()
        ->withUnencryptedCookie($rememberCookieName, $rememberCookie->getValue())
        ->getJson('/api/v1/user')
        ->assertOk()
        ->assertJsonPath('id', $user->id)
        ->assertCookie(config('session.cookie'));

    Auth::forgetGuards();
    $this->postJson('/api/v1/logout')->assertOk();

    Auth::forgetGuards();
    $this->getJson('/api/v1/user')->assertUnauthorized();
})->with([
    '30-second trial' => [0.5, 30],
    'configured 30-day duration' => [null, 30 * 24 * 60 * 60],
]);
