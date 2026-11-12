<?php

namespace App\Actions;

use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListCorrectionHistory
{
    public const TYPES = ['game_totals', 'cashout', 'payment'];

    public function get(?string $type): LengthAwarePaginator
    {
        $query = DB::table('correction_history as revision')
            ->join('users as staff', 'staff.id', '=', 'revision.corrected_by')
            ->leftJoin('game_sessions as game', 'game.id', '=', 'revision.game_session_id')
            ->leftJoin('payments as payment', 'payment.id', '=', 'revision.payment_id')
            ->leftJoin('cashouts as cashout', 'cashout.id', '=', 'revision.cashout_id')
            ->leftJoin('player_game_visits as visit', 'visit.id', '=', 'cashout.player_game_visit_id')
            ->leftJoin('game_sessions as cashout_game', 'cashout_game.id', '=', 'visit.game_session_id')
            ->leftJoin('users as cashout_player', 'cashout_player.id', '=', 'visit.player_id')
            ->leftJoin('users as player', 'player.id', '=', 'payment.player_id')
            ->select('revision.*', 'staff.first_name as staff_first_name', 'staff.last_name as staff_last_name',
                'player.first_name as player_first_name', 'player.last_name as player_last_name', 'game.game_name',
                'cashout_game.game_name as cashout_game_name', 'cashout_player.first_name as cashout_first_name',
                'cashout_player.last_name as cashout_last_name')
            ->selectSub(DB::table('player_game_visits as prior_visit')
                ->selectRaw('count(*)')
                ->whereColumn('prior_visit.game_session_id', 'visit.game_session_id')
                ->whereColumn('prior_visit.player_id', 'visit.player_id')
                ->whereColumn('prior_visit.id', '<=', 'visit.id'), 'cashout_visit_number');

        if ($type !== null) {
            $query->whereNotNull('revision.'.RecordCorrectionAudit::TARGETS[$type]);
        }

        // Revisions saved within the same second still have a stable order.
        $page = $query->orderByDesc('revision.created_at')->orderByDesc('revision.id')->paginate(10);
        if ($type !== null) {
            $page->appends('type', $type);
        }

        return $page;
    }
}
