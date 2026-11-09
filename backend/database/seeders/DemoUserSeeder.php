<?php

namespace Database\Seeders;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        // These predictable credentials are for local development and tests.
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Demo accounts can only be seeded in local and testing environments.');
        }

        $accounts = [
            ['Morgan', 'Bennett', RoleCode::ADMIN],
            ['Liam', 'Gallant', RoleCode::PLAYER],
            ['Sophie', 'LeBlanc', RoleCode::PLAYER],
            ['Ethan', 'Clarke', RoleCode::PLAYER],
            ['Priya', 'Shah', RoleCode::PLAYER],
            ['Noah', 'Campbell', RoleCode::PLAYER],
            ['Amelia', 'Martin', RoleCode::PLAYER],
            ['Lucas', 'Roy', RoleCode::PLAYER],
            ['Maya', 'Patel', RoleCode::PLAYER],
            ['Owen', 'Fraser', RoleCode::PLAYER],
            ['Chloe', 'Richard', RoleCode::PLAYER],
            ['Daniel', 'Nguyen', RoleCode::PLAYER],
            ['Isabelle', 'Cormier', RoleCode::PLAYER],
            ['Adam', 'Haddad', RoleCode::PLAYER],
            ['Zoe', 'MacDonald', RoleCode::PLAYER],
            ['Mateo', 'Rivera', RoleCode::PLAYER],
        ];

        DB::transaction(function () use ($accounts): void {
            foreach ($accounts as $index => [$firstName, $lastName, $role]) {
                $username = Str::lower($firstName.'.'.$lastName);
                $avatarNumber = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
                $phone = '+1 506-555-01'.str_pad((string) $index, 2, '0', STR_PAD_LEFT);

                // Seed new accounts without resetting passwords on later runs.
                $user = User::query()->firstOrCreate(
                    ['email' => $username.'@demo.example.test'],
                    [
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'username' => $username,
                        'phone' => $phone,
                        'profile_image_path' => 'images/avatars/avatar_'.$avatarNumber.'.png',
                        'role' => $role,
                        'is_active' => true,
                        'must_change_password' => false,
                        'password' => $username,
                    ],
                );

                // Backfill earlier demo accounts while preserving any number already saved.
                if ($user->phone === null && $user->username === $username) {
                    User::query()->whereKey($user->id)->whereNull('phone')->update(['phone' => $phone]);
                }
            }
        });
    }
}
