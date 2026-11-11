<?php

use App\Actions\Games\CloseGameSession;
use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function totalsGame(User $staff, int $number = 1, string $status = 'open'): GameSession
{
    $game = new GameSession;
    $game->game_date = '2026-11-11';
    $game->game_number = $number;
    $game->game_name = '11_NOV_2026_'.$number;
    $game->min_buy_in = 100;
    $game->max_buy_in = 1500;
    $game->created_by = $staff->id;
    $game->status = $status;
    $game->save();

    return $game;
}

it('requires authentication on all totals routes', function (): void {
    $this->getJson('/api/v1/games/totals-options')->assertUnauthorized();
    $this->getJson('/api/v1/games/1/totals')->assertUnauthorized();
    $this->patchJson('/api/v1/games/1/totals')->assertUnauthorized();
});

it('applies the staff policy to listing, loading, and saving totals', function (RoleCode $role, bool $active, bool $mustChange, int $status): void {
    $user = User::factory()->create(['role' => $role, 'is_active' => $active, 'must_change_password' => $mustChange]);
    $game = totalsGame($user);
    $this->actingAs($user);
    $url = '/api/v1/games/'.$game->id.'/totals';

    $this->getJson('/api/v1/games/totals-options')->assertStatus($status);
    $this->getJson($url)->assertStatus($status);
    $this->patchJson($url, ['dealerTips' => 50, 'gameCosts' => 75])->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, true, false, 200],
    [RoleCode::ADMIN, true, false, 200],
    [RoleCode::MANAGER, true, false, 200],
    [RoleCode::PLAYER, true, false, 403],
    [RoleCode::MANAGER, false, false, 403],
    [RoleCode::ADMIN, true, true, 403],
]);

it('lists all games newest first and loads defaults and saved amounts independently', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($staff);
    $this->getJson('/api/v1/games/totals-options')->assertExactJson(['games' => []]);

    $closed = totalsGame($staff, 2, 'closed');
    $open = totalsGame($staff);
    $this->getJson('/api/v1/games/totals-options')->assertExactJson(['games' => [
        ['id' => $closed->id, 'name' => $closed->game_name, 'status' => 'closed'],
        ['id' => $open->id, 'name' => $open->game_name, 'status' => 'open'],
    ]]);
    $openUrl = '/api/v1/games/'.$open->id.'/totals';
    $this->getJson($openUrl)->assertOk()->assertExactJson(['data' => ['dealerTips' => 0, 'gameCosts' => 0, 'income' => null]]);
    $this->patchJson($openUrl, ['dealerTips' => 2147483647, 'gameCosts' => 0])->assertOk();
    $this->getJson($openUrl)->assertOk()->assertJsonPath('data.dealerTips', 2147483647);
    $this->patchJson($openUrl, ['dealerTips' => 0, 'gameCosts' => 0])->assertOk();
    $this->getJson('/api/v1/games/'.$closed->id.'/totals')->assertOk()->assertJsonPath('data.dealerTips', 0);
    $this->getJson('/api/v1/games/999/totals')->assertNotFound();
});

it('rejects invalid amounts without saving either field', function (mixed $amount): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $game = totalsGame($staff);
    $this->actingAs($staff);
    $url = '/api/v1/games/'.$game->id.'/totals';
    $this->patchJson($url, ['dealerTips' => $amount, 'gameCosts' => 75])->assertUnprocessable()->assertJsonValidationErrors('dealerTips');
    $this->patchJson($url, ['dealerTips' => 50, 'gameCosts' => $amount])->assertUnprocessable()->assertJsonValidationErrors('gameCosts');
    $this->assertDatabaseHas('game_sessions', ['id' => $game->id, 'dealer_tips' => 0, 'game_costs' => 0]);
})->with([-1, 40.50, '40', 2147483648, [null]]);

it('preserves balances and updates negative closed income when costs change', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -70]);
    $remaining = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 25]);
    $game = totalsGame($staff);
    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $player->id, 'opened_at' => now(), 'closed_at' => now(),
    ]);
    $openVisit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $remaining->id, 'opened_at' => now(),
    ]);
    DB::table('buy_ins')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'cash' => 700, 'credit' => 300,
        'balance_after' => -70, 'request_id' => (string) Str::uuid(), 'created_at' => now(),
    ]);
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'ending_chips' => 900,
        'cash_paid' => 850, 'balance_after' => -70, 'automatic' => false, 'created_at' => now(),
    ]);

    $this->actingAs($staff);
    $url = '/api/v1/games/'.$game->id.'/totals';
    $this->patchJson($url, ['dealerTips' => 50, 'gameCosts' => 75])->assertOk()->assertJsonPath('data.income', null);
    $this->getJson($url)->assertExactJson(['data' => ['dealerTips' => 50, 'gameCosts' => 75, 'income' => null]]);

    app(CloseGameSession::class)->close($game, $staff);
    $this->assertDatabaseHas('cashouts', ['player_game_visit_id' => $openVisit, 'ending_chips' => 0, 'cash_paid' => 0, 'automatic' => true]);
    $this->getJson($url)->assertExactJson(['data' => ['dealerTips' => 50, 'gameCosts' => 75, 'income' => -25]]);
    $this->patchJson($url, ['dealerTips' => 50, 'gameCosts' => 40])->assertOk()
        ->assertExactJson(['data' => ['dealerTips' => 50, 'gameCosts' => 40, 'income' => 10]]);
    $this->getJson($url)->assertJsonPath('data.income', 10);
    expect($player->refresh()->poker_balance)->toBe(-70)
        ->and($remaining->refresh()->poker_balance)->toBe(25);
});
