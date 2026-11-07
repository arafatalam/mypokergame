<?php

namespace Database\Seeders;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Never overwrite an existing SuperAdmin's details or password.
        $superAdminExists = User::query()
            ->where('role', RoleCode::SUPERADMIN->value)
            ->exists();

        if ($superAdminExists) {
            return;
        }

        $password = config('superadmin.password');

        // Stop before creating the account if its password is unsuitable.
        if (! is_string($password) || mb_strlen($password) < 8 || strlen($password) > 72) {
            throw new RuntimeException(
                'Set SUPER_ADMIN_PASSWORD to at least 8 characters and at most 72 bytes.'
            );
        }

        $user = new User([
            'first_name' => config('superadmin.first_name'),
            'last_name' => config('superadmin.last_name'),
            'email' => config('superadmin.email'),
            'username' => config('superadmin.username'),
            'profile_image_path' => config('superadmin.profile_image_path'),
            'role' => RoleCode::SUPERADMIN,
            'is_active' => true,
            'must_change_password' => false,
            'password' => $password,
        ]);

        $user->save();
    }
}
