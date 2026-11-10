<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('a manager can save a player name and see it on the reopened profile', function () {
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $player = User::factory()->create([
        'role' => RoleCode::PLAYER,
        'first_name' => 'Alex',
        'last_name' => 'Haddad',
    ]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000');

    $this->patchJson(route('api.v1.users.update', $player), [
        'first_name' => 'Sam',
        'last_name' => $player->last_name,
        'email' => $player->email,
    ])->assertOk()
        ->assertJsonPath('message', 'Account details saved.')
        ->assertJsonPath('id', $player->id)
        ->assertJsonPath('first_name', 'Sam')
        ->assertJsonPath('can_change_photo', true)
        ->assertJsonPath('can_change_password', true)
        ->assertJsonPath('username', 'sam.haddad');

    $this->getJson(route('api.v1.users.show', $player))
        ->assertOk()
        ->assertJsonPath('first_name', 'Sam')
        ->assertJsonPath('can_change_photo', true)
        ->assertJsonPath('can_change_password', true)
        ->assertJsonPath('email', $player->email);
});

test('a staff member can view their own profile without being offered staff photo editing', function () {
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000')
        ->getJson(route('api.v1.users.show', $manager))
        ->assertOk()
        ->assertJsonPath('can_change_photo', false)
        ->assertJsonPath('can_change_password', false);
});

test('a renamed account gets an available suffix and can reuse it when the normalized name stays the same', function () {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN]);
    User::factory()->create(['username' => 'adrian.haddad']);
    $player = User::factory()->create([
        'role' => RoleCode::PLAYER,
        'first_name' => 'Adam',
        'last_name' => 'Haddad',
        'username' => 'adam.haddad',
    ]);

    $this->actingAs($admin, 'web')->withHeader('Origin', 'http://localhost:8000');

    foreach (['Adrian', 'ADRIAN'] as $firstName) {
        $this->patchJson(route('api.v1.users.update', $player), [
            'first_name' => $firstName,
            'last_name' => 'Haddad',
            'email' => $player->email,
        ])->assertOk()->assertJsonPath('username', 'adrian.haddad.01');
    }

    $this->assertDatabaseHas('users', [
        'id' => $player->id,
        'first_name' => 'ADRIAN',
        'username' => 'adrian.haddad.01',
    ]);
});

test('changing only the phone keeps the existing username in the save response', function () {
    $admin = User::factory()->create(['role' => RoleCode::ADMIN]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'username' => 'existing.username']);

    $this->actingAs($admin, 'web')->withHeader('Origin', 'http://localhost:8000')
        ->patchJson(route('api.v1.users.update', $player), [
            'first_name' => $player->first_name,
            'last_name' => $player->last_name,
            'email' => $player->email,
            'phone' => '+1 506-555-0123',
        ])->assertOk()
        ->assertJsonPath('username', 'existing.username')
        ->assertJsonPath('phone', '+1 506-555-0123');
});

test('staff details updates reject invalid fields and another account email', function () {
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000')
        ->patchJson(route('api.v1.users.update', $player), [
            'first_name' => '',
            'last_name' => '',
            'email' => $manager->email,
            'phone' => '5065550123',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone']);

    $this->assertDatabaseHas('users', ['id' => $player->id, 'email' => $player->email]);
});

test('a manager cannot use staff details updates on their own account', function () {
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000')
        ->patchJson(route('api.v1.users.update', $manager), [
            'first_name' => 'Sam',
            'last_name' => $manager->last_name,
            'email' => $manager->email,
        ])->assertForbidden();
});
