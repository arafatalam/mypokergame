<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sanctum.stateful' => ['localhost:7000'],
            'session.driver' => 'database',
        ]);
        $this->withHeader('Origin', 'http://localhost:7000');
    }

    public function test_a_guest_cannot_call_logout(): void
    {
        $response = $this->postJson('/api/v1/logout');

        $response->assertUnauthorized();
    }

    public function test_logout_clears_the_session_and_revokes_saved_access_on_all_devices(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $previousRememberToken = $user->getRememberToken();

        // Represent two other devices plus an unrelated account's session.
        DB::table('sessions')->insert([
            [
                'id' => 'sam-device-one',
                'user_id' => $user->id,
                'payload' => base64_encode('{}'),
                'last_activity' => time(),
            ],
            [
                'id' => 'sam-device-two',
                'user_id' => $user->id,
                'payload' => base64_encode('{}'),
                'last_activity' => time(),
            ],
            [
                'id' => 'another-account-device',
                'user_id' => $otherUser->id,
                'payload' => base64_encode('{}'),
                'last_activity' => time(),
            ],
        ]);

        $this->actingAs($user, 'web');
        $this->withSession(['private_marker' => 'must be removed']);
        $previousSessionId = $this->app['session']->driver()->getId();

        $response = $this->postJson('/api/v1/logout');

        $response->assertOk();
        $response->assertExactJson(['message' => 'Signed out successfully.']);
        $response->assertSessionMissing('private_marker');
        $this->assertGuest('web');
        $this->assertNotSame($previousSessionId, $this->app['session']->driver()->getId());
        $this->assertNotSame($previousRememberToken, $user->fresh()->getRememberToken());
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sessions', [
            'id' => 'another-account-device',
            'user_id' => $otherUser->id,
        ]);

        // Start the next request without a cached guard user.
        Auth::forgetGuards();
        $this->getJson('/api/v1/user')->assertUnauthorized();
    }
}
