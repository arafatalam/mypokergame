<?php

namespace App\Actions\Payments;

use App\Actions\RecordCorrectionAudit;
use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SavePayment
{
    /** @return array{id: int, player: string, photoUrl: string, direction: string, amount: int, paidAt: string, balance: int} */
    public function save(User $staff, int $playerId, string $direction, int $amount, string $paidAt, ?string $note, string $requestId): array
    {
        try {
            return DB::transaction(function () use ($staff, $playerId, $direction, $amount, $paidAt, $note, $requestId): array {
                // Buy-ins and cashouts lock the same user before changing the balance.
                $player = User::query()->lockForUpdate()->find($playerId);
                if ($player === null || $player->role !== RoleCode::PLAYER) {
                    throw ValidationException::withMessages(['playerId' => 'Choose an active Player.']);
                }

                $existing = DB::table('payments')->where('request_id', $requestId)->first();
                if ($existing !== null) {
                    // The first correction preserves the values sent by the original request.
                    $snapshot = DB::table('correction_history')
                        ->where('payment_id', $existing->id)
                        ->orderBy('id')
                        ->first();
                    $original = [
                        'amount' => (int) $existing->amount,
                        'paidAt' => $existing->paid_at,
                        'note' => $existing->note,
                    ];
                    if ($snapshot !== null) {
                        $original = RecordCorrectionAudit::values($snapshot, 'payment', 'before');
                    }

                    if ((int) $existing->created_by !== $staff->id || (int) $existing->player_id !== $playerId
                        || $existing->direction !== $direction || $original['amount'] !== $amount
                        || $original['paidAt'] !== $paidAt || $original['note'] !== $note) {
                        throw ValidationException::withMessages(['requestId' => 'This request already recorded a different payment.']);
                    }

                    // A retry can recover the receipt even after this payment settled or reversed the debt.
                    return $this->receipt((int) $existing->id, $player, $direction, $amount, $paidAt, (int) $existing->balance_after);
                }

                if (! $player->is_active) {
                    throw ValidationException::withMessages(['playerId' => 'Choose an active Player.']);
                }

                // The chosen direction always applies, even when it moves the balance farther from zero.
                $balance = $player->poker_balance + $amount;
                if ($direction === 'house_pays_player') {
                    $balance = $player->poker_balance - $amount;
                }
                $paymentId = DB::table('payments')->insertGetId([
                    'player_id' => $player->id,
                    'created_by' => $staff->id,
                    'amount' => $amount,
                    'direction' => $direction,
                    'paid_at' => $paidAt,
                    'note' => $note,
                    'balance_after' => $balance,
                    'request_id' => $requestId,
                    'created_at' => now(),
                ]);
                $player->poker_balance = $balance;
                $player->save();

                return $this->receipt($paymentId, $player, $direction, $amount, $paidAt, $balance);
            }, attempts: 3);
        } catch (UniqueConstraintViolationException $exception) {
            if (! DB::table('payments')->where('request_id', $requestId)->exists()) {
                throw $exception;
            }

            throw ValidationException::withMessages(['requestId' => 'This request already recorded a different payment.']);
        }
    }

    /** @return array{id: int, player: string, photoUrl: string, direction: string, amount: int, paidAt: string, balance: int} */
    private function receipt(int $id, User $player, string $direction, int $amount, string $paidAt, int $balance): array
    {
        return [
            'id' => $id,
            'player' => $player->first_name.' '.$player->last_name,
            'photoUrl' => route('api.v1.users.photo', ['user' => $player->id], false),
            'direction' => $direction,
            'amount' => $amount,
            'paidAt' => $paidAt,
            'balance' => $balance,
        ];
    }
}
