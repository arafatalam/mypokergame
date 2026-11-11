<?php

namespace App\Actions\Games;

use App\Enums\RoleCode;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class GetBuyInOptions
{
    /** @return array{games: list<array{id: int, name: string, minimum: int, maximum: int}>, players: list<array{id: int, name: string, openGameId: int|null}>} */
    public function get(): array
    {
        $games = GameSession::query()
            ->where('status', 'open')
            ->orderByDesc('game_date')
            ->orderByDesc('game_number')
            ->get(['id', 'game_name', 'min_buy_in', 'max_buy_in']);

        // A cashed-out visit still ties the player to its game until the game closes.
        $openGameIds = DB::table('player_game_visits')
            ->whereIn('game_session_id', $games->modelKeys())
            ->distinct()
            ->pluck('game_session_id', 'player_id');

        $players = User::query()
            ->where('role', RoleCode::PLAYER->value)
            ->where('is_active', true)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id')
            ->get(['id', 'first_name', 'last_name']);

        $gameOptions = [];
        foreach ($games as $game) {
            $gameOptions[] = [
                'id' => $game->id,
                'name' => $game->game_name,
                'minimum' => $game->min_buy_in,
                'maximum' => $game->max_buy_in,
            ];
        }

        $playerOptions = [];
        foreach ($players as $player) {
            $playerOptions[] = [
                'id' => $player->id,
                'name' => $player->first_name.' '.$player->last_name,
                'openGameId' => $openGameIds->get($player->id),
            ];
        }

        return ['games' => $gameOptions, 'players' => $playerOptions];
    }
}
