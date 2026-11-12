<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function makeIncomeGame(User $staff, string $date, string $status, int $tips = 0, int $costs = 0): int
{
    return DB::table('game_sessions')->insertGetId([
        'game_date' => $date,
        'game_name' => $date,
        'game_number' => 1,
        'status' => $status,
        'closed_at' => $status === 'closed' ? '2026-11-01 01:00:00' : null,
        'min_buy_in' => 100,
        'max_buy_in' => 500,
        'created_by' => $staff->id,
        'dealer_tips' => $tips,
        'game_costs' => $costs,
    ]);
}

it('lists closed game income by game month using the same totals as Home', function (): void {
    $this->travelTo(now()->setDate(2026, 11, 12)->setTime(12, 0));
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create();
    $game = makeIncomeGame($staff, '2026-10-31', 'closed', 50, 75);
    makeIncomeGame($staff, '2026-10-20', 'closed');
    makeIncomeGame($staff, '2026-11-01', 'closed', 5, 10);
    makeIncomeGame($staff, '2026-11-02', 'open', 500, 500);
    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game, 'player_id' => $player->id, 'opened_at' => now(),
    ]);

    for ($purchase = 0; $purchase < 2; $purchase++) {
        DB::table('buy_ins')->insert([
            'player_game_visit_id' => $visit, 'created_by' => $staff->id,
            'cash' => 400, 'credit' => 100, 'balance_after' => -100,
            'request_id' => Str::uuid()->toString(), 'created_at' => now(),
        ]);
    }
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id,
        'ending_chips' => 900, 'cash_paid' => 500, 'balance_after' => 200, 'created_at' => now(),
    ]);

    $this->actingAs($staff);
    $this->getJson('/api/v1/house-income')->assertOk()->assertJsonPath('data', [
        ['month' => '2026-11', 'closedGames' => 1, 'income' => -15],
        ['month' => '2026-10', 'closedGames' => 2, 'income' => -25],
    ]);
    $this->getJson('/api/v1/home/summary')->assertOk()->assertJsonPath('income.total', -15);
    $this->getJson('/api/v1/house-income?from_month=2026-10&to_month=2026-10')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.month', '2026-10');
    $this->getJson('/api/v1/house-income?from_month=2026-11')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.month', '2026-11');
    $this->getJson('/api/v1/house-income?to_month=2026-10')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.month', '2026-10');
    $this->getJson('/api/v1/house-income?from_month=2026-09&to_month=2026-09')
        ->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/house-income?from_month=2026-11&to_month=2026-10')
        ->assertUnprocessable()->assertJsonValidationErrors('to_month');
    $this->getJson('/api/v1/house-income?to_month=2027-01')
        ->assertUnprocessable()->assertJsonValidationErrors('to_month');
});

it('paginates ten months and protects the report with staff permissions', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    foreach (range(1, 11) as $month) {
        makeIncomeGame($staff, sprintf('2025-%02d-01', $month), 'closed');
    }

    $this->getJson('/api/v1/house-income')->assertUnauthorized();
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($player)->getJson('/api/v1/house-income')->assertForbidden();
    $this->actingAs($staff)->getJson('/api/v1/house-income')
        ->assertOk()->assertJsonCount(10, 'data')->assertJsonPath('meta.total', 11)->assertJsonPath('data.0.month', '2025-11');
    $this->getJson('/api/v1/house-income?page=2')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.month', '2025-01');
});
