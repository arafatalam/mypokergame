<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('aggregates only the selected player’s closed games across visits and pages newest first', function (): void {
    $staff = User::factory()->create(['role' => RoleCode::ADMIN, 'is_active' => true, 'must_change_password' => false]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER, 'is_active' => false]);
    $other = User::factory()->create(['role' => RoleCode::PLAYER]);
    $ids = [];

    for ($number = 1; $number <= 13; $number++) {
        $game = DB::table('game_sessions')->insertGetId([
            'game_date' => $number === 10 ? '2026-11-10' : '2026-11-11',
            'game_number' => $number,
            'game_name' => '11_NOV_2026_'.$number,
            'status' => $number === 12 ? 'open' : 'closed',
            'min_buy_in' => 100,
            'max_buy_in' => 500,
            'created_by' => $staff->id,
        ]);
        $ids[] = $game;

        foreach ([$number === 13 ? $other : $player, $other, $number === 11 ? $player : $other] as $participant) {
            $visit = DB::table('player_game_visits')->insertGetId([
                'game_session_id' => $game,
                'player_id' => $participant->id,
                'opened_at' => now(),
            ]);
            DB::table('buy_ins')->insert([
                'player_game_visit_id' => $visit,
                'created_by' => $staff->id,
                'cash' => 60,
                'credit' => 40,
                'balance_after' => 0,
                'request_id' => Str::uuid()->toString(),
                'created_at' => now(),
            ]);
            DB::table('cashouts')->insert([
                'player_game_visit_id' => $visit,
                'created_by' => $staff->id,
                'ending_chips' => $participant->is($player) ? 140 : 10,
                'cash_paid' => 0,
                'balance_after' => 0,
                'created_at' => now(),
            ]);
        }
    }

    $url = '/api/v1/users/'.$player->id.'/game-history';
    $this->actingAs($staff)->getJson($url)->assertOk()
        ->assertJsonPath('data.*.id', [$ids[10], ...array_reverse(array_slice($ids, 0, 9))])
        ->assertJsonPath('data.0.netResult', 80)
        ->assertJsonPath('data.1.netResult', 40)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.total', 11);
    $this->getJson($url.'?page=2')->assertOk()
        ->assertJsonPath('data.*.id', [$ids[9]]);
});

it('shares the history permission with the profile and protects the endpoint', function (RoleCode $role, bool $allowed): void {
    $actor = User::factory()->create(['role' => $role, 'is_active' => true, 'must_change_password' => false]);
    $player = $allowed ? User::factory()->create(['role' => RoleCode::PLAYER]) : $actor;
    $url = '/api/v1/users/'.$player->id;

    $this->actingAs($actor)->getJson($url)->assertOk()
        ->assertJsonPath('can_view_game_history', $allowed);
    $response = $this->getJson($url.'/game-history')->assertStatus($allowed ? 200 : 403);
    if ($allowed) {
        $response->assertJsonCount(0, 'data');
    }
})->with([
    [RoleCode::SUPERADMIN, true],
    [RoleCode::ADMIN, true],
    [RoleCode::MANAGER, true],
    [RoleCode::PLAYER, false],
]);
