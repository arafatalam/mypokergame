<?php

use App\Actions\Games\CloseGameSession;
use App\Enums\RoleCode;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function cashoutStaff(RoleCode $role = RoleCode::MANAGER): User
{
    return User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
}

function cashoutGame(User $staff, int $number = 1, string $status = 'open'): GameSession
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

function cashoutBuyIn(TestCase $test, GameSession $game, User $player, int $cash = 150, int $credit = 50): int
{
    $response = $test->postJson('/api/v1/buy-ins', [
        'gameId' => $game->id,
        'playerId' => $player->id,
        'cash' => $cash,
        'credit' => $credit,
        'requestId' => (string) Str::uuid(),
    ])->assertOk();

    return $response->json('visitId');
}

it('requires authentication for both cashout routes', function (): void {
    $this->getJson('/api/v1/games/cashout-options')->assertUnauthorized();
    $this->postJson('/api/v1/cashouts')->assertUnauthorized();
});

it('authorizes both cashout routes before reading or validating', function (RoleCode $role, bool $active, bool $mustChange, bool $allowed): void {
    $staff = User::factory()->create(['role' => $role, 'is_active' => $active, 'must_change_password' => $mustChange]);
    $this->actingAs($staff, 'web');

    if ($allowed) {
        $this->getJson('/api/v1/games/cashout-options')->assertOk()->assertExactJson(['games' => [], 'players' => []]);
        $this->postJson('/api/v1/cashouts')->assertUnprocessable();
    } else {
        $this->getJson('/api/v1/games/cashout-options')->assertForbidden();
        $this->postJson('/api/v1/cashouts')->assertForbidden();
    }
})->with([
    [RoleCode::SUPERADMIN, true, false, true],
    [RoleCode::ADMIN, true, false, true],
    [RoleCode::MANAGER, true, false, true],
    [RoleCode::PLAYER, true, false, false],
    [RoleCode::MANAGER, false, false, false],
    [RoleCode::ADMIN, true, true, false],
]);

