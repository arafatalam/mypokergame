<?php

namespace Database\Seeders;

use App\Actions\Payments\SavePayment;
use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoPaymentsSeeder extends Seeder
{
    public function run(): void
    {
        $staff = User::query()->where('username', 'skander.ismail')
            ->whereIn('role', [RoleCode::ADMIN->value, RoleCode::MANAGER->value])->sole();
        $date = Carbon::yesterday(config('payments.timezone'))->setTime(22, 30);
        $this->settle($staff, $date, leaveCurrentBalances: true);
    }

    public function settle(User $staff, Carbon $date, bool $leaveCurrentBalances): void
    {
        $payments = app(SavePayment::class);

        foreach (['player_pays_house' => '<', 'house_pays_player' => '>'] as $direction => $operator) {
            $players = User::query()->where('role', RoleCode::PLAYER->value)
                ->where('poker_balance', $operator, 0)->orderByRaw('ABS(poker_balance) DESC')->orderBy('id')->get();
            foreach ($players as $index => $player) {
                // Older balances clear in full. The final session receives partial settlements.
                $balance = abs($player->poker_balance);
                $amount = $leaveCurrentBalances ? min($balance, 25) : $balance;
                $remaining = $balance - $amount;
                $recordedAt = $date->copy()->addMinutes($index);
                $note = $remaining > 0 ? 'Partial settlement.' : 'Outstanding balance settled in full.';

                Carbon::withTestNow($recordedAt, function () use ($payments, $staff, $player, $direction, $amount, $recordedAt, $note): void {
                    $payments->save($staff, $player->id, $direction, $amount, $recordedAt->toDateString(), $note, Str::uuid()->toString());
                });
            }
        }
    }
}
