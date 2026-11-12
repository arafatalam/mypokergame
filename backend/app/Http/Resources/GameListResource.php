<?php

namespace App\Http\Resources;

use App\Actions\Games\CalculateGameIncome;
use App\Models\Cashout;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameSession */
class GameListResource extends JsonResource
{
    /** @return array{id: int, name: string, gameDate: string, status: string, buyIns: int, endingChips: int, cashPaid: int, dealerTips: int, gameCosts: int, income: int|null} */
    public function toArray(Request $request): array
    {
        $income = app(CalculateGameIncome::class);
        $totals = $income->chipTotals($this->resource);
        $cashPaid = Cashout::query()
            ->join('player_game_visits', 'player_game_visits.id', '=', 'cashouts.player_game_visit_id')
            ->where('player_game_visits.game_session_id', $this->id)
            ->sum('cashouts.cash_paid');

        return [
            'id' => $this->id,
            'name' => $this->game_name,
            'gameDate' => $this->game_date,
            'status' => $this->status,
            'buyIns' => $totals['buyIns'],
            'endingChips' => $totals['endingChips'],
            'cashPaid' => (int) $cashPaid,
            'dealerTips' => $this->dealer_tips,
            'gameCosts' => $this->game_costs,
            'income' => $income->calculateFromTotals($this->resource, $totals),
        ];
    }
}
