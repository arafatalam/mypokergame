<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

beforeEach(function (): void {
    config([
        'sanctum.stateful' => ['localhost:8000'],
        'session.driver' => 'database',
    ]);

    $this->withHeader('Origin', 'http://localhost:8000');
});

test('guests cannot update a password', function (): void {
    $target = User::factory()->create();

    $this->patchJson(route('api.v1.users.password.update', $target))
        ->assertUnauthorized();
});

test('password update permission follows the staff hierarchy', function (RoleCode $actorRole, RoleCode $targetRole, bool $allowed): void {
    $actor = User::factory()->create(['role' => $actorRole]);
    $target = User::factory()->create(['role' => $targetRole]);

    $response = $this->actingAs($actor, 'web')
        ->patchJson(route('api.v1.users.password.update', $target));

    if ($allowed) {
        $response->assertUnprocessable()->assertJsonValidationErrors('password');
    } else {
        $response->assertForbidden();
    }
})->with([
    [RoleCode::SUPERADMIN, RoleCode::ADMIN, true],
    [RoleCode::ADMIN, RoleCode::MANAGER, true],
    [RoleCode::MANAGER, RoleCode::PLAYER, true],
    [RoleCode::ADMIN, RoleCode::SUPERADMIN, false],
    [RoleCode::MANAGER, RoleCode::ADMIN, false],
    [RoleCode::MANAGER, RoleCode::MANAGER, false],
    [RoleCode::PLAYER, RoleCode::PLAYER, false],
]);

test('invalid passwords leave the password and remember token unchanged', function (mixed $password, mixed $confirmation): void {
    $actor = User::factory()->create(['role' => RoleCode::PLAYER]);
    $previousPassword = $actor->password;
    $previousToken = $actor->getRememberToken();

    $this->actingAs($actor, 'web')
        ->patchJson(route('api.v1.users.password.update', $actor), [
            'password' => $password,
            'password_confirmation' => $confirmation,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $actor->refresh();
    expect($actor->password)->toBe($previousPassword)
        ->and($actor->getRememberToken())->toBe($previousToken);
})->with([
    'missing confirmation' => ['sample-password', null],
    'mismatch' => ['sample-password', 'another-password'],
    'too short' => ['1234567', '1234567'],
    'too many bytes' => [str_repeat('é', 37), str_repeat('é', 37)],
    'null byte' => ["sample\0password", "sample\0password"],
    'array' => [['sample-password'], ['sample-password']],
]);

test('a staff update revokes only the target account access', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::MANAGER]);
    $target = User::factory()->create(['role' => RoleCode::PLAYER]);
    $previousToken = $target->getRememberToken();
    $staffToken = $staff->getRememberToken();

    foreach (['target-one' => $target, 'target-two' => $target, 'staff-other-device' => $staff] as $id => $user) {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'payload' => base64_encode('{}'),
            'last_activity' => time(),
        ]);
    }

    $newPassword = str_repeat('é', 36);
    $this->actingAs($staff, 'web')
        ->patchJson(route('api.v1.users.password.update', $target), [
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ])
        ->assertOk()
        ->assertExactJson(['message' => 'Password updated successfully.', 'signed_out' => false]);

    expect(Hash::check($newPassword, $target->fresh()->password))->toBeTrue()
        ->and(Auth::guard('web')->getProvider()->retrieveByToken($target->id, $previousToken))->toBeNull()
        ->and($staff->fresh()->getRememberToken())->toBe($staffToken);

    $this->assertDatabaseMissing('sessions', ['user_id' => $target->id]);
    $this->assertDatabaseHas('sessions', ['id' => 'staff-other-device', 'user_id' => $staff->id]);
    $this->assertAuthenticatedAs($staff, 'web');

    Auth::forgetGuards();
    $this->postJson(route('api.v1.login'), [
        'login' => $target->username,
        'password' => 'password',
    ])->assertUnprocessable()->assertJsonValidationErrors('login');

    $this->postJson(route('api.v1.login'), [
        'login' => $target->username,
        'password' => $newPassword,
    ])->assertOk();
    $this->assertAuthenticatedAs($target, 'web');
});

test('a self-service update keeps the current browser signed in', function (): void {
    $actor = User::factory()->create(['role' => RoleCode::PLAYER]);
    $previousToken = $actor->getRememberToken();

    $this->postJson(route('api.v1.login'), [
        'login' => $actor->username,
        'password' => 'password',
    ])->assertOk();

    $previousSessionId = session()->getId();
    // Reuse the sign-in cookie across requests, as the browser does.
    $this->withCredentials()->withCookie(config('session.cookie'), $previousSessionId);

    Auth::forgetGuards();
    $this->getJson('/api/v1/user')->assertOk();

    Auth::forgetGuards();
    $this->patchJson(route('api.v1.users.password.update', $actor), [
        'password' => 'new player password',
        'password_confirmation' => 'new player password',
    ])
        ->assertOk()
        ->assertJsonPath('signed_out', false);

    expect(Hash::check('new player password', $actor->fresh()->password))->toBeTrue()
        ->and($actor->fresh()->getRememberToken())->toBe($previousToken)
        ->and(session()->getId())->toBe($previousSessionId);

    Auth::forgetGuards();
    $this->getJson('/api/v1/user')->assertOk()->assertJsonPath('id', $actor->id);
});
