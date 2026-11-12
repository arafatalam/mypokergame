<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('offers payment history to staff on active and inactive Player profiles', function (RoleCode $role): void {
    $staff = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);

    foreach ([true, false] as $isActive) {
        $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => $isActive]);
        $this->actingAs($staff)->getJson('/api/v1/users/'.$player->id)
            ->assertOk()->assertJsonPath('can_view_payment_history', true);
    }
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);

it('denies payment history access on Player self profiles and staff profiles', function (): void {
    foreach ([RoleCode::PLAYER, RoleCode::ADMIN] as $role) {
        $user = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
        $this->actingAs($user)->getJson('/api/v1/users/'.$user->id)
            ->assertOk()->assertJsonPath('can_view_payment_history', false);
    }
});
