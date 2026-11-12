<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use Illuminate\Pagination\LengthAwarePaginator;

class ListGames
{
    /** @return LengthAwarePaginator<int, GameSession> */
    public function get(?string $fromDate, ?string $toDate, ?string $status, int $page): LengthAwarePaginator
    {
        $query = GameSession::query();

        if ($fromDate !== null) {
            $query->where('game_date', '>=', $fromDate);
        }

        if ($toDate !== null) {
            $query->where('game_date', '<=', $toDate);
        }

        if ($status !== null && $status !== 'all') {
            $query->where('status', $status);
        }

        // Explicit ordering works even when the database stores status as an enum.
        $query->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
            ->orderByDesc('game_date')
            ->orderByDesc('game_number');

        $games = $query->paginate(5, page: $page);

        // A game may move to another page while the list is open.
        if ($page > $games->lastPage()) {
            $games = $query->paginate(5, page: $games->lastPage());
        }

        return $games->withQueryString();
    }
}
