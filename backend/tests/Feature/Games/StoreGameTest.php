<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    $this->travelTo(today()->setDate(2026, 11, 11)->setTime(12, 0));
});

it('saves house limits and offers the next number for that date', function (): void {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);

    $this->actingAs($admin)->postJson('/api/v1/games', [
        'game_name' => '11_NOV_2026_1',
        'use_custom_limits' => false,
        'min_buy_in' => 200,
        'max_buy_in' => 400,
    ])->assertCreated()->assertJsonPath('game_name', '11_NOV_2026_1');

    $this->assertDatabaseHas('game_sessions', [
        'game_date' => '2026-11-11',
        'game_number' => 1,
        'game_name' => '11_NOV_2026_1',
        'created_by' => $admin->id,
        'status' => 'open',
        'min_buy_in' => 100,
        'max_buy_in' => 400,
    ]);

    $this->getJson('/api/v1/games/create-options')->assertOk()->assertJsonPath('game_number', 2);
    $this->postJson('/api/v1/games', [
        'game_name' => '11_NOV_2026_1',
        'use_custom_limits' => false,
    ])->assertUnprocessable()->assertJsonValidationErrors('game_name');
    $this->assertDatabaseCount('game_sessions', 1);

    $this->travel(1)->day();
    $this->getJson('/api/v1/games/create-options')->assertOk()->assertJsonPath('game_name', '12_NOV_2026_1');
});

it('checks custom limits and saves equal amounts', function (): void {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $details = ['game_name' => '11_NOV_2026_1', 'use_custom_limits' => true, 'min_buy_in' => 200];

    $this->actingAs($admin)->postJson('/api/v1/games', $details + ['max_buy_in' => 199])
        ->assertUnprocessable()->assertJsonValidationErrors('max_buy_in');
    $this->assertDatabaseCount('game_sessions', 0);

    $this->postJson('/api/v1/games', $details + ['max_buy_in' => 200])->assertCreated();
    $this->assertDatabaseHas('game_sessions', ['min_buy_in' => 200, 'max_buy_in' => 200]);
});

it('rejects unauthenticated callers and players', function (): void {
    $this->postJson('/api/v1/games')->assertUnauthorized();
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($player)->getJson('/api/v1/games/create-options')->assertForbidden();
    $this->postJson('/api/v1/games')->assertForbidden();
    $this->assertDatabaseCount('game_sessions', 0);
});

it('allows each approved role to preview and save a game', function (RoleCode $role): void {
    $user = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);

    $this->actingAs($user)->getJson('/api/v1/games/create-options')
        ->assertOk()
        ->assertJsonPath('game_name', '11_NOV_2026_1');

    $this->postJson('/api/v1/games', [
        'game_name' => '11_NOV_2026_1',
        'use_custom_limits' => false,
    ])->assertCreated();

    $this->assertDatabaseHas('game_sessions', ['created_by' => $user->id]);
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);
