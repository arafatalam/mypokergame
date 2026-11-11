<?php

use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function closeGameFixture(User $staff, int $number = 1, string $status = 'open'): GameSession
{
    $game = new GameSession;
    $game->game_date = '2026-11-11';
    $game->game_number = $number;
    $game->game_name = 'CLOSE_TEST_'.$number;
    $game->min_buy_in = 100;
    $game->max_buy_in = 1500;
    $game->created_by = $staff->id;
    $game->status = $status;
    $game->save();

    return $game;
}

it('requires authentication on each close route', function (): void {
    $this->getJson('/api/v1/games/close-options')->assertUnauthorized();
    $this->getJson('/api/v1/games/1/close')->assertUnauthorized();
    $this->postJson('/api/v1/games/1/close')->assertUnauthorized();
});

it('applies the staff policy to listing, loading and closing games', function (RoleCode $role, bool $active, bool $mustChange, int $status): void {
    $staff = User::factory()->create(['role' => $role, 'is_active' => $active, 'must_change_password' => $mustChange]);
    $game = closeGameFixture($staff);
    $url = '/api/v1/games/'.$game->id.'/close';
    $this->actingAs($staff, 'web');

    $this->getJson('/api/v1/games/close-options')->assertStatus($status);
    $this->getJson($url)->assertStatus($status);
    $this->postJson($url, ['dealerTips' => 0, 'gameCosts' => 0])->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, true, false, 200],
    [RoleCode::ADMIN, true, false, 200],
    [RoleCode::MANAGER, true, false, 200],
    [RoleCode::PLAYER, true, false, 403],
    [RoleCode::MANAGER, false, false, 403],
    [RoleCode::ADMIN, true, true, 403],
]);

it('lists only open games newest first and loads zero defaults', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($staff, 'web');
    $this->getJson('/api/v1/games/close-options')->assertExactJson(['games' => []]);

    $older = closeGameFixture($staff);
    $newest = closeGameFixture($staff, 2);
    $closed = closeGameFixture($staff, 3, 'closed');

    $this->getJson('/api/v1/games/close-options')->assertExactJson(['games' => [
        ['id' => $newest->id, 'name' => $newest->game_name, 'status' => 'open'],
        ['id' => $older->id, 'name' => $older->game_name, 'status' => 'open'],
    ]]);
    $this->getJson('/api/v1/games/'.$older->id.'/close')->assertExactJson(['data' => [
        'buyIns' => 0, 'endingChips' => 0, 'dealerTips' => 0, 'gameCosts' => 0, 'openVisits' => 0,
    ]]);
    $this->getJson('/api/v1/games/'.$closed->id.'/close')->assertNotFound();
});

it('validates amounts before closing the game', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $game = closeGameFixture($staff);

    $this->actingAs($staff, 'web')
        ->postJson('/api/v1/games/'.$game->id.'/close', ['dealerTips' => -1, 'gameCosts' => '75'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['dealerTips', 'gameCosts']);
    $this->assertDatabaseHas('game_sessions', ['id' => $game->id, 'status' => 'open', 'dealer_tips' => 0, 'game_costs' => 0]);
});

it('closes at a loss, saves the reviewed amounts and settles remaining visits once', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -70]);
    $remaining = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 25]);
    $game = closeGameFixture($staff);
    $otherGame = closeGameFixture($staff, 2);
    $url = '/api/v1/games/'.$game->id.'/close';
    $this->actingAs($staff, 'web');

    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $player->id, 'opened_at' => now(), 'closed_at' => now(),
    ]);
    $openVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $remaining->id, 'opened_at' => now(),
    ]);
    $otherVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $otherGame->id, 'player_id' => $remaining->id, 'opened_at' => now(),
    ]);
    DB::table('buy_ins')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'cash' => 700, 'credit' => 300,
        'balance_after' => -70, 'request_id' => (string) Str::uuid(), 'created_at' => now(),
    ]);
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'ending_chips' => 900,
        'cash_paid' => 850, 'balance_after' => -70, 'automatic' => false, 'created_at' => now(),
    ]);

    $this->patchJson('/api/v1/games/'.$game->id.'/totals', ['dealerTips' => 30, 'gameCosts' => 55])->assertOk();
    $this->getJson($url)->assertExactJson(['data' => [
        'buyIns' => 1000, 'endingChips' => 900, 'dealerTips' => 30, 'gameCosts' => 55, 'openVisits' => 1,
    ]]);
    $this->postJson($url, ['dealerTips' => 50, 'gameCosts' => 75])->assertOk()->assertExactJson(['data' => [
        'dealerTips' => 50, 'gameCosts' => 75, 'income' => -25,
    ]]);
    // A retry after a lost response returns the saved outcome without closing again.
    $this->postJson($url, ['dealerTips' => 0, 'gameCosts' => 0])->assertOk()->assertExactJson(['data' => [
        'dealerTips' => 50, 'gameCosts' => 75, 'income' => -25,
    ]]);
    $this->assertDatabaseHas('game_sessions', [
        'id' => $game->id, 'status' => 'closed', 'closed_by' => $staff->id, 'dealer_tips' => 50, 'game_costs' => 75,
    ]);
    $this->assertDatabaseCount('cashouts', 2);
    $this->assertDatabaseHas('cashouts', [
        'player_game_visit_id' => $openVisit, 'created_by' => $staff->id, 'ending_chips' => 0,
        'cash_paid' => 0, 'balance_after' => 25, 'automatic' => true,
    ]);
    expect(DB::table('player_game_visits')->where('id', $openVisit)->value('closed_at'))->not->toBeNull()
        ->and(DB::table('player_game_visits')->where('id', $otherVisit)->value('closed_at'))->toBeNull()
        ->and($player->refresh()->poker_balance)->toBe(-70)
        ->and($remaining->refresh()->poker_balance)->toBe(25);
    $this->getJson('/api/v1/games/close-options')->assertExactJson(['games' => [
        ['id' => $otherGame->id, 'name' => $otherGame->game_name, 'status' => 'open'],
    ]]);
});
