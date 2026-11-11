<?php

namespace App\Actions\Games;

use App\Enums\RoleCode;
use App\Models\BuyIn;
use App\Models\GameSession;
use Illuminate\Support\Facades\DB;

class GetCashoutOptions
{
    /** @return array{games: list<array{id: int, name: string}>, players: list<array{id: int, gameId: int, visitId: int, name: string, totalBuyIn: int}>} */
    public function get(): array
    {
        $games = GameSession::query()->where('status', 'open')
            ->orderByDesc('game_date')->orderByDesc('game_number')->get(['id', 'game_name']);

        // Sum the player's purchases across the game, including any earlier visits.
        $gameBuyIns = BuyIn::query()
            ->join('player_game_visits as purchases', 'purchases.id', '=', 'buy_ins.player_game_visit_id')
            ->whereColumn('purchases.game_session_id', 'visits.game_session_id')
            ->whereColumn('purchases.player_id', 'visits.player_id')
            ->selectRaw('SUM(buy_ins.cash + buy_ins.credit)');

        $visits = DB::table('player_game_visits as visits')
            ->join('users', 'users.id', '=', 'visits.player_id')
            ->whereIn('visits.game_session_id', $games->modelKeys())
            ->where('users.role', RoleCode::PLAYER->value)
            ->whereNull('visits.closed_at')
            ->whereNotExists(function ($query): void {
                $query->select('newer.id')->from('player_game_visits as newer')
                    ->whereColumn('newer.game_session_id', 'visits.game_session_id')
                    ->whereColumn('newer.player_id', 'visits.player_id')
                    ->whereColumn('newer.id', '>', 'visits.id');
            })
            ->whereNotExists(function ($query): void {
                $query->select('cashouts.id')->from('cashouts')
                    ->whereColumn('cashouts.player_game_visit_id', 'visits.id');
            })
            ->whereExists(function ($query): void {
                $query->select('buy_ins.id')->from('buy_ins')
                    ->whereColumn('buy_ins.player_game_visit_id', 'visits.id');
            })
            ->orderBy('users.first_name')->orderBy('users.last_name')->orderBy('visits.id')
            ->select('visits.id', 'visits.game_session_id', 'visits.player_id', 'users.first_name', 'users.last_name')
            ->addSelect(['total_buy_in' => $gameBuyIns])
            ->get();

        $gameOptions = [];
        foreach ($games as $game) {
            $gameOptions[] = ['id' => $game->id, 'name' => $game->game_name];
        }

        $playerOptions = [];
        foreach ($visits as $visit) {
            $playerOptions[] = [
                'id' => (int) $visit->player_id,
                'gameId' => (int) $visit->game_session_id,
                'visitId' => (int) $visit->id,
                'name' => $visit->first_name.' '.$visit->last_name,
                'totalBuyIn' => (int) $visit->total_buy_in,
            ];
        }

        return ['games' => $gameOptions, 'players' => $playerOptions];
    }
}
