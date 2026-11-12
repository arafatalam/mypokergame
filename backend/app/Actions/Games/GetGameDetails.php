<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use Illuminate\Support\Facades\DB;

class GetGameDetails
{
    /**
     * @return list<array{id: int, name: string, buyIns: int, endingChips: int|null, cashPaid: int|null, result: int|null, stillPlaying: bool, cashouts: list<array{id: int, visit: int}>, purchases: list<array{id: int, label: string, visit: int, cash: int, credit: int, total: int}>}>
     */
    public function players(GameSession $game): array
    {
        $rows = DB::table('player_game_visits as visits')
            ->join('users', 'users.id', '=', 'visits.player_id')
            ->leftJoin('cashouts', 'cashouts.player_game_visit_id', '=', 'visits.id')
            ->join('buy_ins', 'buy_ins.player_game_visit_id', '=', 'visits.id')
            ->where('visits.game_session_id', $game->id)
            ->orderBy('users.first_name')
            ->orderBy('users.last_name')
            ->orderBy('users.id')
            ->orderBy('visits.id')
            ->orderBy('buy_ins.created_at')
            ->orderBy('buy_ins.id')
            ->get([
                'users.id as player_id', 'users.first_name', 'users.last_name',
                'visits.id as visit_id', 'visits.closed_at',
                'cashouts.id as cashout_id', 'cashouts.ending_chips', 'cashouts.cash_paid',
                'buy_ins.id as purchase_id', 'buy_ins.cash', 'buy_ins.credit',
            ]);

        $players = [];
        $lastVisitId = null;
        $visitNumber = 0;

        foreach ($rows as $row) {
            if (! isset($players[$row->player_id])) {
                $players[$row->player_id] = [
                    'id' => (int) $row->player_id,
                    'name' => $row->first_name.' '.$row->last_name,
                    'buyIns' => 0,
                    'endingChips' => null,
                    'cashPaid' => null,
                    'result' => null,
                    'stillPlaying' => false,
                    'purchases' => [],
                    'cashouts' => [],
                ];
                $visitNumber = 0;
            }

            $player = $players[$row->player_id];
            $label = 'Top-up';
            if ($row->visit_id !== $lastVisitId) {
                $lastVisitId = $row->visit_id;
                $visitNumber++;
                $label = 'First buy-in';
                if ($visitNumber > 1) {
                    $label = 'Return buy-in';
                }

                // A visit's cashout is repeated by the join for every purchase.
                if ($row->cashout_id !== null) {
                    $player['cashouts'][] = ['id' => (int) $row->cashout_id, 'visit' => $visitNumber];
                    $player['endingChips'] = ($player['endingChips'] ?? 0) + (int) $row->ending_chips;
                    $player['cashPaid'] = ($player['cashPaid'] ?? 0) + (int) $row->cash_paid;
                }
                $player['stillPlaying'] = $row->closed_at === null;
            }

            $total = (int) $row->cash + (int) $row->credit;
            $player['buyIns'] += $total;
            $player['purchases'][] = [
                'id' => (int) $row->purchase_id,
                'label' => $label,
                'visit' => $visitNumber,
                'cash' => (int) $row->cash,
                'credit' => (int) $row->credit,
                'total' => $total,
            ];
            $players[$row->player_id] = $player;
        }

        foreach ($players as $playerId => $player) {
            // Cash paid settles the balance. Poker result uses the value of the chips.
            if (! $player['stillPlaying'] && $player['endingChips'] !== null) {
                $players[$playerId]['result'] = $player['endingChips'] - $player['buyIns'];
            }
        }

        return array_values($players);
    }
}
