<?php

namespace App\Actions\Games;

use App\Actions\RecordCorrectionAudit;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CorrectGameTotals
{
    public function save(User $staff, GameSession $game, int $dealerTips, int $gameCosts, string $reason, ?string $requestId): bool
    {
        return DB::transaction(function () use ($staff, $game, $dealerTips, $gameCosts, $reason, $requestId): bool {
            // Coordinate with the existing totals and close-game writes.
            $current = GameSession::query()->lockForUpdate()->findOrFail($game->id);
            $previous = ['dealerTips' => $current->dealer_tips, 'gameCosts' => $current->game_costs];
            $corrected = ['dealerTips' => $dealerTips, 'gameCosts' => $gameCosts];
            if (RecordCorrectionAudit::isRetry('game_totals', $current->id, $staff, $corrected, $reason, $requestId)) {
                return true;
            }

            if ($previous === $corrected) {
                throw ValidationException::withMessages(['correction' => 'Change dealer tips or game costs before saving.']);
            }

            $current->dealer_tips = $dealerTips;
            $current->game_costs = $gameCosts;
            $current->save();

            RecordCorrectionAudit::record('game_totals', $current->id, $staff, $previous, $corrected, $reason, $requestId);

            return false;
        }, attempts: 3);
    }
}
