<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('lets staff load a Player tab with empty activity', function (RoleCode $role): void {
    $staff = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => 75, 'is_active' => true]);

    $this->actingAs($staff, 'web')->getJson('/api/v1/users/'.$player->id.'/player-tab')
        ->assertOk()
        ->assertExactJson(['data' => [
            'player_since' => $player->created_at->toDateString(),
            'balance' => 75,
            'can_record_payment' => true,
            'last_payment' => null,
            'last_game' => null,
        ]]);
})->with([RoleCode::SUPERADMIN, RoleCode::ADMIN, RoleCode::MANAGER]);

it('restricts the tab to staff viewing Player accounts', function (): void {
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);
    $path = '/api/v1/users/'.$player->id.'/player-tab';
    $this->getJson($path)->assertUnauthorized();
    $this->actingAs($player, 'web')->getJson($path)->assertForbidden();
});

it('returns not found for a staff account with no Player tab', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::SUPERADMIN]);

    $this->actingAs($staff, 'web')->getJson('/api/v1/users/'.$staff->id.'/player-tab')->assertNotFound();
});

it('uses effective activity dates for the selected player', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => -20]);
    $other = User::factory()->create(['role' => RoleCode::PLAYER]);

    foreach ([[$player, '2026-11-11', 50], [$player, '2026-11-09', 10], [$other, '2026-11-12', 200]] as [$owner, $date, $amount]) {
        DB::table('payments')->insert([
            'player_id' => $owner->id,
            'created_by' => $staff->id,
            'paid_at' => $date,
            'amount' => $amount,
            'direction' => 'player_pays_house',
            'balance_after' => -20,
            'request_id' => (string) Str::uuid(),
            'created_at' => now(),
        ]);
    }

    foreach ([[$player, '2026-11-10', 'Friday Night'], [$player, '2026-11-08', 'Earlier Game'], [$other, '2026-11-12', 'Other Game']] as [$owner, $date, $name]) {
        $gameId = DB::table('game_sessions')->insertGetId([
            'game_date' => $date,
            'game_name' => $name,
            'game_number' => 1,
            'created_by' => $staff->id,
            'min_buy_in' => 100,
            'max_buy_in' => 500,
        ]);
        DB::table('player_game_visits')->insert([
            'game_session_id' => $gameId,
            'player_id' => $owner->id,
            'opened_at' => now(),
        ]);
    }

    $this->actingAs($staff, 'web')->getJson('/api/v1/users/'.$player->id.'/player-tab')
        ->assertOk()
        ->assertJsonPath('data.balance', -20)
        ->assertJsonPath('data.last_payment', ['amount' => 50, 'paid_at' => '2026-11-11'])
        ->assertJsonPath('data.last_game', ['game_name' => 'Friday Night', 'game_date' => '2026-11-10']);
});

it('allows the payment shortcut for active settled Players and disables it for inactive Players', function (int $balance, bool $active, bool $canRecordPayment): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'poker_balance' => $balance, 'is_active' => $active]);

    $this->actingAs($staff, 'web')->getJson('/api/v1/users/'.$player->id.'/player-tab')
        ->assertOk()
        ->assertJsonPath('data.can_record_payment', $canRecordPayment);
})->with([[0, true, true], [-25, false, false]]);
