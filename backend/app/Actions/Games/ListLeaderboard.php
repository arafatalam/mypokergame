<?php

namespace App\Actions\Games;

use App\Enums\RoleCode;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ListLeaderboard
{
    /** @return array{rankings: LengthAwarePaginator, hasClosedGames: bool} */
    public function get(?string $fromMonth, ?string $toMonth, int $page): array
    {
        $games = $this->closedGames($fromMonth, $toMonth);
        $rankings = $this->rankings($games)->paginate(10, ['*'], 'page', $page);

        return [
            'rankings' => $rankings,
            'hasClosedGames' => $rankings->total() > 0 || $games->exists(),
        ];
    }

    /** @return Collection<int, \stdClass> */
    public function topFiveForMonth(string $month): Collection
    {
        return $this->rankings($this->closedGames($month, $month))->limit(5)->get();
    }

    private function closedGames(?string $fromMonth, ?string $toMonth): Builder
    {
        $games = DB::table('game_sessions')->where('status', 'closed');
        if ($fromMonth !== null) {
            $games->where('game_date', '>=', $fromMonth.'-01');
            $toMonth ??= now()->format('Y-m');
        }
        if ($toMonth !== null) {
            $nextMonth = CarbonImmutable::createFromFormat('!Y-m', $toMonth)->addMonth()->toDateString();
            $games->where('game_date', '<', $nextMonth);
        }

        return $games;
    }

    private function rankings(Builder $games): Builder
    {
        // Sum each visit's buy-ins before joining its single cashout.
        $buyIns = DB::table('buy_ins')
            ->select('player_game_visit_id')
            ->selectRaw('SUM(cash + credit) AS total')
            ->groupBy('player_game_visit_id');

        $totals = DB::table('player_game_visits as visits')
            ->joinSub((clone $games)->select('id'), 'games', 'games.id', '=', 'visits.game_session_id')
            ->join('users', 'users.id', '=', 'visits.player_id')
            ->leftJoinSub($buyIns, 'buy_ins', 'buy_ins.player_game_visit_id', '=', 'visits.id')
            ->leftJoin('cashouts', 'cashouts.player_game_visit_id', '=', 'visits.id')
            ->where('users.role', RoleCode::PLAYER->value)
            ->select('users.id', 'users.first_name', 'users.last_name')
            ->selectRaw('SUM(COALESCE(cashouts.ending_chips, 0)) - SUM(COALESCE(buy_ins.total, 0)) AS winnings')
            ->groupBy('users.id', 'users.first_name', 'users.last_name');

        // Compute shared ranks across the full result before slicing it into pages.
        return DB::query()->fromSub($totals, 'totals')
            ->select('totals.*')
            ->selectRaw('DENSE_RANK() OVER (ORDER BY winnings DESC) AS leaderboard_rank')
            ->orderByDesc('winnings')
            ->orderByRaw('LOWER(first_name), LOWER(last_name)')
            ->orderBy('id');
    }
}
