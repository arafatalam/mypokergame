<?php

namespace App\Actions\Games;

use App\Models\GameSession;

class GetGameTotalsOptions
{
    /** @return list<array{id: int, name: string, status: string}> */
    public function get(bool $openOnly = false): array
    {
        $query = GameSession::query();
        if ($openOnly) {
            $query->where('status', 'open');
        }

        $games = $query->orderByDesc('game_date')
            ->orderByDesc('game_number')
            ->get(['id', 'game_name', 'status']);

        $options = [];
        foreach ($games as $game) {
            $options[] = ['id' => $game->id, 'name' => $game->game_name, 'status' => $game->status];
        }

        return $options;
    }
}
