<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LoginValidationTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Exercise Sanctum's real session middleware as a first-party frontend.
        config(['sanctum.stateful' => ['localhost:5173']]);
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_login_and_password_are_required(): void
    {
        // Simulate Sam submitting an empty form.
        $response = $this->postJson('/api/v1/login', []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['login', 'password']);
    }

    public function test_unknown_account_returns_422_and_remains_signed_out(): void
    {
        $data = [
            'login' => 'sam',
            'password' => 'example-password',
            'remember' => false,
        ];

        $response = $this->postJson('/api/v1/login', $data);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors([
            'login' => 'These credentials do not match our records.',
        ]);

        $this->assertGuest('web');
    }

    #[DataProvider('loginIdentifiers')]
    public function test_active_account_can_sign_in(string $login): void
    {
        $user = User::factory()->create([
            'username' => 'sam',
            'email' => 'sam@example.test',
        ]);
        // Preserve session data while replacing the pre-login session identifier.
        $this->withSession(['sign_in_marker' => 'preserved']);
        $previousSessionId = $this->app['session']->driver()->getId();

        $response = $this->postJson('/api/v1/login', [
            'login' => $login,
            'password' => 'password',
            'remember' => false,
        ]);

        $response->assertOk();
        $response->assertExactJson(['message' => 'Signed in successfully.']);
        $response->assertSessionHas('sign_in_marker', 'preserved');
        $response->assertSessionHas(Auth::guard('web')->getName(), $user->id);
        $response->assertCookie(config('session.cookie'));
        $response->assertCookieMissing(Auth::guard('web')->getRecallerName());

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNotSame($previousSessionId, $this->app['session']->driver()->getId());
    }

    #[DataProvider('loginIdentifiers')]
    public function test_incorrect_password_returns_422_and_remains_signed_out(string $login): void
    {
        User::factory()->create([
            'username' => 'sam',
            'email' => 'sam@example.test',
        ]);

        $response = $this->postJson('/api/v1/login', [
            'login' => $login,
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors([
            'login' => 'These credentials do not match our records.',
        ]);

        $this->assertGuest('web');
    }

    #[DataProvider('loginIdentifiers')]
    public function test_inactive_account_returns_422_and_remains_signed_out(string $login): void
    {
        User::factory()->create([
            'username' => 'sam',
            'email' => 'sam@example.test',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'login' => $login,
            'password' => 'password',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors([
            'login' => 'These credentials do not match our records.',
        ]);

        $this->assertGuest('web');
    }

    public function test_remember_me_sets_a_remember_cookie(): void
    {
        $user = User::factory()->create(['remember_token' => null]);

        $response = $this->postJson('/api/v1/login', [
            'login' => $user->username,
            'password' => 'password',
            'remember' => true,
        ]);

        $response->assertOk();
        $response->assertCookie(Auth::guard('web')->getRecallerName());

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNotEmpty($user->fresh()->remember_token);
    }

    public function test_omitting_remember_signs_in_without_a_remember_cookie(): void
    {
        $user = User::factory()->create(['remember_token' => null]);

        $response = $this->postJson('/api/v1/login', [
            'login' => $user->username,
            'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertCookieMissing(Auth::guard('web')->getRecallerName());

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNull($user->fresh()->remember_token);
    }

    #[DataProvider('invalidFieldValues')]
    public function test_invalid_field_returns_422(string $field, mixed $value): void
    {
        $data = [
            'login' => 'sam',
            'password' => 'password',
            'remember' => false,
        ];
        $data[$field] = $value;

        $response = $this->postJson('/api/v1/login', $data);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors([$field]);

        $this->assertGuest('web');
    }

    /** @return array<string, array{string}> */
    public static function loginIdentifiers(): array
    {
        return [
            'username' => ['sam'],
            'email' => ['sam@example.test'],
        ];
    }

    /** @return array<string, array{string, mixed}> */
    public static function invalidFieldValues(): array
    {
        return [
            'non-string login' => ['login', ['sam']],
            'non-string password' => ['password', ['password']],
            'non-boolean remember' => ['remember', 'yes'],
        ];
    }
}
