<?php

use App\Actions\Games\CloseGameSession;
use App\Actions\Games\SaveCashout;
use App\Enums\RoleCode;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, DatabaseTransactions::class);

beforeEach(function (): void {
    // Local MySQL is already migrated. A fresh default test connection needs the schema.
    if (DB::connection()->getDatabaseName() === ':memory:' && ! Schema::hasTable('correction_history')) {
        $this->artisan('migrate', ['--no-interaction' => true])->assertSuccessful();
    }
});

function cashoutCorrectionFixture(bool $automatic = false): array
{
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => true, 'must_change_password' => false, 'poker_balance' => 0, 'first_name' => 'Amelia', 'last_name' => 'Correction Fixture']);
    $game = new GameSession;
    $game->forceFill([
        'game_date' => '2026-11-12',
        'game_number' => (int) GameSession::query()->where('game_date', '2026-11-12')->max('game_number') + 1,
        'game_name' => 'Correction Test '.Str::random(8),
        'status' => 'open',
        'min_buy_in' => 100,
        'max_buy_in' => 400,
        'created_by' => $staff->id,
    ])->save();
    $visit = DB::table('player_game_visits')->insertGetId([
        'game_session_id' => $game->id, 'player_id' => $player->id, 'opened_at' => now(),
    ]);
    DB::table('buy_ins')->insert([
        'player_game_visit_id' => $visit, 'created_by' => $staff->id, 'cash' => 200, 'credit' => 0,
        'balance_after' => 0, 'request_id' => (string) Str::uuid(), 'created_at' => now(),
    ]);
    if ($automatic) {
        app(CloseGameSession::class)->close($game, $staff);
        $cashout = Cashout::query()->where('player_game_visit_id', $visit)->firstOrFail();
    } else {
        $cashout = app(SaveCashout::class)->save($staff, $game->id, $player->id, $visit, 200, 120, (string) Str::uuid());
    }

    return [$staff, $player, $game, $cashout];
}

function cashoutCorrectionDraft(Cashout $cashout, int $chips, int $paid): array
{
    return [
        'previousEndingChips' => $cashout->ending_chips, 'previousCashPaid' => $cashout->cash_paid,
        'endingChips' => $chips, 'cashPaid' => $paid,
        'reason' => '  Correct the recorded payout  ', 'requestId' => (string) Str::uuid(),
    ];
}

it('hides a zero payout and acknowledges a matching retry even after another correction', function (): void {
    [$staff, $player, $game, $cashout] = cashoutCorrectionFixture();
    $path = '/api/v1/cashouts/'.$cashout->id.'/correction';
    $payment = DB::table('payments')->where('cashout_id', $cashout->id)->first();
    $draft = cashoutCorrectionDraft($cashout, 200, 0);

    $this->actingAs($staff, 'web')->getJson('/api/v1/payments?player_id='.$player->id)
        ->assertJsonPath('data.0.cashoutId', $cashout->id);
    $this->getJson($path)->assertOk()->assertJsonPath('data.visit', 1);
    $this->patchJson('/api/v1/payments/'.$payment->id.'/correction', [
        'amount' => 80, 'paidAt' => $payment->paid_at, 'reason' => 'Wrong form',
    ])->assertUnprocessable();
    $this->patchJson($path, $draft)->assertOk()->assertJsonPath('data.balance', 200);
    $this->getJson('/api/v1/payments?player_id='.$player->id)->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/games/'.$game->id)->assertJsonPath('data.players.0.endingChips', 200)
        ->assertJsonPath('data.players.0.cashouts.0.id', $cashout->id);

    $this->patchJson($path, cashoutCorrectionDraft($cashout->fresh(), 200, 80))->assertOk()->assertJsonPath('data.balance', 120);
    $this->patchJson($path, $draft)->assertOk()->assertExactJson(['data' => ['message' => 'Already saved.']]);
    $this->assertDatabaseHas('payments', ['id' => $payment->id, 'amount' => 80, 'paid_at' => $payment->paid_at, 'note' => $payment->note]);
    $this->assertDatabaseHas('users', ['id' => $player->id, 'poker_balance' => 120]);
    expect(DB::table('correction_history')->where('cashout_id', $cashout->id)->count())->toBe(2);
    $audit = DB::table('correction_history')->where('cashout_id', $cashout->id)->oldest('id')->first();
    expect($audit->cashout_ending_chips_before)->toBe($draft['previousEndingChips'])
        ->and($audit->cashout_ending_chips_after)->toBe($draft['endingChips'])
        ->and($audit->cashout_cash_paid_before)->toBe(120)
        ->and($audit->cashout_cash_paid_after)->toBe(0)
        ->and($audit->payment_id)->toBeNull()
        ->and($audit->payment_amount_before)->toBe(120)
        ->and($audit->payment_amount_after)->toBe(0)
        ->and((int) $audit->corrected_by)->toBe($staff->id)->and($audit->reason)->toBe('Correct the recorded payout')
        ->and($audit->created_at)->not->toBeNull();

    $this->getJson('/api/v1/corrections?type=cashout')->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.1.affectedRecord', $player->first_name.' '.$player->last_name.' · '.$game->game_name.' · Visit 1')
        ->assertJsonPath('data.1.changes.linkedPaymentAmount', ['before' => 120, 'after' => 0])
        ->assertJsonMissingPath('data.1.changes.endingChips');

    $this->postJson('/api/v1/cashouts', [
        'gameId' => $game->id, 'playerId' => $player->id, 'visitId' => $cashout->player_game_visit_id,
        'endingChips' => 200, 'cashPaid' => 120, 'requestId' => $cashout->request_id,
    ])->assertSuccessful()->assertJsonPath('data.cashPaid', 120);
});

