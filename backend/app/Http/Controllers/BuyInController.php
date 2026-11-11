<?php

namespace App\Http\Controllers;

use App\Actions\Games\GetBuyInOptions;
use App\Actions\Games\SaveBuyIn;
use App\Http\Requests\Games\StoreBuyInRequest;
use Illuminate\Http\JsonResponse;

class BuyInController extends Controller
{
    public function options(GetBuyInOptions $getBuyInOptions): JsonResponse
    {
        $options = $getBuyInOptions->get();

        return response()->json($options);
    }

    public function store(StoreBuyInRequest $request, SaveBuyIn $saveBuyIn): JsonResponse
    {
        $draft = $request->validated();
        $receipt = $saveBuyIn->save(
            $request->user(),
            (int) $draft['gameId'],
            (int) $draft['playerId'],
            (int) $draft['cash'],
            (int) $draft['credit'],
            $draft['requestId'],
        );

        return response()->json($receipt);
    }
}
