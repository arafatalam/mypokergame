<?php

namespace App\Http\Controllers;

use App\Actions\Payments\ListPayments;
use App\Actions\Payments\SavePayment;
use App\Enums\RoleCode;
use App\Http\Requests\Payments\IndexPaymentsRequest;
use App\Http\Requests\Payments\StorePaymentRequest;
use App\Http\Resources\PaymentListResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentController extends Controller
{
    public function index(IndexPaymentsRequest $request, ListPayments $listPayments): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $payments = $listPayments->get(
            $filters['search'] ?? '',
            $filters['direction'] ?? '',
            $request->integer('player_id') ?: null,
            (int) ($filters['per_page'] ?? 5),
        );

        return PaymentListResource::collection($payments);
    }

    public function options(): JsonResponse
    {
        $players = User::query()
            ->where('role', RoleCode::PLAYER)
            ->where('is_active', true)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id')
            ->get(['id', 'first_name', 'last_name', 'poker_balance']);

        $options = [];
        foreach ($players as $player) {
            $options[] = [
                'id' => $player->id,
                'name' => $player->first_name.' '.$player->last_name,
                'balance' => $player->poker_balance,
            ];
        }

        return response()->json(['players' => $options, 'today' => today(config('payments.timezone'))->toDateString()]);
    }

    public function store(StorePaymentRequest $request, SavePayment $savePayment): JsonResponse
    {
        $draft = $request->validated();
        $receipt = $savePayment->save(
            $request->user(),
            (int) $draft['playerId'],
            $draft['direction'],
            $draft['amount'],
            $draft['paidAt'],
            $draft['note'] ?? null,
            strtolower($draft['requestId']),
        );

        return response()->json(['data' => $receipt]);
    }
}
