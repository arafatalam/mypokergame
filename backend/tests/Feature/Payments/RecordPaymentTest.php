<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function paymentUser(RoleCode $role, int $balance = 0, bool $active = true, bool $mustChange = false): User
{
    return User::factory()->create([
        'role' => $role, 'poker_balance' => $balance, 'is_active' => $active, 'must_change_password' => $mustChange,
    ]);
}

function paymentDraft(User $player, string $direction, int $amount): array
{
    return [
        'playerId' => $player->id, 'direction' => $direction, 'amount' => $amount,
        'paidAt' => today(config('payments.timezone'))->subDay()->toDateString(), 'note' => 'Cash received',
        'requestId' => (string) Str::uuid(),
    ];
}

it('requires staff authorization to list balances or record payments', function (RoleCode $role, bool $active, bool $mustChange, int $status): void {
    $staff = paymentUser($role, active: $active, mustChange: $mustChange);
    $player = paymentUser(RoleCode::PLAYER, -100);
    $draft = paymentDraft($player, 'player_pays_house', 50);

    $this->getJson('/api/v1/payments/options')->assertUnauthorized();
    $this->postJson('/api/v1/payments', $draft)->assertUnauthorized();

    $this->actingAs($staff, 'web')->getJson('/api/v1/payments/options')->assertStatus($status);
    $this->postJson('/api/v1/payments', $draft)->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, true, false, 200],
    [RoleCode::ADMIN, true, false, 200],
    [RoleCode::MANAGER, true, false, 200],
    [RoleCode::PLAYER, true, false, 403],
    [RoleCode::ADMIN, false, false, 403],
    [RoleCode::MANAGER, true, true, 403],
]);

it('offers every active player and defaults the date to today', function (): void {
    $staff = paymentUser(RoleCode::ADMIN);
    $owing = paymentUser(RoleCode::PLAYER, -120);
    $owed = paymentUser(RoleCode::PLAYER, 80);
    $settled = paymentUser(RoleCode::PLAYER);
    paymentUser(RoleCode::PLAYER, -200, active: false);
    paymentUser(RoleCode::MANAGER, -300);

    $this->actingAs($staff, 'web')->getJson('/api/v1/payments/options')
        ->assertOk()
        ->assertJsonPath('today', today(config('payments.timezone'))->toDateString())
        ->assertJsonCount(3, 'players')
        ->assertJsonFragment(['id' => $owing->id, 'balance' => -120])
        ->assertJsonFragment(['id' => $owed->id, 'balance' => 80])
        ->assertJsonFragment(['id' => $settled->id, 'balance' => 0]);
});

it('records partial, full and excess payments in either direction and retries without applying twice', function (int $starting, string $direction, int $amount, int $remaining): void {
    $staff = paymentUser(RoleCode::ADMIN);
    $player = paymentUser(RoleCode::PLAYER, $starting);
    $draft = paymentDraft($player, $direction, $amount);

    $this->actingAs($staff, 'web');
    $first = $this->postJson('/api/v1/payments', $draft)->assertOk()
        ->assertJsonPath('data.photoUrl', '/api/v1/users/'.$player->id.'/photo')
        ->assertJsonPath('data.balance', $remaining)
        ->assertJsonPath('data.paidAt', $draft['paidAt']);
    $this->postJson('/api/v1/payments', $draft)->assertOk()->assertExactJson($first->json());

    $changed = array_replace($draft, ['amount' => $amount + 1]);
    $this->postJson('/api/v1/payments', $changed)->assertUnprocessable()->assertJsonValidationErrors('requestId');

    $this->assertDatabaseCount('payments', 1);
    $this->assertDatabaseHas('payments', [
        'player_id' => $player->id, 'created_by' => $staff->id, 'amount' => $amount,
        'paid_at' => $draft['paidAt'], 'direction' => $direction, 'note' => $draft['note'],
        'balance_after' => $remaining,
    ]);
    expect($player->refresh()->poker_balance)->toBe($remaining);
})->with([
    [-120, 'player_pays_house', 50, -70],
    [-120, 'player_pays_house', 120, 0],
    [-120, 'player_pays_house', 150, 30],
    [120, 'house_pays_player', 50, 70],
    [120, 'house_pays_player', 120, 0],
    [120, 'house_pays_player', 150, -30],
    [-100, 'house_pays_player', 100, -200],
    [100, 'player_pays_house', 100, 200],
    [0, 'house_pays_player', 25, -25],
    [0, 'player_pays_house', 25, 25],
]);

