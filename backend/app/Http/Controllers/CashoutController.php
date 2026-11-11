<?php

namespace App\Http\Controllers;

use App\Actions\Games\GetCashoutOptions;
use App\Actions\Games\SaveCashout;
use App\Http\Requests\Games\StoreCashoutRequest;
use App\Http\Resources\CashoutReceiptResource;
use Illuminate\Http\JsonResponse;

class CashoutController extends Controller
{
    public function options(GetCashoutOptions $getCashoutOptions): JsonResponse
    {
        $options = $getCashoutOptions->get();

        return response()->json($options);
    }

    public function store(StoreCashoutRequest $request, SaveCashout $saveCashout): CashoutReceiptResource
    {
        $draft = $request->validated();
        $cashout = $saveCashout->save(
            $request->user(),
            (int) $draft['gameId'],
            (int) $draft['playerId'],
            (int) $draft['visitId'],
            (int) $draft['endingChips'],
            (int) $draft['cashPaid'],
            strtolower($draft['requestId']),
        );

        return new CashoutReceiptResource($cashout);
    }
}
