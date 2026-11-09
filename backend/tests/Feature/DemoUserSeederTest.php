<?php

use App\Enums\RoleCode;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('default seeding includes the super admin and demo accounts', function () {
    config(['superadmin.password' => 'test-superadmin-password']);

    $this->seed();

    $this->assertDatabaseCount('users', 17);
    expect(User::query()->where('role', RoleCode::SUPERADMIN->value)->count())->toBe(1)
        ->and(User::query()->where('role', RoleCode::ADMIN->value)->count())->toBe(1)
        ->and(User::query()->where('role', RoleCode::PLAYER->value)->count())->toBe(15);
});

test('demo seeder creates fifteen players and one admin with usable credentials', function () {
    $this->seed(DemoUserSeeder::class);

    $users = User::all();
    expect($users)->toHaveCount(16)
        ->and($users->where('role', RoleCode::PLAYER))->toHaveCount(15)
        ->and($users->where('role', RoleCode::ADMIN))->toHaveCount(1)
        ->and($users->pluck('phone')->unique())->toHaveCount(16);

    foreach ($users as $user) {
        $credential = Str::lower($user->first_name.'.'.$user->last_name);

        expect($user->username)->toBe($credential)
            ->and($user->phone)->toMatch('/^\+1 506-555-01(?:0[0-9]|1[0-5])$/')
            ->and(Hash::check($credential, $user->password))->toBeTrue()
            ->and($user->is_active)->toBeTrue()
            ->and($user->must_change_password)->toBeFalse();
    }
});

test('rerunning fills missing demo phone numbers and preserves account edits', function () {
    $admin = User::factory()->create([
        'email' => 'morgan.bennett@demo.example.test',
        'username' => 'morgan.bennett',
        'role' => RoleCode::ADMIN,
        'phone' => null,
        'password' => 'a-changed-password',
    ]);

    $this->seed(DemoUserSeeder::class);
    expect($admin->fresh()->phone)->toBe('+1 506-555-0100');

    $admin->update(['phone' => '+1 506-555-0199']);
    $this->seed(DemoUserSeeder::class);

    $this->assertDatabaseCount('users', 16);
    expect($admin->fresh()->password)->toBe($admin->password)
        ->and($admin->fresh()->phone)->toBe('+1 506-555-0199');
});