it('shows game buy-ins, records one cashout, and rejects stale and repeated saves', function (): void {
    $staff = cashoutStaff();
    $player = User::factory()->create([
        'role' => RoleCode::PLAYER, 'is_active' => true, 'first_name' => 'Avery', 'last_name' => 'Test', 'poker_balance' => -20,
    ]);
    $otherPlayer = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true]);
    $game = cashoutGame($staff);
    $closed = cashoutGame($staff, 2, 'closed');
    DB::table('player_game_visits')->insert([
        'game_session_id' => $game->id, 'player_id' => $otherPlayer->id, 'opened_at' => now(),
    ]);
    $this->actingAs($staff, 'web');

    $visitId = cashoutBuyIn($this, $game, $player);
    expect(cashoutBuyIn($this, $game, $player, 200, 0))->toBe($visitId);
    $this->getJson('/api/v1/games/cashout-options')->assertOk()->assertExactJson([
        'games' => [['id' => $game->id, 'name' => $game->game_name]],
        'players' => [[
            'id' => $player->id, 'gameId' => $game->id, 'visitId' => $visitId,
            'name' => 'Avery Test', 'totalBuyIn' => 400,
        ]],
    ]);

    $draft = [
        'gameId' => $game->id, 'playerId' => $player->id, 'visitId' => $visitId,
        'endingChips' => 200, 'cashPaid' => 150, 'requestId' => (string) Str::uuid(),
    ];
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['endingChips' => -1, 'cashPaid' => 1.5]))
        ->assertUnprocessable()->assertJsonValidationErrors(['endingChips', 'cashPaid']);
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['endingChips' => true]))
        ->assertUnprocessable()->assertJsonValidationErrors('endingChips');
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['gameId' => $closed->id]))
        ->assertUnprocessable()->assertJsonValidationErrors('gameId');
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['visitId' => $visitId + 100]))
        ->assertUnprocessable()->assertJsonValidationErrors('playerId');
    $this->assertDatabaseCount('cashouts', 0);
    expect($player->refresh()->poker_balance)->toBe(-70);

    config(['payments.timezone' => 'America/Moncton']);
    $this->travelTo(Carbon::parse('2026-11-12 01:00:00 UTC'));
    $receipt = $this->postJson('/api/v1/cashouts', $draft)->assertCreated()->assertExactJson(['data' => [
        'game' => $game->game_name, 'player' => 'Avery Test', 'endingChips' => 200, 'cashPaid' => 150, 'balance' => -20,
    ]]);
    $this->postJson('/api/v1/cashouts', $draft)->assertOk()->assertExactJson($receipt->json());
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['cashPaid' => 151]))
        ->assertUnprocessable()->assertJsonValidationErrors('requestId');
    $this->postJson('/api/v1/cashouts', array_replace($draft, ['requestId' => (string) Str::uuid()]))
        ->assertUnprocessable()->assertJsonValidationErrors('playerId');
    Auth::forgetGuards();
    $this->actingAs(cashoutStaff(RoleCode::ADMIN), 'web')->postJson('/api/v1/cashouts', $draft)
        ->assertUnprocessable()->assertJsonValidationErrors('playerId');
    $this->assertDatabaseCount('cashouts', 1);
    app(CloseGameSession::class)->close($game, $staff);
    Auth::forgetGuards();
    $this->actingAs($staff, 'web')->postJson('/api/v1/cashouts', $draft)
        ->assertOk()->assertExactJson($receipt->json());
    $this->getJson('/api/v1/games/cashout-options')->assertOk()->assertJsonPath('players', []);
    $this->assertDatabaseCount('cashouts', 2); // Game close also settles the other open visit.
    $this->assertDatabaseHas('cashouts', [
        'player_game_visit_id' => $visitId, 'created_by' => $staff->id, 'ending_chips' => 200,
        'cash_paid' => 150, 'balance_after' => -20, 'automatic' => false, 'request_id' => $draft['requestId'],
    ]);
    $this->assertDatabaseCount('payments', 1);
    $this->assertDatabaseHas('payments', [
        'cashout_id' => Cashout::query()->where('player_game_visit_id', $visitId)->value('id'),
        'player_id' => $player->id, 'created_by' => $staff->id,
        'amount' => 150, 'direction' => 'house_pays_player', 'paid_at' => '2026-11-11',
        'note' => 'Paid at cashout', 'balance_after' => -20,
    ]);
    $this->getJson('/api/v1/payments')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.note', 'Paid at cashout');
    expect($player->refresh()->poker_balance)->toBe(-20);
    expect(DB::table('player_game_visits')->where('id', $visitId)->value('closed_at'))->not->toBeNull();
});

it('automatically cashes out unfinished visits when a game closes and preserves earlier receipts', function (): void {
    $staff = cashoutStaff();
    $first = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true]);
    $second = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true]);
    $game = cashoutGame($staff);
    $this->actingAs($staff, 'web');
    $firstVisit = cashoutBuyIn($this, $game, $first);
    $secondVisit = cashoutBuyIn($this, $game, $second);
    $this->postJson('/api/v1/cashouts', [
        'gameId' => $game->id, 'playerId' => $first->id, 'visitId' => $firstVisit, 'endingChips' => 0, 'cashPaid' => 10,
        'requestId' => (string) Str::uuid(),
    ])->assertCreated()->assertJsonPath('data.balance', -60);

    $action = app(CloseGameSession::class);
    $closed = $action->close($game, $staff);
    expect($closed->status)->toBe('closed');
    $action->close($game, $staff);

    $this->assertDatabaseCount('cashouts', 2);
    $this->assertDatabaseHas('cashouts', [
        'player_game_visit_id' => $secondVisit, 'ending_chips' => 0, 'cash_paid' => 0, 'automatic' => true, 'balance_after' => -50,
    ]);
    expect(Cashout::query()->sum('ending_chips'))->toEqual(0);
    expect(Cashout::query()->sum('cash_paid'))->toEqual(10);
    expect($second->refresh()->poker_balance)->toBe(-50);
    expect(DB::table('player_game_visits')->whereNull('closed_at')->count())->toBe(0);
    $this->getJson('/api/v1/games/cashout-options')->assertOk()->assertExactJson(['games' => [], 'players' => []]);
});
