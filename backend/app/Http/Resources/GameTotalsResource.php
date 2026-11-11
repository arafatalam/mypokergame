<?php

namespace App\Http\Resources;

use App\Actions\Games\CalculateGameIncome;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameSession */
class GameTotalsResource extends JsonResource
{
    /** @return array{dealerTips: int, gameCosts: int, income: int|null} */
    public function toArray(Request $request): array
    {
        $income = app(CalculateGameIncome::class)->calculate($this->resource);

        return [
            'dealerTips' => $this->dealer_tips,
            'gameCosts' => $this->game_costs,
            'income' => $income,
        ];
    }
}
