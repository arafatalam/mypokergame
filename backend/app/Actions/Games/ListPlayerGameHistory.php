<?php

namespace App\Actions\Games;

use App\Models\BuyIn;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListPlayerGameHistory
{
    /** @return LengthAwarePaginator<int, GameSession> */
    public function get(User $player): LengthAwarePaginator
    {
        $visits = DB::table('player_game_visits')
            ->where('player_id', $player->id)
            ->whereColumn('game_session_id', 'game_sessions.id');

        // Aggregate separately so multiple buy-ins and return visits never multiply cashouts.
        $buyIns = BuyIn::query()
            ->whereIn('player_game_visit_id', (clone $visits)->select('id'))
            ->selectRaw('COALESCE(SUM(cash + credit), 0)');
        $cashouts = Cashout::query()
            ->whereIn('player_game_visit_id', (clone $visits)->select('id'))
            ->selectRaw('COALESCE(SUM(ending_chips), 0)');

        return GameSession::query()
            ->select(['id', 'game_name', 'game_date'])
            ->addSelect(['history_buy_ins' => $buyIns, 'history_ending_chips' => $cashouts])
            ->where('status', 'closed')
            ->whereExists((clone $visits)->select('id'))
            ->orderByDesc('game_date')
            ->orderByDesc('id')
            ->paginate(10);
    }
}
