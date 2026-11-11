<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use Illuminate\Support\Carbon;

class GetNextGameDetails
{
    /** @return array{game_number: int, game_name: string} */
    public function get(Carbon $gameDate): array
    {
        $lastGameNumber = GameSession::query()
            ->where('game_date', $gameDate->toDateString())
            ->max('game_number');

        // Start at 1 when this date has no saved games.
        $gameNumber = ($lastGameNumber ?? 0) + 1;
        $formattedDate = strtoupper($gameDate->format('d_M_Y'));
        $gameName = $formattedDate.'_'.$gameNumber;

        return [
            'game_number' => $gameNumber,
            'game_name' => $gameName,
        ];
    }
}
