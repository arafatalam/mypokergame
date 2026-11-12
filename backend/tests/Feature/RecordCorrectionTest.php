<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function correctionStaff(RoleCode $role = RoleCode::ADMIN): User
{
    return User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
}

function correctionGame(User $staff): int
{
    return DB::table('game_sessions')->insertGetId([
        'game_date' => '2026-11-11', 'game_number' => 1, 'game_name' => '11_NOV_2026_1',
        'status' => 'closed', 'min_buy_in' => 100, 'max_buy_in' => 500, 'created_by' => $staff->id,
        'dealer_tips' => 50, 'game_costs' => 75,
    ]);
}

it('lets each staff role correct another staff member’s game totals and records the audit entry', function (RoleCode $role): void {
    $actor = correctionStaff($role);
    $game = correctionGame(correctionStaff());
    $url = '/api/v1/games/'.$game.'/totals/correction';
    $draft = [
        'dealerTips' => 0, 'gameCosts' => 2147483647, 'reason' => '  Counted again  ',
        'requestId' => (string) Str::uuid(),
    ];
    $this->actingAs($actor)->patchJson($url, $draft)->assertNoContent();
    $this->patchJson($url, $draft)->assertOk()->assertExactJson(['message' => 'Already saved.']);

    $this->assertDatabaseHas('game_sessions', ['id' => $game, 'dealer_tips' => 0, 'game_costs' => 2147483647]);
    $audit = DB::table('correction_history')->sole();
    expect((int) $audit->game_session_id)->toBe($game)
        ->and((int) $audit->corrected_by)->toBe($actor->id)
        ->and($audit->reason)->toBe('Counted again')
        ->and($audit->created_at)->not->toBeNull()
        ->and($audit->game_tips_before)->toBe(50)
        ->and($audit->game_costs_before)->toBe(75)
        ->and($audit->game_tips_after)->toBe(0)
        ->and($audit->game_costs_after)->toBe(2147483647);
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);

it('denies both writes to Players and guests', function (): void {
    $game = correctionGame(correctionStaff());
    $this->patchJson('/api/v1/games/'.$game.'/totals/correction')->assertUnauthorized();
    $this->patchJson('/api/v1/payments/1/correction')->assertUnauthorized();

    $this->actingAs(correctionStaff(RoleCode::PLAYER));
    $this->patchJson('/api/v1/games/'.$game.'/totals/correction')->assertForbidden();
    $this->patchJson('/api/v1/payments/1/correction')->assertForbidden();
    $this->assertDatabaseCount('correction_history', 0);
});

it('requires a changed total, valid whole dollars and a trimmed reason', function (): void {
    $staff = correctionStaff();
    $game = correctionGame($staff);
    $url = '/api/v1/games/'.$game.'/totals/correction';
    $this->actingAs($staff)->patchJson($url, [
        'dealerTips' => 50, 'gameCosts' => 75, 'reason' => 'Reason only',
    ])->assertUnprocessable()->assertJsonValidationErrors('correction');
    $this->patchJson($url, [
        'dealerTips' => 1.5, 'gameCosts' => 2147483648, 'reason' => '   ',
    ])->assertUnprocessable()->assertJsonValidationErrors(['dealerTips', 'gameCosts', 'reason']);
    $this->assertDatabaseCount('correction_history', 0);
});

it('applies the payment amount difference in the original direction and preserves the original receipt', function (
    RoleCode $role, string $direction, int $initialBalance, int $originalBalance, int $correctedBalance,
): void {
    $staff = correctionStaff();
    $actor = correctionStaff($role);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'poker_balance' => $initialBalance]);
    $date = today(config('payments.timezone'))->toDateString();
    $draft = [
        'playerId' => $player->id, 'amount' => 50, 'paidAt' => $date, 'note' => 'Original',
        'direction' => $direction, 'requestId' => (string) Str::uuid(),
    ];

    $receipt = $this->actingAs($staff)->postJson('/api/v1/payments', $draft)->assertOk()
        ->assertJsonPath('data.balance', $originalBalance)->json('data');
    $id = $receipt['id'];
    $url = '/api/v1/payments/'.$id.'/correction';
    $earlier = today(config('payments.timezone'))->subDay()->toDateString();
    $correction = [
        'amount' => 75, 'paidAt' => $earlier, 'note' => null, 'reason' => 'Verified receipt',
        'direction' => 'ignored', 'requestId' => (string) Str::uuid(),
    ];
    $this->actingAs($actor)->patchJson($url, $correction)->assertNoContent();
    $this->patchJson($url, $correction)->assertOk()->assertExactJson(['message' => 'Already saved.']);
    $this->patchJson($url, [...$correction, 'amount' => 80])->assertUnprocessable()
        ->assertJsonValidationErrors('correction');
    $this->assertDatabaseHas('payments', ['id' => $id, 'amount' => 75, 'paid_at' => $earlier, 'direction' => $direction, 'note' => null]);
    expect($player->fresh()->poker_balance)->toBe($correctedBalance);

    $audit = DB::table('correction_history')->sole();
    expect((int) $audit->payment_id)->toBe($id)
        ->and((int) $audit->corrected_by)->toBe($actor->id)
        ->and($audit->reason)->toBe('Verified receipt')
        ->and($audit->payment_amount_before)->toBe(50)
        ->and($audit->payment_paid_at_before)->toBe($date)
        ->and($audit->payment_note_before)->toBe('Original')
        ->and($audit->payment_amount_after)->toBe(75)
        ->and($audit->payment_paid_at_after)->toBe($earlier)
        ->and($audit->payment_note_after)->toBe(null);

    $this->getJson('/api/v1/corrections?type=payment')->assertOk()
        ->assertJsonPath('data.0.affectedRecord', $player->first_name.' '.$player->last_name.' · Payment #'.$id)
        ->assertJsonPath('data.0.changes.note', ['before' => 'Original', 'after' => null])
        ->assertJsonMissingPath('data.0.changes.direction');

    $this->patchJson($url, [
        'amount' => 75, 'paidAt' => $earlier, 'reason' => 'No change',
    ])->assertUnprocessable()->assertJsonValidationErrors('correction');
    $this->patchJson($url, [
        'amount' => 0, 'paidAt' => today(config('payments.timezone'))->addDay()->toDateString(),
        'note' => str_repeat('n', 2001), 'reason' => str_repeat('r', 2001),
    ])->assertUnprocessable()->assertJsonValidationErrors(['amount', 'paidAt', 'note', 'reason']);

    $this->actingAs($staff)->postJson('/api/v1/payments', $draft)->assertOk()->assertJsonPath('data', $receipt);
    $this->assertDatabaseCount('payments', 1);
    $this->assertDatabaseCount('correction_history', 1);
    expect($player->fresh()->poker_balance)->toBe($correctedBalance);
})->with([
    [RoleCode::SUPERADMIN, 'player_pays_house', -150, -100, -75],
    [RoleCode::ADMIN, 'house_pays_player', 150, 100, 75],
    [RoleCode::MANAGER, 'player_pays_house', -150, -100, -75],
]);

