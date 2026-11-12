<?php

namespace App\Actions\Games;

use App\Actions\RecordCorrectionAudit;
use App\Enums\RoleCode;
use App\Models\BuyIn;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SaveCashout
{
    public function save(User $staff, int $gameId, int $playerId, int $visitId, int $endingChips, int $cashPaid, string $requestId): Cashout
    {
        return DB::transaction(function () use ($staff, $gameId, $playerId, $visitId, $endingChips, $cashPaid, $requestId): Cashout {
            // Match Buy-in's lock order so both actions serialize changes to the player and game.
            $player = User::query()->lockForUpdate()->find($playerId);
            $game = GameSession::query()->lockForUpdate()->find($gameId);

            if ($game === null) {
                throw ValidationException::withMessages(['gameId' => 'Choose an open game.']);
            }

            if ($player === null) {
                throw ValidationException::withMessages(['playerId' => 'Choose an eligible Player.']);
            }

            // Recover the original receipt even after the visit or game has closed.
            $previous = Cashout::query()
                ->join('player_game_visits', 'player_game_visits.id', '=', 'cashouts.player_game_visit_id')
                ->where('player_game_visits.game_session_id', $gameId)
                ->where('player_game_visits.player_id', $playerId)
                ->where('cashouts.player_game_visit_id', $visitId)
                ->where('cashouts.created_by', $staff->id)
                ->where('cashouts.request_id', $requestId)
                ->first(['cashouts.*']);

            if ($previous !== null) {
                // A correction edits current amounts. Recover the original cashout receipt from its first audit entry.
                $firstCorrection = DB::table('correction_history')->where('cashout_id', $previous->id)->oldest('id')->first();
                if ($firstCorrection !== null) {
                    $original = RecordCorrectionAudit::values($firstCorrection, 'cashout', 'before');
                    $previous->ending_chips = $original['endingChips'];
                    $previous->cash_paid = $original['cashPaid'];
                }

                if ($previous->ending_chips !== $endingChips || $previous->cash_paid !== $cashPaid) {
                    throw ValidationException::withMessages(['requestId' => 'This request already recorded different amounts.']);
                }

                return $previous->setRelation('game', $game)->setRelation('player', $player);
            }

            if ($game->status !== 'open') {
                throw ValidationException::withMessages(['gameId' => 'Choose an open game.']);
            }

            if ($player->role !== RoleCode::PLAYER) {
                throw ValidationException::withMessages(['playerId' => 'Choose an eligible Player.']);
            }

            $visit = DB::table('player_game_visits')
                ->where('game_session_id', $gameId)
                ->where('player_id', $playerId)
                ->latest('id')
                ->lockForUpdate()
                ->first(['id', 'closed_at']);

            if ($visit === null || (int) $visit->id !== $visitId || $visit->closed_at !== null
                || Cashout::query()->where('player_game_visit_id', $visitId)->exists()
                || ! BuyIn::query()->where('player_game_visit_id', $visitId)->exists()) {
                throw ValidationException::withMessages([
                    'playerId' => 'This visit is no longer eligible for cashout. Reopen Record Cashout to refresh the players.',
                ]);
            }

            $balance = $player->poker_balance + ($endingChips - $cashPaid);
            if (! is_int($balance)) {
                throw ValidationException::withMessages(['endingChips' => 'This cashout would exceed the supported balance range.']);
            }

            $recordedAt = now();
            $cashout = Cashout::query()->create([
                'player_game_visit_id' => $visitId,
                'created_by' => $staff->id,
                'ending_chips' => $endingChips,
                'cash_paid' => $cashPaid,
                'balance_after' => $balance,
                'automatic' => false,
                'request_id' => $requestId,
                'created_at' => $recordedAt,
            ]);

            if ($cashPaid > 0) {
                // The cashout balance already includes the payout. Record it without applying it again.
                DB::table('payments')->insert([
                    'cashout_id' => $cashout->id,
                    'player_id' => $player->id,
                    'created_by' => $staff->id,
                    'amount' => $cashPaid,
                    'direction' => 'house_pays_player',
                    'paid_at' => $recordedAt->copy()->setTimezone(config('payments.timezone'))->toDateString(),
                    'note' => 'Paid at cashout',
                    'balance_after' => $balance,
                    'request_id' => (string) Str::uuid(),
                    'created_at' => $recordedAt,
                ]);
            }

            $player->poker_balance = $balance;
            $player->save();
            DB::table('player_game_visits')->where('id', $visitId)->update(['closed_at' => $recordedAt]);

            $cashout->setRelation('game', $game);
            $cashout->setRelation('player', $player);

            return $cashout;
        }, attempts: 3);
    }
}
