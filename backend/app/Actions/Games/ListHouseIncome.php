<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListHouseIncome
{
    private CalculateGameIncome $gameIncome;

    public function __construct(CalculateGameIncome $gameIncome)
    {
        $this->gameIncome = $gameIncome;
    }

    public function get(?string $fromMonth, ?string $toMonth, int $page): LengthAwarePaginator
    {
        $months = GameSession::query()->where('status', 'closed');
        if ($fromMonth !== null) {
            $months->where('game_date', '>=', $fromMonth.'-01');
            $toMonth ??= now()->format('Y-m');
        }
        if ($toMonth !== null) {
            $nextMonth = CarbonImmutable::createFromFormat('!Y-m', $toMonth)->addMonth()->toDateString();
            $months->where('game_date', '<', $nextMonth);
        }

        // Page the months before loading their totals, so the work is bounded by the page size.
        return $months->toBase()
            ->selectRaw('SUBSTR(game_date, 1, 7) AS month')
            ->groupByRaw('SUBSTR(game_date, 1, 7)')
            ->orderByDesc('month')
            ->paginate(10, ['*'], 'page', $page)
            ->through(function (object $row): array {
                $start = CarbonImmutable::createFromFormat('!Y-m', $row->month);
                $games = GameSession::query()->where('game_date', '>=', $start->toDateString())
                    ->where('game_date', '<', $start->addMonth()->toDateString());

                return ['month' => $row->month] + $this->gameIncome->summarizeClosedGames($games);
            });
    }
}
