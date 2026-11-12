<?php

use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function listedGame(User $staff, string $date, int $number, string $status): GameSession
{
    $game = new GameSession;
    $game->game_date = $date;
    $game->game_number = $number;
    $game->game_name = $date.'_'.$number;
    $game->status = $status;
    $game->min_buy_in = 100;
    $game->max_buy_in = 500;
    $game->created_by = $staff->id;
    $game->save();

    return $game;
}

it('requires a signed-in account', function (): void {
    $this->getJson('/api/v1/games')->assertUnauthorized();
});

it('applies the staff-only game list policy', function (RoleCode $role, bool $active, bool $mustChange, int $status): void {
    $user = User::factory()->create(['role' => $role, 'is_active' => $active, 'must_change_password' => $mustChange]);
    $this->actingAs($user, 'web')->getJson('/api/v1/games')->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, true, false, 200],
    [RoleCode::ADMIN, true, false, 200],
    [RoleCode::MANAGER, true, false, 200],
    [RoleCode::PLAYER, true, false, 403],
    [RoleCode::MANAGER, false, false, 403],
    [RoleCode::ADMIN, true, true, 403],
]);

it('sorts open games first, paginates five at a time, and filters inclusively', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($staff, 'web');
    $this->getJson('/api/v1/games?status=open')->assertOk()->assertJsonPath('has_games', false);

    $oldClosed = listedGame($staff, '2026-11-08', 1, 'closed');
    $oldOpen = listedGame($staff, '2026-11-09', 1, 'open');
    $firstOpen = listedGame($staff, '2026-11-10', 1, 'open');
    $secondOpen = listedGame($staff, '2026-11-10', 2, 'open');
    $firstClosed = listedGame($staff, '2026-11-11', 1, 'closed');
    $secondClosed = listedGame($staff, '2026-11-11', 2, 'closed');

    $this->getJson('/api/v1/games')->assertOk()->assertJsonCount(5, 'data')
        ->assertJsonPath('data.*.id', [$secondOpen->id, $firstOpen->id, $oldOpen->id, $secondClosed->id, $firstClosed->id])
        ->assertJsonPath('meta.last_page', 2);
    $this->getJson('/api/v1/games?page=2')->assertOk()->assertJsonPath('data.*.id', [$oldClosed->id]);
    $this->getJson('/api/v1/games?page=3')->assertOk()->assertJsonPath('meta.current_page', 2)
        ->assertJsonPath('data.*.id', [$oldClosed->id]);
    $this->getJson('/api/v1/games?from_date=2026-11-10&to_date=2026-11-11')->assertOk()
        ->assertJsonPath('data.*.id', [$secondOpen->id, $firstOpen->id, $secondClosed->id, $firstClosed->id]);
    $this->getJson('/api/v1/games?status=closed&to_date=2026-11-10')->assertOk()
        ->assertJsonPath('data.*.id', [$oldClosed->id]);
    $this->getJson('/api/v1/games?from_date=2026-12-01')->assertOk()
        ->assertJsonPath('has_games', true)->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/games?from_date=2026-11-11&to_date=2026-11-10&status=bad&page=0')
        ->assertUnprocessable()->assertJsonValidationErrors(['to_date', 'status', 'page']);
});

it('keeps cash paid separate from ending chips and shows income only for closed games', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);
    $open = listedGame($staff, '2026-11-11', 1, 'open');
    $closed = listedGame($staff, '2026-11-11', 2, 'closed');
    $closed->dealer_tips = 50;
    $closed->game_costs = 75;
    $closed->save();
    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $closed->id, 'player_id' => $player->id, 'opened_at' => now(), 'closed_at' => now(),
    ]);
    DB::table('buy_ins')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'cash' => 700, 'credit' => 300,
        'balance_after' => -70, 'request_id' => (string) Str::uuid(), 'created_at' => now(),
    ]);
    DB::table('cashouts')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'ending_chips' => 900,
        'cash_paid' => 850, 'balance_after' => -70, 'automatic' => false, 'created_at' => now(),
    ]);

    $this->actingAs($staff, 'web')->getJson('/api/v1/games')->assertOk()
        ->assertJsonPath('data.0.id', $open->id)
        ->assertJsonPath('data.0.income', null)
        ->assertJsonPath('data.1', [
            'id' => $closed->id, 'name' => $closed->game_name, 'gameDate' => '2026-11-11', 'status' => 'closed', 'buyIns' => 1000,
            'endingChips' => 900, 'cashPaid' => 850, 'dealerTips' => 50, 'gameCosts' => 75, 'income' => -25,
        ]);
});
