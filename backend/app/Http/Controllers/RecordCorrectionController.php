<?php

namespace App\Http\Controllers;

use App\Actions\Games\CorrectCashout;
use App\Actions\Games\CorrectGameTotals;
use App\Actions\ListCorrectionHistory;
use App\Actions\Payments\CorrectPayment;
use App\Http\Requests\Games\CorrectCashoutRequest;
use App\Http\Requests\Games\CorrectGameTotalsRequest;
use App\Http\Requests\Payments\CorrectPaymentRequest;
use App\Http\Resources\CorrectionHistoryResource;
use App\Models\Cashout;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class RecordCorrectionController extends Controller
{
    public function history(Request $request, ListCorrectionHistory $history): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['sometimes', 'required', Rule::in(ListCorrectionHistory::TYPES)],
            'page' => ['sometimes', 'required', 'integer', 'min:1', 'max:2147483647'],
        ]);

        return CorrectionHistoryResource::collection($history->get($filters['type'] ?? null));
    }

    public function showCashout(Cashout $cashout, CorrectCashout $correction): JsonResponse
    {
        return response()->json(['data' => $correction->details($cashout)]);
    }

    public function cashout(CorrectCashoutRequest $request, Cashout $cashout, CorrectCashout $correction): JsonResponse
    {
        $receipt = $correction->save($request->user(), $cashout, $request->validated());

        return response()->json(['data' => $receipt]);
    }

    public function gameTotals(CorrectGameTotalsRequest $request, GameSession $game, CorrectGameTotals $correction): Response|JsonResponse
    {
        $values = $request->validated();
        $alreadySaved = $correction->save($request->user(), $game, $values['dealerTips'], $values['gameCosts'], $values['reason'], $values['requestId'] ?? null);

        return $alreadySaved ? response()->json(['message' => 'Already saved.']) : response()->noContent();
    }

    public function payment(CorrectPaymentRequest $request, int $payment, CorrectPayment $correction): Response|JsonResponse
    {
        $values = $request->validated();
        $alreadySaved = $correction->save($request->user(), $payment, $values['amount'], $values['paidAt'], $values['note'] ?? null, $values['reason'], $values['requestId'] ?? null);

        return $alreadySaved ? response()->json(['message' => 'Already saved.']) : response()->noContent();
    }
}
