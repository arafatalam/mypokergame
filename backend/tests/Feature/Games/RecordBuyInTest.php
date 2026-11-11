<?php

use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function createBuyInGame(User $staff, int $number, string $status = 'open'): GameSession
{
    $game = new GameSession;
    $game->game_date = '2026-11-11';
    $game->game_number = $number;
    $game->game_name = '11_NOV_2026_'.$number;
    $game->min_buy_in = 200;
    $game->max_buy_in = 400;
    $game->created_by = $staff->id;
    $game->status = $status;
    $game->save();

    return $game;
}

it('requires authentication for both buy-in routes', function (): void {
    $this->getJson('/api/v1/games/buy-in-options')->assertUnauthorized();
    $this->postJson('/api/v1/buy-ins')->assertUnauthorized();
});

it('applies the staff policy before loading options or validating a save', function (RoleCode $role, bool $active, bool $mustChange, bool $allowed): void {
    $user = User::factory()->create([
        'role' => $role,
        'is_active' => $active,
        'must_change_password' => $mustChange,
    ]);

    $this->actingAs($user, 'web');
    if ($allowed) {
        $this->getJson('/api/v1/games/buy-in-options')->assertOk()->assertExactJson(['games' => [], 'players' => []]);
        $this->postJson('/api/v1/buy-ins')->assertUnprocessable();
    } else {
        $this->getJson('/api/v1/games/buy-in-options')->assertForbidden();
        $this->postJson('/api/v1/buy-ins')->assertForbidden();
    }
})->with([
    [RoleCode::SUPERADMIN, true, false, true],
    [RoleCode::ADMIN, true, false, true],
    [RoleCode::MANAGER, true, false, true],
    [RoleCode::PLAYER, true, false, false],
    [RoleCode::MANAGER, false, false, false],
    [RoleCode::ADMIN, true, true, false],
]);

it('returns only open games and active Players with their open game', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'first_name' => 'Avery', 'last_name' => 'Test']);
    User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => false]);
    $game = createBuyInGame($staff, 1);
    createBuyInGame($staff, 2, 'closed');
    DB::table('player_game_visits')->insert([
        'game_session_id' => $game->id,
        'player_id' => $player->id,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $this->actingAs($staff, 'web')->getJson('/api/v1/games/buy-in-options')
        ->assertOk()->assertExactJson([
            'games' => [['id' => $game->id, 'name' => '11_NOV_2026_1', 'minimum' => 200, 'maximum' => 400]],
            'players' => [['id' => $player->id, 'name' => 'Avery Test', 'openGameId' => $game->id]],
        ]);
});

it('records a mixed first buy-in and a cash top-up on the same visit', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'first_name' => 'Avery', 'last_name' => 'Test']);
    $player->poker_balance = -20;
    $player->save();
    $game = createBuyInGame($staff, 1);

    $this->actingAs($staff, 'web');
    $draft = [
        'gameId' => $game->id, 'playerId' => $player->id, 'cash' => 150, 'credit' => 50,
        'requestId' => (string) Str::uuid(),
    ];
    $first = $this->postJson('/api/v1/buy-ins', $draft)->assertOk();
    $visitId = $first->json('visitId');
    $first->assertExactJson([
        'game' => $game->game_name, 'player' => 'Avery Test', 'cash' => 150, 'credit' => 50,
        'total' => 200, 'balance' => -70, 'visitId' => $visitId,
    ]);

    $this->postJson('/api/v1/buy-ins', $draft)->assertOk()->assertExactJson($first->json());
    $this->assertDatabaseCount('buy_ins', 1);
    $draft['requestId'] = (string) Str::uuid();
    $draft['credit'] = 0;
    $draft['cash'] = 100;
    $this->postJson('/api/v1/buy-ins', $draft)->assertUnprocessable()->assertJsonValidationErrors('total');
    $draft['cash'] = 401;
    $this->postJson('/api/v1/buy-ins', $draft)->assertUnprocessable()->assertJsonValidationErrors('total');
    $draft['cash'] = 200;
    $this->postJson('/api/v1/buy-ins', $draft)->assertOk()
        ->assertJsonPath('visitId', $visitId)->assertJsonPath('total', 200)->assertJsonPath('balance', -70);
    $this->assertDatabaseCount('player_game_visits', 1);
    $this->assertDatabaseCount('buy_ins', 2);
    $this->assertDatabaseHas('buy_ins', ['player_game_visit_id' => $visitId, 'cash' => 200, 'credit' => 0]);
    expect($player->refresh()->poker_balance)->toBe(-70);
});

it('rechecks the player, game, and previous participation at save time', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'first_name' => 'Avery', 'last_name' => 'Test']);
    $inactive = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => false]);
    $original = createBuyInGame($staff, 1);
    $other = createBuyInGame($staff, 2);
    $closed = createBuyInGame($staff, 3, 'closed');
    DB::table('player_game_visits')->insert([
        'game_session_id' => $original->id,
        'player_id' => $player->id,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $this->actingAs($staff, 'web');
    $draft = [
        'gameId' => $other->id, 'playerId' => $player->id, 'cash' => 200, 'credit' => 0,
        'requestId' => (string) Str::uuid(),
    ];

    $this->postJson('/api/v1/buy-ins', $draft)->assertUnprocessable()
        ->assertJsonPath('errors.playerId.0', 'Avery Test is already in 11_NOV_2026_1.');
    $this->postJson('/api/v1/buy-ins', array_replace($draft, ['gameId' => $original->id]))
        ->assertUnprocessable()->assertJsonPath('errors.playerId.0', 'This player has already cashed out of this game.');
    $this->postJson('/api/v1/buy-ins', array_replace($draft, ['gameId' => $closed->id]))
        ->assertUnprocessable()->assertJsonValidationErrors('gameId');
    $this->postJson('/api/v1/buy-ins', array_replace($draft, ['playerId' => $inactive->id]))
        ->assertUnprocessable()->assertJsonValidationErrors('playerId');
    $this->postJson('/api/v1/buy-ins', array_replace($draft, ['cash' => -1, 'credit' => 1.5]))
        ->assertUnprocessable()->assertJsonValidationErrors(['cash', 'credit']);
    $this->assertDatabaseCount('buy_ins', 0);
});
