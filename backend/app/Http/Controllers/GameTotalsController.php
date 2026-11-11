<?php

namespace App\Http\Controllers;

use App\Actions\Games\GetGameTotalsOptions;
use App\Actions\Games\SaveGameTotals;
use App\Http\Requests\Games\UpdateGameTotalsRequest;
use App\Http\Resources\GameTotalsResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class GameTotalsController extends Controller
{
    public function options(GetGameTotalsOptions $getGameTotalsOptions): JsonResponse
    {
        $games = $getGameTotalsOptions->get();

        return response()->json(['games' => $games]);
    }

    public function show(GameSession $game): GameTotalsResource
    {
        return new GameTotalsResource($game);
    }

    public function update(UpdateGameTotalsRequest $request, GameSession $game, SaveGameTotals $saveGameTotals): GameTotalsResource
    {
        $draft = $request->validated();
        $savedGame = $saveGameTotals->save($game, $draft['dealerTips'], $draft['gameCosts']);

        return new GameTotalsResource($savedGame);
    }
}
