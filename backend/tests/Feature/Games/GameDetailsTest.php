<?php

use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function gameForDetails(User $staff, int $number = 1): GameSession
{
    $game = new GameSession;
    $game->game_date = '2026-11-11';
    $game->game_number = $number;
    $game->game_name = '11_NOV_2026_'.$number;
    $game->status = 'open';
    $game->min_buy_in = 200;
    $game->max_buy_in = 400;
    $game->created_by = $staff->id;
    $game->save();

    return $game;
}

it('requires sign-in and applies the staff game policy', function (RoleCode $role, bool $active, bool $mustChange, int $status): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN]);
    $game = gameForDetails($staff);
    $url = '/api/v1/games/'.$game->id;

    $this->getJson($url)->assertUnauthorized();

    $user = User::factory()->create(['role' => $role, 'is_active' => $active, 'must_change_password' => $mustChange]);
    $this->actingAs($user, 'web')->getJson($url)->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, true, false, 200],
    [RoleCode::ADMIN, true, false, 200],
    [RoleCode::MANAGER, true, false, 200],
    [RoleCode::PLAYER, true, false, 403],
    [RoleCode::MANAGER, false, false, 403],
    [RoleCode::ADMIN, true, true, 403],
]);

it('returns saved limits and chronological purchases and calculates the poker result across visits', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Morgan']);
    $game = gameForDetails($staff);
    $other = gameForDetails($staff, 2);

    $firstVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $player->id,
        'opened_at' => now()->subHours(2), 'closed_at' => now()->subHour(),
    ]);
    $returnVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $player->id, 'opened_at' => now(),
    ]);
    $otherVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $other->id, 'player_id' => $player->id, 'opened_at' => now(),
    ]);

    // Write the top-up first to verify history uses the purchase time before ID.
    foreach ([
        [$firstVisit, 100, 100, now()->subMinutes(90)],
        [$firstVisit, 150, 50, now()->subHours(2)],
        [$returnVisit, 150, 50, now()],
        [$otherVisit, 200, 0, now()],
    ] as [$visit, $cash, $credit, $createdAt]) {
        DB::table('buy_ins')->insert([
            'player_game_visit_id' => $visit, 'created_by' => $staff->id,
            'cash' => $cash, 'credit' => $credit, 'balance_after' => -50,
            'request_id' => (string) Str::uuid(), 'created_at' => $createdAt,
        ]);
    }
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $firstVisit, 'created_by' => $staff->id,
        'ending_chips' => 200, 'cash_paid' => 50, 'balance_after' => -50, 'created_at' => now()->subHour(),
    ]);

    $url = '/api/v1/games/'.$game->id;
    $this->actingAs($staff, 'web')->getJson($url)->assertOk()
        ->assertJsonPath('data.date', '2026-11-11')
        ->assertJsonPath('data.minBuyIn', 200)
        ->assertJsonPath('data.maxBuyIn', 400)
        ->assertJsonCount(1, 'data.players')
        ->assertJsonPath('data.players.0.name', 'Avery Morgan')
        ->assertJsonPath('data.players.0.buyIns', 600)
        ->assertJsonPath('data.players.0.endingChips', 200)
        ->assertJsonPath('data.players.0.cashPaid', 50)
        ->assertJsonPath('data.players.0.stillPlaying', true)
        ->assertJsonPath('data.players.0.result', null)
        ->assertJsonPath('data.players.0.purchases.*.label', ['First buy-in', 'Top-up', 'Return buy-in'])
        ->assertJsonPath('data.players.0.purchases.*.visit', [1, 1, 2])
        ->assertJsonPath('data.players.0.purchases.*.cash', [150, 100, 150])
        ->assertJsonPath('data.players.0.purchases.*.credit', [50, 100, 50])
        ->assertJsonPath('data.players.0.purchases.*.total', [200, 200, 200]);

    $this->getJson($url.'/close')->assertOk()->assertJsonPath('data.openVisits', 1);
    $this->postJson($url.'/close', ['dealerTips' => 0, 'gameCosts' => 0])->assertOk();
    $this->assertDatabaseHas('cashouts', [
        'player_game_visit_id' => $returnVisit, 'ending_chips' => 0, 'cash_paid' => 0, 'automatic' => true,
    ]);

    $this->getJson($url)->assertOk()
        ->assertJsonPath('data.status', 'closed')
        ->assertJsonPath('data.players.0.stillPlaying', false)
        ->assertJsonPath('data.players.0.result', -400)
        ->assertJsonPath('data.income', 400);
});
