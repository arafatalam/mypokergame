<?php

namespace App\Actions\Players;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class ListOutstandingBalances
{
    /** @return LengthAwarePaginator<int, User> */
    public function get(string $search, string $direction): LengthAwarePaginator
    {
        $players = User::query()->where('role', RoleCode::PLAYER);

        // A negative balance is money the player owes the house.
        if ($direction === 'collect') {
            $players->where('poker_balance', '<', 0);
        } elseif ($direction === 'pay') {
            $players->where('poker_balance', '>', 0);
        } else {
            $players->where('poker_balance', '<>', 0);
        }

        // Match each word against either name so a full name works as a search.
        $words = preg_split('/\s+/u', $search, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($words as $word) {
            $players->where(function (Builder $query) use ($word): void {
                $pattern = '%'.$word.'%';
                $query->whereLike('first_name', $pattern)->orWhereLike('last_name', $pattern);
            });
        }

        $players->select(['id', 'first_name', 'last_name', 'poker_balance'])
            ->orderByRaw('ABS(poker_balance) DESC')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id');

        $balances = $players->paginate(10);
        // Settling the last balance on a page can remove that page.
        if ($balances->currentPage() > $balances->lastPage()) {
            $balances = $players->paginate(10, page: $balances->lastPage());
        }

        return $balances->withQueryString();
    }
}
