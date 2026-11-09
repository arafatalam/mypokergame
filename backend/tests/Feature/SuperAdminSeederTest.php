<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class SuperAdminSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_seeder_creates_the_super_admin(): void
    {
        // Use a test password instead of the installation's real password.
        config([
            'superadmin.password' => 'test-password-123',
        ]);

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', [
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'super.admin@example.test',
            'username' => 'super.admin',
            'profile_image_path' => 'images/avatars/super_admin.png',
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $user = User::query()->sole();
        $this->assertTrue(Hash::check('test-password-123', $user->password));
        $this->assertNotSame('test-password-123', $user->password);
    }

    public function test_repeated_seeding_preserves_existing_super_admin_even_without_a_password(): void
    {
        config(['superadmin.password' => 'original-password']);
        $this->seed(SuperAdminSeeder::class);
        $user = User::query()->sole();

        // Simulate details changed by the account owner after installation.
        $user->forceFill([
            'first_name' => 'Changed',
            'last_name' => 'Owner',
            'email' => 'owner@example.test',
            'username' => 'owner',
            'phone' => '+15065550123',
            'profile_image_path' => 'images/avatars/avatar_01.png',
            'is_active' => false,
            'must_change_password' => true,
            'password' => 'owner-new-password',
        ])->save();
        $original = $user->fresh()->getAttributes();
        config(['superadmin.password' => null]);

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertSame($original, $user->fresh()->getAttributes());
    }

    public function test_repeated_seeding_does_not_replace_password_with_new_configured_password(): void
    {
        config(['superadmin.password' => 'original-password']);
        $this->seed(SuperAdminSeeder::class);
        $user = User::query()->sole();
        $original = $user->getAttributes();
        config(['superadmin.password' => 'replacement-password']);

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertSame($original, $user->fresh()->getAttributes());
    }

    #[DataProvider('invalidPasswords')]
    public function test_rejects_unsuitable_password_without_creating_a_user(mixed $password): void
    {
        config(['superadmin.password' => $password]);

        try {
            $this->seed(SuperAdminSeeder::class);
            $this->fail('The seeder accepted an unsuitable password.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Set SUPER_ADMIN_PASSWORD to at least 8 characters and at most 72 bytes.',
                $exception->getMessage()
            );
        }

        $this->assertDatabaseEmpty('users');
    }

    /** @return array<string, array{mixed}> */
    public static function invalidPasswords(): array
    {
        return [
            'missing' => [null],
            'empty' => [''],
            'non-string' => [12345678],
            'seven characters' => ['1234567'],
            'seven multibyte characters' => [str_repeat('é', 7)],
            '73 bytes' => [str_repeat('a', 73)],
            'multibyte over 72 bytes' => [str_repeat('é', 37)],
        ];
    }

    #[DataProvider('validPasswords')]
    public function test_accepts_password_boundaries(string $password): void
    {
        config(['superadmin.password' => $password]);

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $user = User::query()->sole();
        $this->assertTrue(Hash::check($password, $user->password));
    }

    /** @return array<string, array{string}> */
    public static function validPasswords(): array
    {
        return [
            'eight characters' => ['12345678'],
            '72 bytes' => [str_repeat('a', 72)],
            'eight multibyte characters' => [str_repeat('é', 8)],
            '72 multibyte bytes' => [str_repeat('é', 36)],
        ];
    }

    public function test_uses_configured_account_details(): void
    {
        config([
            'superadmin.first_name' => 'Installation',
            'superadmin.last_name' => 'Owner',
            'superadmin.email' => 'installation@example.test',
            'superadmin.username' => 'installation.owner',
            'superadmin.profile_image_path' => 'images/avatars/avatar_02.png',
            'superadmin.password' => 'installation-password',
        ]);

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseHas('users', [
            'first_name' => 'Installation',
            'last_name' => 'Owner',
            'email' => 'installation@example.test',
            'username' => 'installation.owner',
            'profile_image_path' => 'images/avatars/avatar_02.png',
        ]);
    }

    #[DataProvider('otherRoles')]
    public function test_other_roles_do_not_prevent_super_admin_creation(string $role): void
    {
        config(['superadmin.password' => 'test-password-123']);
        $this->seed(SuperAdminSeeder::class);
        $existingUser = User::query()->sole();
        $existingUser->forceFill([
            'role' => $role,
            'email' => 'existing@example.test',
            'username' => 'existing',
        ])->save();
        $original = $existingUser->fresh()->getAttributes();

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseHas('users', [
            'email' => 'super.admin@example.test',
            'role' => 'super_admin',
        ]);
        $this->assertSame($original, $existingUser->fresh()->getAttributes());
    }

    /** @return array<string, array{string}> */
    public static function otherRoles(): array
    {
        return [
            'player' => ['player'],
            'admin' => ['admin'],
            'manager' => ['manager'],
        ];
    }
}
