<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('ranks closed game participants across pages and filters by game month', function (): void {
    $this->travelTo(now()->setDate(2026, 11, 12));
    $manager = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $game = function (string $date, string $status) use ($manager): int {
        return DB::table('game_sessions')->insertGetId([
            'game_date' => $date,
            'game_name' => $date,
            'game_number' => 1,
            'status' => $status,
            'closed_at' => $status === 'closed' ? '2026-11-01 01:00:00' : null,
            'min_buy_in' => 100,
            'max_buy_in' => 500,
            'created_by' => $manager->id,
        ]);
    };
    $october = $game('2026-10-31', 'closed');
    $november = $game('2026-11-30', 'closed');
    $open = $game('2026-11-12', 'open');
    $visit = function (User $player, int $gameId, int $winnings) use ($manager): void {
        $id = DB::table('player_game_visits')->insertGetId([
            'game_session_id' => $gameId,
            'player_id' => $player->id,
            'opened_at' => now(),
        ]);
        foreach ([[60, 20], [0, 20]] as [$cash, $credit]) {
            DB::table('buy_ins')->insert([
                'player_game_visit_id' => $id,
                'created_by' => $manager->id,
                'cash' => $cash,
                'credit' => $credit,
                'balance_after' => 0,
                'request_id' => Str::uuid()->toString(),
                'created_at' => now(),
            ]);
        }
        DB::table('cashouts')->insert([
            'player_game_visit_id' => $id,
            'created_by' => $manager->id,
            'ending_chips' => 100 + $winnings,
            'cash_paid' => 5,
            'balance_after' => 0,
            'created_at' => now(),
        ]);
    };

    foreach ([350, 340, 330, 320, 310, 300, 200, 100, 50] as $total) {
        $visit(User::factory()->create(['role' => RoleCode::PLAYER]), $november, $total);
    }
    $patel = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Patel']);
    $chen = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Chen', 'is_active' => false]);
    $jordan = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Jordan', 'last_name' => 'Aardvark']);
    $visit($patel, $november, 0);
    $visit($chen, $november, 20);
    $visit($chen, $november, -20);
    $visit($jordan, $november, 0);
    $octoberOnly = User::factory()->create(['role' => RoleCode::PLAYER]);
    $visit($octoberOnly, $october, 90);
    $visit($chen, $october, -75);
    $visit($octoberOnly, $open, 500);
    $loss = User::factory()->create(['role' => RoleCode::PLAYER]);
    $visit($loss, $november, -50);
    $visit(User::factory()->create(['role' => RoleCode::PLAYER]), $open, 800);

    $url = '/api/v1/leaderboard';
    $this->actingAs($manager)->getJson($url)->assertOk()
        ->assertJsonPath('meta.total', 14)
        ->assertJsonPath('data.*.winnings', [350, 340, 330, 320, 310, 300, 200, 100, 90, 50]);
    $this->getJson($url.'?from_month=2026-11&to_month=2026-11')->assertOk()
        ->assertJsonPath('meta.total', 13)
        ->assertJsonPath('data.9.id', $chen->id)
        ->assertJsonPath('data.9.winnings', 0)
        ->assertJsonPath('data.9.rank', 10);
    $this->getJson($url.'?from_month=2026-11&page=2')->assertOk()
        ->assertJsonPath('data.*.id', [$patel->id, $jordan->id, $loss->id])
        ->assertJsonPath('data.*.rank', [10, 10, 11])
        ->assertJsonPath('data.*.winnings', [0, 0, -50]);
    $this->getJson($url.'?to_month=2026-10')->assertOk()
        ->assertJsonPath('data.*.winnings', [90, -75]);
    $this->getJson($url.'?from_month=2026-09&to_month=2026-09')->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('has_closed_games', false);
    $this->getJson($url.'?from_month=2026-11&to_month=2026-10')->assertUnprocessable()
        ->assertJsonPath('errors.to_month.0', 'To month must be the same as or later than From month');
    $this->getJson($url.'?from_month=2026-12&to_month=2026-12')->assertUnprocessable()
        ->assertJsonValidationErrors(['from_month', 'to_month']);
    $this->getJson('/api/v1/home/summary')->assertOk()
        ->assertJsonPath('leaderboard.*.winnings', [350, 340, 330, 320, 310])
        ->assertJsonPath('leaderboard.*.rank', [1, 2, 3, 4, 5]);
});

it('limits leaderboard access to staff', function (RoleCode $role, int $status): void {
    $actor = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
    $response = $this->actingAs($actor)->getJson('/api/v1/leaderboard')->assertStatus($status);
    if ($status === 200) {
        $response->assertJsonCount(0, 'data');
    }
})->with([
    [RoleCode::SUPERADMIN, 200],
    [RoleCode::ADMIN, 200],
    [RoleCode::MANAGER, 200],
    [RoleCode::PLAYER, 403],
]);

it('requires authentication to see rankings', function (): void {
    $this->getJson('/api/v1/leaderboard')->assertUnauthorized();
});