it('denies a Player correcting their own cashout', function (): void {
    [, $player, , $cashout] = cashoutCorrectionFixture(true);
    $path = '/api/v1/cashouts/'.$cashout->id.'/correction';

    $this->actingAs($player, 'web')->getJson($path)->assertForbidden();
    $this->patchJson($path, cashoutCorrectionDraft($cashout, 200, 80))->assertForbidden();
});

it('allows a Manager to correct a closed automatic cashout', function (): void {
    [, $player, $game, $cashout] = cashoutCorrectionFixture(true);
    $manager = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $path = '/api/v1/cashouts/'.$cashout->id.'/correction';
    $draft = cashoutCorrectionDraft($cashout, 200, 80);

    $this->actingAs($manager, 'web')->patchJson($path, $draft)->assertOk()->assertJsonPath('data.balance', 120);
    $this->getJson('/api/v1/games/'.$game->id)->assertJsonPath('data.players.0.endingChips', 200);
    $this->getJson('/api/v1/payments?player_id='.$player->id)
        ->assertJsonPath('data.0.amount', 80)->assertJsonPath('data.0.direction', 'house_pays_player');
    $this->assertDatabaseHas('cashouts', ['id' => $cashout->id, 'automatic' => true]);
});

it('rolls back all writes on failure and applies a Super Admin retry only once', function (): void {
    [, $player, , $cashout] = cashoutCorrectionFixture();
    $staff = User::factory()->create(['role' => RoleCode::SUPERADMIN, 'is_active' => true, 'must_change_password' => false]);
    $path = '/api/v1/cashouts/'.$cashout->id.'/correction';
    $draft = cashoutCorrectionDraft($cashout, 240, 80);

    $fail = true;
    User::saving(function (User $saving) use (&$fail, $player): void {
        if ($fail && $saving->id === $player->id) {
            throw new RuntimeException('Simulated correction failure after payment and cashout writes.');
        }
    });

    $this->actingAs($staff, 'web')->patchJson($path, $draft)->assertInternalServerError();
    $this->assertDatabaseHas('cashouts', ['id' => $cashout->id, 'ending_chips' => 200, 'cash_paid' => 120]);
    $this->assertDatabaseHas('payments', ['cashout_id' => $cashout->id, 'amount' => 120]);
    $this->assertDatabaseHas('users', ['id' => $player->id, 'poker_balance' => 80]);
    $this->assertDatabaseMissing('correction_history', ['request_id' => $draft['requestId']]);

    $fail = false;
    $this->patchJson($path, $draft)->assertOk()->assertJsonPath('data.balance', 160);
    $this->patchJson($path, $draft)->assertOk()->assertJsonPath('data.message', 'Already saved.');
    $this->patchJson($path, array_replace($draft, ['cashPaid' => 70]))->assertUnprocessable();
    $this->patchJson($path, array_replace($draft, ['requestId' => (string) Str::uuid()]))->assertConflict();
    $this->patchJson($path, cashoutCorrectionDraft($cashout->fresh(), 20, 80))->assertOk()->assertJsonPath('data.balance', -60);
    $this->patchJson($path, cashoutCorrectionDraft($cashout->fresh(), 240, 80))->assertOk()->assertJsonPath('data.balance', 160);
    $this->assertDatabaseHas('payments', ['cashout_id' => $cashout->id, 'amount' => 80]);
    expect(DB::table('correction_history')->where('request_id', $draft['requestId'])->count())->toBe(1);
});

it('rejects invalid amounts, missing reasons and no changes', function (): void {
    [$staff, , , $cashout] = cashoutCorrectionFixture();
    $path = '/api/v1/cashouts/'.$cashout->id.'/correction';
    $draft = cashoutCorrectionDraft($cashout, 200, 80);
    $this->actingAs($staff, 'web');

    foreach (['endingChips' => 2147483648, 'cashPaid' => 80.5, 'reason' => '   '] as $field => $value) {
        $this->patchJson($path, array_replace($draft, [$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
    }
    $this->patchJson($path, array_replace($draft, ['reason' => str_repeat('a', 2001)]))->assertUnprocessable()->assertJsonValidationErrors('reason');
    $this->patchJson($path, array_replace($draft, ['cashPaid' => 120]))->assertUnprocessable()->assertJsonValidationErrors('correction');
    $this->assertDatabaseMissing('correction_history', ['request_id' => $draft['requestId']]);
});
