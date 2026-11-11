<?php

namespace App\Actions\Games;

use App\Enums\RoleCode;
use App\Models\BuyIn;
use App\Models\Cashout;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveBuyIn
{
    /** @return array{game: string, player: string, cash: int, credit: int, total: int, balance: int, visitId: int} */
    public function save(User $staff, int $gameId, int $playerId, int $cash, int $credit, string $requestId): array
    {
        return DB::transaction(function () use ($staff, $gameId, $playerId, $cash, $credit, $requestId): array {
            // Lock the player first so simultaneous saves cannot open visits in different games.
            $player = User::query()->lockForUpdate()->find($playerId);
            $game = GameSession::query()->lockForUpdate()->find($gameId);

            if ($player === null || $player->role !== RoleCode::PLAYER || ! $player->is_active) {
                throw ValidationException::withMessages(['playerId' => 'Choose an active Player.']);
            }
            if ($game === null) {
                throw ValidationException::withMessages(['gameId' => 'Choose an open game.']);
            }

            $previousBuyIn = BuyIn::query()
                ->join('player_game_visits', 'player_game_visits.id', '=', 'buy_ins.player_game_visit_id')
                ->where('player_game_visits.player_id', $playerId)
                ->where('player_game_visits.game_session_id', $gameId)
                ->where('buy_ins.created_by', $staff->id)
                ->where('buy_ins.request_id', $requestId)
                ->first(['buy_ins.cash', 'buy_ins.credit', 'buy_ins.balance_after', 'buy_ins.player_game_visit_id']);

            if ($previousBuyIn !== null) {
                if ((int) $previousBuyIn->cash !== $cash || (int) $previousBuyIn->credit !== $credit) {
                    throw ValidationException::withMessages(['requestId' => 'This request already recorded a different amount.']);
                }

                return $this->receipt($game, $player, $cash, $credit, (int) $previousBuyIn->balance_after, (int) $previousBuyIn->player_game_visit_id);
            }

            if ($game->status !== 'open') {
                throw ValidationException::withMessages(['gameId' => 'Choose an open game.']);
            }

            $otherGame = DB::table('player_game_visits')
                ->join('game_sessions', 'game_sessions.id', '=', 'player_game_visits.game_session_id')
                ->where('player_game_visits.player_id', $playerId)
                ->where('game_sessions.status', 'open')
                ->where('game_sessions.id', '!=', $gameId)
                ->value('game_sessions.game_name');

            if ($otherGame !== null) {
                $message = $player->first_name.' '.$player->last_name.' is already in '.$otherGame.'.';
                throw ValidationException::withMessages(['playerId' => $message]);
            }

            $visit = DB::table('player_game_visits')
                ->where('player_id', $playerId)
                ->where('game_session_id', $gameId)
                ->latest('id')
                ->lockForUpdate()
                ->first(['id', 'closed_at']);

            $minimum = $game->min_buy_in;
            $maximum = $game->max_buy_in;
            $total = $cash + $credit;

            if ($visit !== null && $visit->closed_at !== null) {
                $cashout = Cashout::query()->where('player_game_visit_id', $visit->id)->first(['ending_chips']);
                if ($cashout === null) {
                    throw ValidationException::withMessages(['playerId' => 'This player has already cashed out of this game.']);
                }

                // A return must cover the previous ending chips, even above the house maximum.
                $minimum = max($minimum, $cashout->ending_chips);
                $maximum = max($maximum, $cashout->ending_chips);
                if ($minimum === $maximum && $total !== $minimum) {
                    throw ValidationException::withMessages(['total' => 'The return buy-in must be exactly $'.$minimum.'.']);
                }

                $visit = null;
            }

            if ($total < $minimum) {
                throw ValidationException::withMessages(['total' => 'The minimum buy-in is $'.$minimum.'.']);
            }
            if ($total > $maximum) {
                throw ValidationException::withMessages(['total' => 'The maximum buy-in is $'.$maximum.'.']);
            }

            $recordedAt = now();
            // First buy-ins and returns create a visit. Top-ups reuse the open visit.
            $visitId = $visit?->id ?? DB::table('player_game_visits')->insertGetId([
                'game_session_id' => $gameId,
                'player_id' => $playerId,
                'opened_at' => $recordedAt,
            ]);

            $balance = $player->poker_balance - $credit;
            BuyIn::query()->create([
                'player_game_visit_id' => $visitId,
                'created_by' => $staff->id,
                'cash' => $cash,
                'credit' => $credit,
                'balance_after' => $balance,
                'request_id' => $requestId,
                'created_at' => $recordedAt,
            ]);

            // Cash does not change what the player owes.
            if ($credit > 0) {
                $player->poker_balance = $balance;
                $player->save();
            }

            return $this->receipt($game, $player, $cash, $credit, $balance, $visitId);
        }, attempts: 3);
    }

    /** @return array{game: string, player: string, cash: int, credit: int, total: int, balance: int, visitId: int} */
    private function receipt(GameSession $game, User $player, int $cash, int $credit, int $balance, int $visitId): array
    {
        return [
            'game' => $game->game_name,
            'player' => $player->first_name.' '.$player->last_name,
            'cash' => $cash,
            'credit' => $credit,
            'total' => $cash + $credit,
            'balance' => $balance,
            'visitId' => $visitId,
        ];
    }
}
