<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use Illuminate\Support\Facades\DB;

class SaveGameTotals
{
    public function save(GameSession $game, int $dealerTips, int $gameCosts): GameSession
    {
        return DB::transaction(function () use ($game, $dealerTips, $gameCosts): GameSession {
            // Use the same game lock as Close Game before changing either amount.
            $current = GameSession::query()->lockForUpdate()->findOrFail($game->id);
            $current->dealer_tips = $dealerTips;
            $current->game_costs = $gameCosts;
            $current->save();

            return $current;
        }, attempts: 3);
    }
}
