<?php

namespace App\Actions\Games;

use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CloseGameSession
{
    /** @param array{dealerTips: int, gameCosts: int}|null $amounts */
    public function close(GameSession $game, User $staff, ?array $amounts = null): GameSession
    {
        return DB::transaction(function () use ($game, $staff, $amounts): GameSession {
            // This lock excludes Buy-in and manual Cashout until closing commits.
            $current = GameSession::query()->lockForUpdate()->findOrFail($game->id);
            if ($current->status === 'closed') {
                return $current;
            }

            $closedAt = now();
            $visits = DB::table('player_game_visits')
                ->join('users', 'users.id', '=', 'player_game_visits.player_id')
                ->where('player_game_visits.game_session_id', $current->id)
                ->whereNull('player_game_visits.closed_at')
                ->get(['player_game_visits.id', 'users.poker_balance']);

            foreach ($visits as $visit) {
                Cashout::query()->create([
                    'player_game_visit_id' => $visit->id,
                    'created_by' => $staff->id,
                    'ending_chips' => 0,
                    'cash_paid' => 0,
                    'balance_after' => $visit->poker_balance,
                    'automatic' => true,
                    'created_at' => $closedAt,
                ]);
            }

            DB::table('player_game_visits')->whereIn('id', $visits->pluck('id'))->update(['closed_at' => $closedAt]);
            // Save the reviewed amounts with the cashouts and the closed status.
            if ($amounts !== null) {
                $current->dealer_tips = $amounts['dealerTips'];
                $current->game_costs = $amounts['gameCosts'];
            }

            $current->status = 'closed';
            $current->closed_by = $staff->id;
            $current->closed_at = $closedAt;
            $current->save();

            return $current;
        }, attempts: 3);
    }
}
