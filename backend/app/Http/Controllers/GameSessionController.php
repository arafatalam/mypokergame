<?php

namespace App\Http\Controllers;

use App\Actions\Games\GetNextGameDetails;
use App\Actions\Games\SaveGameSession;
use App\Enums\DefaultBuyIn;
use App\Http\Requests\Games\StoreGameRequest;
use Illuminate\Http\JsonResponse;

class GameSessionController extends Controller
{
    public function createOptions(GetNextGameDetails $getNextGameDetails): JsonResponse
    {
        $date = today();
        $details = $getNextGameDetails->get($date);

        return response()->json([
            'game_name' => $details['game_name'],
            'game_date' => $date->toDateString(),
            'game_number' => $details['game_number'],
            'default_min_buy_in' => DefaultBuyIn::MINIMUM->value,
            'default_max_buy_in' => DefaultBuyIn::MAXIMUM->value,
        ]);
    }

    public function store(StoreGameRequest $request, SaveGameSession $saveGameSession, GetNextGameDetails $getNextGameDetails): JsonResponse
    {
        $data = $request->validated();
        $game = $saveGameSession->save(
            $request->user(),
            $data['game_name'],
            (int) ($data['min_buy_in'] ?? DefaultBuyIn::MINIMUM->value),
            (int) ($data['max_buy_in'] ?? DefaultBuyIn::MAXIMUM->value),
            $getNextGameDetails,
        );

        return response()->json([
            'id' => $game->getKey(),
            'game_name' => $game->game_name,
        ], 201);
    }
}
