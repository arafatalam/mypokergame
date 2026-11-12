<?php

namespace App\Actions\Payments;

use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use stdClass;

class ListPayments
{
    /** @return LengthAwarePaginator<int, stdClass> */
    public function get(string $search, string $direction, ?int $playerId, int $perPage = 5): LengthAwarePaginator
    {
        // Join the player for their name, including players who are now inactive.
        $query = DB::table('payments')
            ->join('users as players', 'players.id', '=', 'payments.player_id')
            ->select('payments.id', 'payments.paid_at', 'players.first_name', 'players.last_name',
                'payments.direction', 'payments.amount', 'payments.note', 'payments.cashout_id')
            ->where('payments.amount', '>', 0);

        if ($playerId !== null) {
            $query->where('payments.player_id', $playerId);
        }

        if ($search !== '') {
            $query->whereAny(['players.first_name', 'players.last_name'], 'like', '%'.$search.'%');
        }

        if ($direction !== '') {
            $query->where('payments.direction', $direction);
        }

        // Break same-date ties consistently across pages.
        return $query->orderByDesc('payments.paid_at')
            ->orderByDesc('payments.id')
            ->paginate($perPage)
            ->withQueryString();
    }
}