it('rejects invalid amounts and dates before changing the balance', function (string $field, mixed $value): void {
    $staff = paymentUser(RoleCode::ADMIN);
    $player = paymentUser(RoleCode::PLAYER, -120);
    $draft = paymentDraft($player, 'player_pays_house', 50);
    if ($value === 'tomorrow') {
        $value = today(config('payments.timezone'))->addDay()->toDateString();
    }
    $draft[$field] = $value;

    $this->actingAs($staff, 'web')->postJson('/api/v1/payments', $draft)
        ->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('payments', 0);
    expect($player->refresh()->poker_balance)->toBe(-120);
})->with([
    ['amount', 0], ['amount', -1], ['amount', 1.25], ['amount', 2147483648],
    ['paidAt', 'tomorrow'], ['paidAt', '2026-02-30'], ['note', str_repeat('a', 2001)],
]);

it('rejects an inactive player but accepts a settled player', function (): void {
    $staff = paymentUser(RoleCode::MANAGER);
    $inactive = paymentUser(RoleCode::PLAYER, -120, active: false);
    $settled = paymentUser(RoleCode::PLAYER);
    $owed = paymentUser(RoleCode::PLAYER, 120);
    $this->actingAs($staff, 'web');

    $this->postJson('/api/v1/payments', paymentDraft($inactive, 'player_pays_house', 50))->assertUnprocessable()->assertJsonValidationErrors('playerId');
    $this->postJson('/api/v1/payments', paymentDraft($settled, 'player_pays_house', 50))
        ->assertOk()->assertJsonPath('data.balance', 50);
    $this->postJson('/api/v1/payments', paymentDraft($owed, 'player_pays_house', 50))
        ->assertOk()->assertJsonPath('data.balance', 170);
    $this->assertDatabaseCount('payments', 2);
    expect($settled->refresh()->poker_balance)->toBe(50);
    expect($owed->refresh()->poker_balance)->toBe(170);
});

it('rejects a reused payment ID for a different player or staff member', function (): void {
    $staff = paymentUser(RoleCode::ADMIN);
    $otherStaff = paymentUser(RoleCode::MANAGER);
    $player = paymentUser(RoleCode::PLAYER, -120);
    $otherPlayer = paymentUser(RoleCode::PLAYER, -120);
    $draft = paymentDraft($player, 'player_pays_house', 50);

    $this->actingAs($staff, 'web')->postJson('/api/v1/payments', $draft)->assertOk();
    $this->postJson('/api/v1/payments', array_replace($draft, ['playerId' => $otherPlayer->id]))
        ->assertUnprocessable()->assertJsonValidationErrors('requestId');
    Auth::forgetGuards();
    $this->actingAs($otherStaff, 'web')->postJson('/api/v1/payments', $draft)
        ->assertUnprocessable()->assertJsonValidationErrors('requestId');

    $this->assertDatabaseCount('payments', 1);
    expect($player->refresh()->poker_balance)->toBe(-70);
    expect($otherPlayer->refresh()->poker_balance)->toBe(-120);
});

it('uses the room date even when UTC has already reached tomorrow', function (): void {
    $this->travelTo(Carbon::parse('2026-11-12 02:00:00', 'UTC'));
    $staff = paymentUser(RoleCode::ADMIN);
    $player = paymentUser(RoleCode::PLAYER, -120);
    $draft = paymentDraft($player, 'player_pays_house', 50);

    $this->actingAs($staff, 'web')->getJson('/api/v1/payments/options')
        ->assertOk()->assertJsonPath('today', '2026-11-11');
    $this->postJson('/api/v1/payments', array_replace($draft, ['paidAt' => '2026-11-12']))
        ->assertUnprocessable()->assertJsonValidationErrors('paidAt');
    $this->postJson('/api/v1/payments', array_replace($draft, ['paidAt' => '2026-11-11']))
        ->assertOk()->assertJsonPath('data.balance', -70);
});
