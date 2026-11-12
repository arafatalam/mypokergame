<?php

namespace Database\Seeders;

use App\Actions\Games\CloseGameSession;
use App\Actions\Games\GetNextGameDetails;
use App\Actions\Games\SaveBuyIn;
use App\Actions\Games\SaveCashout;
use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoGamesSeeder extends Seeder
{
    public function run(GetNextGameDetails $details, SaveBuyIn $buyIn, SaveCashout $cashout, CloseGameSession $close, DemoPaymentsSeeder $payments): void
    {
        $staff = User::query()->where('username', 'skander.ismail')
            ->whereIn('role', [RoleCode::ADMIN->value, RoleCode::MANAGER->value])->sole();
        $players = User::query()->where('role', RoleCode::PLAYER->value)->orderBy('id')->get();
        $regulars = $players;
        $gameIndex = 0;

        $lastDay = Carbon::yesterday(config('payments.timezone'));
        $firstMonth = $lastDay->copy()->startOfMonth()->subMonths(14);

        for ($monthIndex = 0; $monthIndex < 15; $monthIndex++) {
            $month = $firstMonth->copy()->addMonths($monthIndex);
            $isFinalMonth = $monthIndex === 14;
            $daysAvailable = $isFinalMonth ? $lastDay->day : $month->daysInMonth;
            $gameCount = min(10, $daysAvailable);

            for ($dayIndex = 1; $dayIndex <= $gameCount; $dayIndex++) {
                $day = intdiv($dayIndex * $daysAvailable, $gameCount);
                $date = $month->copy()->day($day)->setTime(18, 0);
                $isFinalGame = $isFinalMonth && $dayIndex === $gameCount;
                // Rotate the roster so every regular plays, then vary the turnout.
                $offset = $gameIndex * 7 % $regulars->count();
                $roster = $regulars->slice($offset)->concat($regulars->take($offset))->take(random_int(10, 18));
                if ($isFinalGame) {
                    $roster = $players->shuffle()->take(30);
                }

                $game = Carbon::withTestNow($date, function () use ($details, $date, $staff): GameSession {
                    return GameSession::query()->create($details->get($date) + [
                        'game_date' => $date->toDateString(),
                        'status' => 'open',
                        'min_buy_in' => 50,
                        'max_buy_in' => 300,
                        'created_by' => $staff->id,
                    ]);
                });

                $visits = [];
                $totalBuyIns = 0;
                foreach ($roster->values() as $seat => $player) {
                    $amountBought = 0;
                    $debt = $isFinalGame && $seat < 15 ? random_int(28, 31) * 25 : 0;
                    $deferred = $isFinalGame && $seat >= 15 ? random_int(20, 24) * 25 : 0;
                    $creditLimit = random_int(max(4, intdiv($debt, 25)), 80) * 25;
                    $remainingCredit = $creditLimit;
                    $purchases = $isFinalGame ? 4 : random_int(2, 5);
                    for ($purchase = 0; $purchase < $purchases; $purchase++) {
                        $amount = $isFinalGame ? random_int(8, 12) * 25 : random_int(2, 12) * 25;
                        $credit = 0;
                        if ($isFinalGame) {
                            // The final roster includes 15 unsettled losses and 15 delayed payouts.
                            $credit = min($amount, max(0, $debt - ($creditLimit - $remainingCredit)));
                        } elseif (random_int(1, 4) === 1) {
                            $credit = min($remainingCredit, random_int(1, intdiv($amount, 25)) * 25);
                        }
                        $remainingCredit -= $credit;

                        $recordedAt = $date->copy()->addMinutes($purchase * 40 + $seat);
                        $receipt = Carbon::withTestNow($recordedAt, function () use ($buyIn, $staff, $game, $player, $amount, $credit): array {
                            return $buyIn->save($staff, $game->id, $player->id, $amount - $credit, $credit, Str::uuid()->toString());
                        });
                        $amountBought += $amount;
                    }

                    $weight = $amountBought * random_int(0, 24);
                    if ($isFinalGame && $debt > 0) {
                        $weight = 0;
                    }
                    $visits[] = ['player' => $player, 'id' => $receipt['visitId'], 'weight' => $weight, 'deferred' => $deferred];
                    $totalBuyIns += $amountBought;
                }

                // Allocate returns from a shared pool after retaining 5–9% for the house.
                $pool = intdiv($totalBuyIns * random_int(91, 95), 100);
                $remainingPool = $pool - array_sum(array_column($visits, 'deferred'));
                $totalWeight = max(1, array_sum(array_column($visits, 'weight')));
                foreach ($visits as $seat => $visit) {
                    $chips = $visit['deferred'] + intdiv($remainingPool * $visit['weight'], $totalWeight);
                    $balance = $visit['player']->fresh()->poker_balance;
                    // Apply returned chips to debt first. Usually pay the rest in cash.
                    $paid = max(0, $chips + min(0, $balance));
                    if ($isFinalGame) {
                        $paid -= $visit['deferred'];
                    } elseif (random_int(1, 4) === 1) {
                        $paid -= min($paid, random_int(2, 12) * 25);
                    }

                    Carbon::withTestNow($date->copy()->addMinutes(210 + $seat), function () use ($cashout, $staff, $game, $visit, $chips, $paid): void {
                        $cashout->save($staff, $game->id, $visit['player']->id, $visit['id'], $chips, $paid, Str::uuid()->toString());
                    });
                }

                Carbon::withTestNow($date->copy()->addHours(4), function () use ($close, $game, $staff, $roster): void {
                    $close->close($game, $staff, [
                        'dealerTips' => $roster->count() * random_int(4, 8),
                        'gameCosts' => random_int(5, 18) * 5,
                    ]);
                });

                if ($isFinalMonth && $dayIndex === $gameCount - 1) {
                    // Settle older balances before recording the latest game's outstanding amounts.
                    $payments->settle($staff, $date->copy()->setTime(22, 30), leaveCurrentBalances: false);
                }

                $gameIndex++;
            }

            if (! $isFinalMonth) {
                $payments->settle($staff, $month->copy()->endOfMonth()->setTime(22, 30), leaveCurrentBalances: false);
            }
        }
    }
}
