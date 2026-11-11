<?php

namespace App\Actions\Games;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class SaveGameSession
{
    public function save(User $creator, string $confirmedName, int $minimum, int $maximum, GetNextGameDetails $getNextGameDetails): GameSession
    {
        $gameDate = today();
        $details = $getNextGameDetails->get($gameDate);

        // Ask the Admin to review the new preview if the date or sequence changed.
        if ($confirmedName !== $details['game_name']) {
            $this->rejectStaleName();
        }

        $game = new GameSession;
        $game->game_date = $gameDate->toDateString();
        $game->game_number = $details['game_number'];
        $game->game_name = $details['game_name'];
        $game->min_buy_in = $minimum;
        $game->max_buy_in = $maximum;
        $game->created_by = $creator->getKey();

        try {
            $game->save();
        } catch (UniqueConstraintViolationException) {
            // Another request may have saved this number after the lookup.
            $this->rejectStaleName();
        }

        return $game;
    }

    private function rejectStaleName(): never
    {
        throw ValidationException::withMessages([
            'game_name' => 'The next game name has changed. Reopen Create Game to review the next name.',
        ]);
    }
}
