<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('requires authentication to read game creation options', function (): void {
    $this->getJson('/api/v1/games/create-options')->assertUnauthorized();
});

it('returns the first game name to an admin', function (): void {
    $this->travelTo(today()->setDate(2026, 11, 11)->setTime(12, 0));

    $this->actingAs(User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]), 'web')
        ->getJson('/api/v1/games/create-options')
        ->assertOk()
        ->assertExactJson([
            'game_name' => '11_NOV_2026_1',
            'game_date' => '2026-11-11',
            'game_number' => 1,
            'default_min_buy_in' => 100,
            'default_max_buy_in' => 500,
        ]);
});
