<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('returns signed player totals and closed-game income for the current room month', function (): void {
    config(['payments.timezone' => 'America/Moncton']);
    $this->travelTo(now('UTC')->setDate(2026, 12, 1)->setTime(2, 0));
    $manager = User::factory()->create(['role' => RoleCode::MANAGER, 'poker_balance' => 999, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -80]);
    $debtor = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -20, 'is_active' => false]);
    $payee = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 45, 'is_active' => false]);
    User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 0]);

    $gameId = null;
    foreach ([
        ['2026-11-30', 'closed'],
        ['2026-11-01', 'closed'],
        ['2026-11-15', 'open'],
        ['2026-10-31', 'closed'],
        ['2026-12-01', 'closed'],
    ] as [$date, $status]) {
        $id = DB::table('game_sessions')->insertGetId([
            'game_date' => $date,
            'game_name' => $date,
            'game_number' => 1,
            'status' => $status,
            'min_buy_in' => 100,
            'max_buy_in' => 500,
            'dealer_tips' => 10,
            'game_costs' => 5,
            'created_by' => $manager->id,
            'closed_at' => $status === 'closed' ? '2026-12-01 01:00:00' : null,
        ]);
        if ($date === '2026-11-30') {
            $gameId = $id;
        }
    }

    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $gameId,
        'player_id' => $player->id,
        'opened_at' => now(),
    ]);
    DB::table('buy_ins')->insert([
        'player_game_visit_id' => $visit,
        'created_by' => $manager->id,
        'cash' => 100,
        'credit' => 50,
        'balance_after' => -80,
        'request_id' => Str::uuid()->toString(),
        'created_at' => now(),
    ]);
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $visit,
        'created_by' => $manager->id,
        'ending_chips' => 60,
        'cash_paid' => 20,
        'balance_after' => -80,
        'created_at' => now(),
    ]);

    $this->actingAs($manager)->getJson('/api/v1/home/summary')->assertOk()->assertExactJson([
        'toCollect' => [
            'total' => 100,
            'count' => 2,
            'players' => [
                ['id' => $player->id, 'name' => $player->first_name.' '.$player->last_name, 'amount' => 80],
                ['id' => $debtor->id, 'name' => $debtor->first_name.' '.$debtor->last_name, 'amount' => 20],
            ],
        ],
        'toPay' => [
            'total' => 45,
            'count' => 1,
            'players' => [
                ['id' => $payee->id, 'name' => $payee->first_name.' '.$payee->last_name, 'amount' => 45],
            ],
        ],
        'income' => ['total' => 60, 'count' => 2, 'month' => 'November'],
        'leaderboard' => [
            ['id' => $player->id, 'name' => $player->first_name.' '.$player->last_name, 'winnings' => -90, 'rank' => 1],
        ],
    ]);
});

it('returns zero amounts and counts for an empty room', function (): void {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);

    $this->actingAs($admin)->getJson('/api/v1/home/summary')->assertOk()->assertExactJson([
        'toCollect' => ['total' => 0, 'count' => 0, 'players' => []],
        'toPay' => ['total' => 0, 'count' => 0, 'players' => []],
        'income' => ['total' => 0, 'count' => 0, 'month' => now(config('payments.timezone'))->format('F')],
        'leaderboard' => [],
    ]);
});

it('shows the five largest balances in each direction and counts every matching player', function (): void {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);

    foreach ([70, 10, 40, 20, 90, 30] as $amount) {
        User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -$amount]);
        User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => $amount]);
    }

    $this->actingAs($admin)->getJson('/api/v1/home/summary')->assertOk()
        ->assertJsonPath('toCollect.count', 6)
        ->assertJsonPath('toPay.count', 6)
        ->assertJsonPath('toCollect.players.*.amount', [90, 70, 40, 30, 20])
        ->assertJsonPath('toPay.players.*.amount', [90, 70, 40, 30, 20]);
});

it('limits home summaries to staff', function (RoleCode $role, int $status): void {
    $actor = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);

    $this->actingAs($actor)->getJson('/api/v1/home/summary')->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, 200],
    [RoleCode::ADMIN, 200],
    [RoleCode::MANAGER, 200],
    [RoleCode::PLAYER, 403],
]);

it('requires sign-in for home summaries', function (): void {
    $this->getJson('/api/v1/home/summary')->assertUnauthorized();
});
