<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('the default seed builds a complete demo history with balanced ledger entries', function () {
    config(['superadmin.password' => 'test-superadmin-password']);
    $this->travelTo(now(config('payments.timezone'))->setDate(2026, 11, 12)->setTime(12, 0));
    $this->seed();

    $this->assertDatabaseCount('users', 52);
    $staff = User::query()->where('username', 'skander.ismail')->sole();
    expect($staff->first_name)->toBe('Skander')
        ->and($staff->last_name)->toBe('Ismail')
        ->and(Hash::check('skander.ismail', $staff->password))->toBeTrue();
    expect(User::query()->where('role', RoleCode::PLAYER->value)->where('is_active', true)->count())->toBe(50);

    $games = DB::table('game_sessions')->orderBy('game_date')->get();
    expect($games)->toHaveCount(150)
        ->and($games->pluck('game_date')->unique())->toHaveCount(150)
        ->and($games->last()->game_date)->toBe('2026-11-11')
        ->and($games->first()->game_date)->toStartWith('2025-09');
    $months = $games->groupBy(fn ($game) => substr($game->game_date, 0, 7));
    expect($months)->toHaveCount(15)
        ->and($months->map->count()->unique()->values()->all())->toBe([10]);

    foreach ($games as $game) {
        expect($game->status)->toBe('closed')
            ->and($game->game_name)->toEndWith('_1')
            ->and($game->dealer_tips)->toBeGreaterThan(0)
            ->and($game->game_costs)->toBeGreaterThan(0);
        $visits = DB::table('player_game_visits')->where('game_session_id', $game->id)->get();
        expect($visits->count())->toBeGreaterThanOrEqual(10)
            ->and($visits->pluck('player_id')->unique())->toHaveCount($visits->count());
        $buyIns = DB::table('buy_ins')->whereIn('player_game_visit_id', $visits->pluck('id'))->get();
        $cashouts = DB::table('cashouts')->whereIn('player_game_visit_id', $visits->pluck('id'))->get();
        expect($cashouts)->toHaveCount($visits->count())
            ->and($buyIns->groupBy('player_game_visit_id')->map->count()->min())->toBeGreaterThanOrEqual(2)
            ->and($buyIns->groupBy('player_game_visit_id')->map->sum('credit')->max())->toBeLessThanOrEqual(2000)
            ->and($buyIns->sum('cash') + $buyIns->sum('credit'))->toBeGreaterThan($cashouts->sum('ending_chips'));
    }

    $settlements = DB::table('payments')->whereNull('cashout_id')->pluck('direction')->unique()->sort()->values()->all();
    $corrected = DB::table('correction_history')->join('payments', 'payments.id', '=', 'correction_history.payment_id')
        ->pluck('payments.direction')->unique()->sort()->values()->all();
    expect($settlements)->toBe(['house_pays_player', 'player_pays_house'])
        ->and($corrected)->toBe($settlements);

    $ledger = DB::table('player_game_visits as visits')
        ->join('buy_ins', 'buy_ins.player_game_visit_id', '=', 'visits.id')
        ->groupBy('visits.player_id')->selectRaw('visits.player_id, SUM(buy_ins.credit) AS credit')->get()->keyBy('player_id');
    $cashouts = DB::table('player_game_visits as visits')
        ->join('cashouts', 'cashouts.player_game_visit_id', '=', 'visits.id')
        ->groupBy('visits.player_id')->selectRaw('visits.player_id, SUM(cashouts.ending_chips - CAST(cashouts.cash_paid AS SIGNED)) AS unpaid')
        ->get()->keyBy('player_id');
    $payments = DB::table('payments')->whereNull('cashout_id')->get()->groupBy('player_id');

    foreach (User::query()->where('role', RoleCode::PLAYER->value)->get() as $player) {
        $balance = (int) $cashouts[$player->id]->unpaid - (int) $ledger[$player->id]->credit;
        foreach ($payments->get($player->id, []) as $payment) {
            $balance += $payment->direction === 'player_pays_house' ? $payment->amount : -$payment->amount;
        }
        expect($player->poker_balance)->toBe($balance);
    }
    $toPay = User::query()->where('poker_balance', '>', 0);
    $toCollect = User::query()->where('poker_balance', '<', 0);
    expect((clone $toPay)->count())->toBeGreaterThanOrEqual(15)
        ->and((clone $toCollect)->count())->toBeGreaterThanOrEqual(15)
        ->and((int) $toPay->sum('poker_balance'))->toBeBetween(7000, 9000)
        ->and(abs((int) $toCollect->sum('poker_balance')))->toBeBetween(10000, 12000);

});

test('demo seeding rejects a populated database without adding data', function () {
    User::factory()->create(['role' => RoleCode::PLAYER]);

    expect(fn () => $this->seed())->toThrow(RuntimeException::class, 'Demo seeding requires a fresh database');
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('game_sessions', 0);
});
