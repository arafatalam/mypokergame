<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('shares the Home balance permissions', function (RoleCode $role, int $status): void {
    $user = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);

    $this->getJson('/api/v1/outstanding-balances')->assertUnauthorized();
    $this->actingAs($user)->getJson('/api/v1/outstanding-balances')->assertStatus($status);
})->with([
    [RoleCode::SUPERADMIN, 200],
    [RoleCode::ADMIN, 200],
    [RoleCode::MANAGER, 200],
    [RoleCode::PLAYER, 403],
]);

it('lists only outstanding Player balances and combines direction and name filters', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false, 'poker_balance' => 1000]);
    $debt = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Reid', 'poker_balance' => -500, 'is_active' => false]);
    $credit = User::factory()->create(['role' => RoleCode::PLAYER, 'first_name' => 'Avery', 'last_name' => 'Reed', 'poker_balance' => 350]);
    User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 0]);

    $url = '/api/v1/outstanding-balances';
    $this->actingAs($staff)->getJson($url)->assertOk()
        ->assertJsonPath('data.0', ['id' => $debt->id, 'name' => 'Avery Reid', 'balance' => -500])
        ->assertJsonPath('data.*.id', [$debt->id, $credit->id])
        ->assertJsonPath('data.*.balance', [-500, 350]);
    $this->getJson($url.'?search=ave%20rei&direction=collect')->assertOk()
        ->assertJsonPath('data.*.id', [$debt->id]);
    $this->getJson($url.'?search=ave&direction=pay')->assertOk()
        ->assertJsonPath('data.*.id', [$credit->id]);
    $this->getJson($url.'?search=rei&direction=pay')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson($url.'?direction=invalid&page=0')->assertUnprocessable()
        ->assertJsonValidationErrors(['direction', 'page']);
});

it('orders all matching balances by magnitude before taking ten per page', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER, 'is_active' => true, 'must_change_password' => false]);
    $ids = [];
    for ($amount = 1; $amount <= 12; $amount++) {
        $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -$amount]);
        $ids[] = $player->id;
    }
    $url = '/api/v1/outstanding-balances?direction=collect';
    $this->actingAs($staff)->getJson($url)->assertOk()
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('data.*.id', array_slice(array_reverse($ids), 0, 10));
    $this->getJson($url.'&page=2')->assertOk()->assertJsonPath('data.*.id', [$ids[1], $ids[0]]);

    User::query()->whereKey([$ids[0], $ids[1]])->update(['poker_balance' => 0]);
    $this->getJson($url.'&page=2')->assertOk()
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.total', 10);
});
