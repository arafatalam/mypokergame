<?php

namespace App\Http\Controllers;

use App\Actions\Games\CloseGameSession;
use App\Actions\Games\GetGameTotalsOptions;
use App\Http\Requests\Games\UpdateGameTotalsRequest;
use App\Http\Resources\CloseGameResource;
use App\Http\Resources\GameTotalsResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class CloseGameController extends Controller
{
    public function options(GetGameTotalsOptions $getGameTotalsOptions): JsonResponse
    {
        $games = $getGameTotalsOptions->get(openOnly: true);

        return response()->json(['games' => $games]);
    }

    public function show(GameSession $game): CloseGameResource
    {
        abort_unless($game->status === 'open', 404);

        return new CloseGameResource($game);
    }

    public function store(UpdateGameTotalsRequest $request, GameSession $game, CloseGameSession $closeGameSession): GameTotalsResource
    {
        $amounts = $request->validated();
        $closedGame = $closeGameSession->close($game, $request->user(), $amounts);

        return new GameTotalsResource($closedGame);
    }
}
