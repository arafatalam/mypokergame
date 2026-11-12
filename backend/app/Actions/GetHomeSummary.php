<?php

namespace App\Actions;

use App\Actions\Games\CalculateGameIncome;
use App\Actions\Games\ListLeaderboard;
use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;

class GetHomeSummary
{
    private CalculateGameIncome $gameIncome;

    private ListLeaderboard $leaderboard;

    public function __construct(CalculateGameIncome $gameIncome, ListLeaderboard $leaderboard)
    {
        $this->gameIncome = $gameIncome;
        $this->leaderboard = $leaderboard;
    }

    /**
     * @return array{
     *     toCollect: array{total: int, count: int, players: list<array{id: int, name: string, amount: int}>},
     *     toPay: array{total: int, count: int, players: list<array{id: int, name: string, amount: int}>},
     *     income: array{total: int, count: int, month: string},
     *     leaderboard: list<array{id: int, name: string, winnings: int, rank: int}>
     * }
     */
    public function get(): array
    {
        // Player balances are signed from the player's point of view.
        $balances = User::query()
            ->where('role', RoleCode::PLAYER)
            ->toBase()
            ->selectRaw('
                SUM(CASE WHEN poker_balance < 0 THEN -poker_balance ELSE 0 END) AS collect_total,
                COUNT(CASE WHEN poker_balance < 0 THEN 1 END) AS collect_count,
                SUM(CASE WHEN poker_balance > 0 THEN poker_balance ELSE 0 END) AS pay_total,
                COUNT(CASE WHEN poker_balance > 0 THEN 1 END) AS pay_count
            ')
            ->first();

        $today = now(config('payments.timezone'));
        $games = GameSession::query()->whereBetween('game_date', [
            $today->copy()->startOfMonth()->toDateString(),
            $today->copy()->endOfMonth()->toDateString(),
        ]);
        $income = $this->gameIncome->summarizeClosedGames($games);
        $income['month'] = $today->format('F');
        $leaderboard = [];
        foreach ($this->leaderboard->topFiveForMonth($today->format('Y-m')) as $player) {
            $leaderboard[] = [
                'id' => (int) $player->id,
                'name' => $player->first_name.' '.$player->last_name,
                'winnings' => (int) $player->winnings,
                'rank' => (int) $player->leaderboard_rank,
            ];
        }

        return [
            'toCollect' => [
                'total' => (int) $balances->collect_total,
                'count' => (int) $balances->collect_count,
                'players' => $this->largestBalances(true),
            ],
            'toPay' => [
                'total' => (int) $balances->pay_total,
                'count' => (int) $balances->pay_count,
                'players' => $this->largestBalances(false),
            ],
            'income' => $income,
            'leaderboard' => $leaderboard,
        ];
    }

    /** @return list<array{id: int, name: string, amount: int}> */
    private function largestBalances(bool $toCollect): array
    {
        $players = User::query()->where('role', RoleCode::PLAYER);

        // The largest debt is the most negative balance.
        if ($toCollect) {
            $players->where('poker_balance', '<', 0)->orderBy('poker_balance');
        } else {
            $players->where('poker_balance', '>', 0)->orderByDesc('poker_balance');
        }

        $largest = $players->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id')
            ->limit(5)
            ->get(['id', 'first_name', 'last_name', 'poker_balance']);

        $rows = [];
        foreach ($largest as $player) {
            $rows[] = [
                'id' => $player->id,
                'name' => $player->first_name.' '.$player->last_name,
                'amount' => abs($player->poker_balance),
            ];
        }

        return $rows;
    }
}
