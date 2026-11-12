<?php

namespace App\Actions\Games;

use App\Actions\RecordCorrectionAudit;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CorrectCashout
{
    /** @return array<string, int|string> */
    public function details(Cashout $cashout): array
    {
        $visit = DB::table('player_game_visits')->where('id', $cashout->player_game_visit_id)->first();
        $game = GameSession::query()->findOrFail($visit->game_session_id);
        $player = User::query()->findOrFail($visit->player_id);

        return $this->describe($cashout, $game, $player);
    }

    /**
     * @param  array{endingChips: int, cashPaid: int, previousEndingChips: int, previousCashPaid: int, reason: string, requestId: string}  $draft
     * @return array<string, int|string>
     */
    public function save(User $staff, Cashout $cashout, array $draft): array
    {
        return DB::transaction(function () use ($staff, $cashout, $draft): array {
            $visit = DB::table('player_game_visits')->where('id', $cashout->player_game_visit_id)->first();

            // Take locks in the same order as the original cashout action.
            $player = User::query()->lockForUpdate()->findOrFail($visit->player_id);
            $game = GameSession::query()->lockForUpdate()->findOrFail($visit->game_session_id);
            $cashout = Cashout::query()->lockForUpdate()->findOrFail($cashout->id);
            $requestId = strtolower($draft['requestId']);
            $corrected = ['endingChips' => $draft['endingChips'], 'cashPaid' => $draft['cashPaid']];
            $retry = DB::table('correction_history')
                ->where('cashout_id', $cashout->id)
                ->where('request_id', $requestId)->lockForUpdate()->first();

            if ($retry !== null) {
                $before = RecordCorrectionAudit::values($retry, 'cashout', 'before');
                $after = RecordCorrectionAudit::values($retry, 'cashout', 'after');
                if ((int) $retry->corrected_by !== $staff->id || $retry->reason !== $draft['reason']
                    || $after['endingChips'] !== $draft['endingChips'] || $after['cashPaid'] !== $draft['cashPaid']
                    || $before['endingChips'] !== $draft['previousEndingChips'] || $before['cashPaid'] !== $draft['previousCashPaid']) {
                    throw ValidationException::withMessages(['correction' => 'This request already saved a different correction.']);
                }

                return ['message' => 'Already saved.'];
            }

            $previous = ['endingChips' => $cashout->ending_chips, 'cashPaid' => $cashout->cash_paid];
            if ($draft['previousEndingChips'] !== $cashout->ending_chips || $draft['previousCashPaid'] !== $cashout->cash_paid) {
                abort(409, 'This cashout changed. Reopen Correct Cashout to review the latest amounts.');
            }

            if ($previous === $corrected) {
                throw ValidationException::withMessages(['correction' => 'Change ending chips or cash paid before saving.']);
            }

            $cashDifference = $draft['cashPaid'] - $cashout->cash_paid;
            $balance = $player->poker_balance + (($draft['endingChips'] - $cashout->ending_chips) - $cashDifference);
            if (! is_int($balance)) {
                throw ValidationException::withMessages(['endingChips' => 'This correction would exceed the supported balance range.']);
            }

            if ($cashDifference !== 0) {
                $previousPaymentAmount = $this->syncPayment($cashout, $staff, $player, $draft['cashPaid'], $balance);
                if ($previousPaymentAmount !== null || $draft['cashPaid'] > 0) {
                    $previous['linkedPaymentAmount'] = $previousPaymentAmount;
                    $corrected['linkedPaymentAmount'] = $draft['cashPaid'];
                }
            }

            $cashout->ending_chips = $draft['endingChips'];
            $cashout->cash_paid = $draft['cashPaid'];
            $cashout->save();
            $player->poker_balance = $balance;
            $player->save();

            $receipt = $this->describe($cashout, $game, $player) + [
                'previousEndingChips' => $previous['endingChips'],
                'previousCashPaid' => $previous['cashPaid'],
                'balance' => $balance,
                'reason' => $draft['reason'],
            ];
            RecordCorrectionAudit::record('cashout', $cashout->id, $staff, $previous, $corrected, $draft['reason'], $requestId);

            return $receipt;
        }, attempts: 3);
    }

    private function syncPayment(Cashout $cashout, User $staff, User $player, int $cashPaid, int $balance): ?int
    {
        $payment = DB::table('payments')->where('cashout_id', $cashout->id)->lockForUpdate()->first();
        if ($payment !== null) {
            // Keep the existing payout metadata so it can reappear intact after a later correction.
            DB::table('payments')->where('id', $payment->id)->update(['amount' => $cashPaid]);

            return (int) $payment->amount;
        }

        if ($cashPaid > 0) {
            DB::table('payments')->insert([
                'cashout_id' => $cashout->id,
                'player_id' => $player->id,
                'created_by' => $staff->id,
                'amount' => $cashPaid,
                'direction' => 'house_pays_player',
                'paid_at' => now(config('payments.timezone'))->toDateString(),
                'note' => 'Paid at cashout',
                'balance_after' => $balance,
                'request_id' => (string) Str::uuid(),
                'created_at' => now(),
            ]);
        }

        return null;
    }

    /** @return array<string, int|string> */
    private function describe(Cashout $cashout, GameSession $game, User $player): array
    {
        $visitNumber = DB::table('player_game_visits')
            ->where('game_session_id', $game->id)
            ->where('player_id', $player->id)
            ->where('id', '<=', $cashout->player_game_visit_id)
            ->count();

        return [
            'id' => $cashout->id,
            'game' => $game->game_name,
            'player' => $player->first_name.' '.$player->last_name,
            'visit' => $visitNumber,
            'endingChips' => $cashout->ending_chips,
            'cashPaid' => $cashout->cash_paid,
        ];
    }
}
