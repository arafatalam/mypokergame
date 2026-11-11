<?php

namespace App\Actions\Games;

use App\Models\BuyIn;
use App\Models\Cashout;
use App\Models\GameSession;

class CalculateGameIncome
{
    public function calculate(GameSession $game): ?int
    {
        if ($game->status !== 'closed') {
            return null;
        }

        $totals = $this->chipTotals($game);

        return $totals['buyIns'] - $totals['endingChips'] - $game->dealer_tips - $game->game_costs;
    }

    /** @return array{buyIns: int, endingChips: int} */
    public function chipTotals(GameSession $game): array
    {
        $buyIns = BuyIn::query()
            ->join('player_game_visits', 'player_game_visits.id', '=', 'buy_ins.player_game_visit_id')
            ->where('player_game_visits.game_session_id', $game->id)
            ->selectRaw('SUM(buy_ins.cash + buy_ins.credit) as total')
            ->value('total');

        $endingChips = Cashout::query()
            ->join('player_game_visits', 'player_game_visits.id', '=', 'cashouts.player_game_visit_id')
            ->where('player_game_visits.game_session_id', $game->id)
            ->sum('cashouts.ending_chips');

        // Cash paid affects player balances. Game income uses the chips returned.
        return ['buyIns' => (int) $buyIns, 'endingChips' => (int) $endingChips];
    }
}
