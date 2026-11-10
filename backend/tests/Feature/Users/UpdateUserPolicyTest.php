<?php

use App\Enums\RoleCode;
use App\Models\User;
use App\Policies\UserPolicy;
use Tests\TestCase;

uses(TestCase::class);

test('a manager can edit a different account with the player role', function () {
    $manager = User::factory()->make(['id' => 1, 'role' => RoleCode::MANAGER]);
    $player = User::factory()->make(['id' => 2, 'role' => RoleCode::PLAYER]);

    expect((new UserPolicy)->update($manager, $player))->toBeTrue();
});
