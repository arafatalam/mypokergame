<?php

namespace App\Actions\Payments;

use App\Actions\RecordCorrectionAudit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CorrectPayment
{
    public function save(User $staff, int $paymentId, int $amount, string $paidAt, ?string $note, string $reason, ?string $requestId): bool
    {
        return DB::transaction(function () use ($staff, $paymentId, $amount, $paidAt, $note, $reason, $requestId): bool {
            $playerId = DB::table('payments')->where('id', $paymentId)->value('player_id');
            abort_if($playerId === null, 404);

            // Acquire the same balance lock used by payments and other game activity.
            $player = User::query()->lockForUpdate()->findOrFail($playerId);
            $payment = DB::table('payments')->where('id', $paymentId)->lockForUpdate()->first();
            abort_if($payment === null, 404);

            if ($payment->cashout_id !== null) {
                throw ValidationException::withMessages(['correction' => 'Use Correct Cashout to change a linked payout.']);
            }

            $previous = [
                'amount' => (int) $payment->amount,
                'paidAt' => $payment->paid_at,
                'note' => $payment->note,
            ];
            $corrected = [
                'amount' => $amount,
                'paidAt' => $paidAt,
                'note' => $note,
            ];
            if (RecordCorrectionAudit::isRetry('payment', $paymentId, $staff, $corrected, $reason, $requestId)) {
                return true;
            }

            if ($previous === $corrected) {
                throw ValidationException::withMessages(['correction' => 'Change the amount, payment date or note before saving.']);
            }

            $difference = $amount - $previous['amount'];
            if ($payment->direction === 'house_pays_player') {
                $difference = -$difference;
            }
            $player->poker_balance += $difference;
            $player->save();

            DB::table('payments')->where('id', $paymentId)->update([
                'amount' => $amount,
                'paid_at' => $paidAt,
                'note' => $note,
            ]);

            RecordCorrectionAudit::record('payment', $paymentId, $staff, $previous, $corrected, $reason, $requestId);

            return false;
        }, attempts: 3);
    }
}
