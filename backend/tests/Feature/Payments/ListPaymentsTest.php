<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function addListedPayment(User $player, User $staff, string $paidAt, string $direction = 'player_pays_house'): int
{
    return DB::table('payments')->insertGetId([
        'player_id' => $player->id,
        'created_by' => $staff->id,
        'paid_at' => $paidAt,
        'direction' => $direction,
        'amount' => 75,
        'note' => 'Cash at the desk',
        'balance_after' => 0,
        'request_id' => (string) Str::uuid(),
        'created_at' => now(),
    ]);
}

it('lets each staff role read payments for inactive players recorded by other staff', function (RoleCode $role): void {
    $actor = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => false, 'first_name' => 'Avery', 'last_name' => 'Handoff']);
    $id = addListedPayment($player, $staff, '2026-11-11', 'house_pays_player');

    $this->actingAs($actor)->getJson('/api/v1/payments')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0', [
            'id' => $id,
            'paidAt' => '2026-11-11',
            'player' => 'Avery Handoff',
            'direction' => 'house_pays_player',
            'amount' => 75,
            'note' => 'Cash at the desk',
            'cashoutId' => null,
        ]);
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);

it('rejects guests and Players', function (): void {
    $this->getJson('/api/v1/payments')->assertUnauthorized();
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);
    $this->actingAs($player)->getJson('/api/v1/payments')->assertForbidden();
});

it('paginates newest payment dates first with descending IDs for same-date payments', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);
    $older = addListedPayment($player, $staff, '2026-11-09');
    $sameDate = [];
    foreach (range(1, 5) as $index) {
        $sameDate[] = addListedPayment($player, $staff, '2026-11-11');
    }
    $backdated = addListedPayment($player, $staff, '2026-11-10');

    $this->actingAs($staff)->getJson('/api/v1/payments')->assertOk()
        ->assertJsonPath('data.*.id', array_reverse($sameDate))
        ->assertJsonPath('meta.per_page', 5)
        ->assertJsonPath('meta.total', 7);
    $this->getJson('/api/v1/payments?page=2')->assertOk()
        ->assertJsonPath('data.*.id', [$backdated, $older]);
});

it('matches partial first or last names and combines them with direction before pagination', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $avery = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Handoff']);
    $other = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Sam', 'last_name' => 'River', 'username' => 'avery-test']);
    $housePayment = addListedPayment($avery, $staff, '2026-11-11', 'house_pays_player');
    $playerPayment = addListedPayment($avery, $staff, '2026-11-11');
    addListedPayment($other, $staff, '2026-11-11', 'house_pays_player');

    $this->actingAs($staff)->getJson('/api/v1/payments?search=verY&direction=house_pays_player')
        ->assertOk()->assertJsonPath('data.*.id', [$housePayment])->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/payments?search=andoff')
        ->assertOk()->assertJsonPath('data.*.id', [$playerPayment, $housePayment]);
    $this->getJson('/api/v1/payments?search=avery-test')
        ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
});

it('returns ten payments per profile page with older payments on the next page', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);
    $other = User::factory()->create(['role' => RoleCode::PLAYER]);
    $recent = [];
    for ($index = 0; $index < 10; $index++) {
        $recent[] = addListedPayment($player, $staff, '2026-11-11');
    }
    $older = addListedPayment($player, $staff, '2026-11-10');
    addListedPayment($other, $staff, '2026-11-12');

    $url = '/api/v1/payments?player_id='.$player->id.'&per_page=10';
    $this->actingAs($staff)->getJson($url)->assertOk()
        ->assertJsonPath('data.*.id', array_reverse($recent))
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.total', 11);
    $this->getJson($url.'&page=2')->assertOk()
        ->assertJsonPath('data.*.id', [$older]);
});

it('validates payment list filters', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $this->actingAs($staff)->getJson('/api/v1/payments?direction=invalid&page=0&per_page=100&search='.str_repeat('a', 101))
        ->assertUnprocessable()->assertJsonValidationErrors(['direction', 'page', 'per_page', 'search']);
});

it('filters history by the selected player even when another player has the same name', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $names = ['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Handoff'];
    $selected = User::factory()->create($names);
    $other = User::factory()->create($names);
    $payment = addListedPayment($selected, $staff, '2026-11-11', 'house_pays_player');
    addListedPayment($selected, $staff, '2026-11-11');
    addListedPayment($other, $staff, '2026-11-11', 'house_pays_player');

    $this->actingAs($staff)->getJson('/api/v1/payments?direction=house_pays_player&player_id='.$selected->id)
        ->assertOk()->assertJsonPath('data.*.id', [$payment])->assertJsonPath('meta.total', 1);
});