it('shows every revision with changed fields and lets staff filter and page across other staff corrections', function (RoleCode $role): void {
    $staff = correctionStaff();
    $viewer = correctionStaff($role);
    $game = correctionGame($staff);

    $this->freezeTime();
    $this->actingAs($staff);
    for ($tips = 51; $tips <= 61; $tips++) {
        $this->patchJson('/api/v1/games/'.$game.'/totals/correction', [
            'dealerTips' => $tips, 'gameCosts' => 75, 'reason' => 'Recounted tips',
        ])->assertNoContent();
    }

    $this->actingAs($viewer)->getJson('/api/v1/corrections')
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 11)
        ->assertJsonPath('data.0.affectedRecord', '11_NOV_2026_1')
        ->assertJsonPath('data.0.staff', $staff->first_name.' '.$staff->last_name)
        ->assertJsonPath('data.0.reason', 'Recounted tips')
        ->assertJsonPath('data.0.correctedAt', now()->toIso8601String())
        ->assertJsonPath('data.0.changes', ['dealerTips' => ['before' => 60, 'after' => 61]]);

    $this->getJson('/api/v1/corrections?type=game_totals&page=2')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.changes.dealerTips.after', 51);
    $this->getJson('/api/v1/corrections?type=cashout')->assertOk()->assertJsonPath('data', []);
    $this->getJson('/api/v1/corrections?type=unknown&page=0')->assertUnprocessable()
        ->assertJsonValidationErrors(['type', 'page']);
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);

it('denies correction history to guests and players', function (): void {
    $this->getJson('/api/v1/corrections')->assertUnauthorized();
    $this->actingAs(correctionStaff(RoleCode::PLAYER))->getJson('/api/v1/corrections')->assertForbidden();
});
