<?php

namespace App\Http\Resources;

use App\Actions\Games\CalculateGameIncome;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

/** @mixin GameSession */
class CloseGameResource extends JsonResource
{
    /** @return array{buyIns: int, endingChips: int, dealerTips: int, gameCosts: int, openVisits: int} */
    public function toArray(Request $request): array
    {
        $totals = app(CalculateGameIncome::class)->chipTotals($this->resource);
        $openVisits = DB::table('player_game_visits')
            ->where('game_session_id', $this->id)
            ->whereNull('closed_at')
            ->count();

        return [
            'buyIns' => $totals['buyIns'],
            'endingChips' => $totals['endingChips'],
            'dealerTips' => $this->dealer_tips,
            'gameCosts' => $this->game_costs,
            'openVisits' => $openVisits,
        ];
    }
}
