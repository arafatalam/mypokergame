<?php

namespace App\Http\Controllers;

use App\Actions\Games\ListLeaderboard;
use App\Http\Requests\Games\IndexGameMonthRequest;
use App\Http\Resources\LeaderboardResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeaderboardController extends Controller
{
    public function __invoke(IndexGameMonthRequest $request, ListLeaderboard $action): AnonymousResourceCollection
    {
        $result = $action->get(
            $request->validated('from_month'),
            $request->validated('to_month'),
            (int) $request->validated('page', 1),
        );

        return LeaderboardResource::collection($result['rankings'])
            ->additional(['has_closed_games' => $result['hasClosedGames']]);
    }
}
