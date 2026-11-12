<?php

namespace App\Actions\Games;

use App\Models\BuyIn;
use App\Models\Cashout;
use App\Models\GameSession;
use Illuminate\Database\Eloquent\Builder;

class CalculateGameIncome
{
    public function calculate(GameSession $game): ?int
    {
        if ($game->status !== 'closed') {
            return null;
        }

        $totals = $this->chipTotals($game);

        return $this->calculateFromTotals($game, $totals);
    }

    /** @param array{buyIns: int, endingChips: int} $totals */
    public function calculateFromTotals(GameSession $game, array $totals): ?int
    {
        if ($game->status !== 'closed') {
            return null;
        }

        return $this->netIncome($totals, $game->dealer_tips + $game->game_costs);
    }

    /** @return array{buyIns: int, endingChips: int} */
    public function chipTotals(GameSession $game): array
    {
        return $this->chipTotalsForGames(GameSession::query()->whereKey($game->getKey()));
    }

    /** @param Builder<GameSession> $games
     * @return array{total: int, count: int}
     */
    public function summarizeClosedGames(Builder $games): array
    {
        $closedGames = (clone $games)->where('status', 'closed');
        $expenses = (clone $closedGames)
            ->selectRaw('COUNT(*) as game_count, SUM(dealer_tips + game_costs) as total_expenses')
            ->firstOrFail();
        $chips = $this->chipTotalsForGames($closedGames);

        return [
            'total' => $this->netIncome($chips, (int) $expenses->total_expenses),
            'count' => (int) $expenses->game_count,
        ];
    }

    /**
     * @param  Builder<GameSession>  $games
     * @return array{buyIns: int, endingChips: int}
     */
    private function chipTotalsForGames(Builder $games): array
    {
        $gameIds = (clone $games)->select('game_sessions.id');
        $buyIns = BuyIn::query()
            ->join('player_game_visits', 'player_game_visits.id', '=', 'buy_ins.player_game_visit_id')
            ->whereIn('player_game_visits.game_session_id', $gameIds)
            ->selectRaw('SUM(buy_ins.cash + buy_ins.credit) as total')
            ->value('total');

        $endingChips = Cashout::query()
            ->join('player_game_visits', 'player_game_visits.id', '=', 'cashouts.player_game_visit_id')
            ->whereIn('player_game_visits.game_session_id', $gameIds)
            ->sum('cashouts.ending_chips');

        // Cash paid affects player balances. Game income uses the chips returned.
        return ['buyIns' => (int) $buyIns, 'endingChips' => (int) $endingChips];
    }

    /** @param array{buyIns: int, endingChips: int} $totals */
    private function netIncome(array $totals, int $expenses): int
    {
        return $totals['buyIns'] - $totals['endingChips'] - $expenses;
    }
}
