<?php

namespace App\Http\Resources;

use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameSession */
class PlayerGameHistoryResource extends JsonResource
{
    /** @return array{id: int, name: string, gameDate: string, netResult: int} */
    public function toArray(Request $request): array
    {
        // The result uses ending chips, which include any portion credited to the player's balance.
        $netResult = (int) $this->history_ending_chips - (int) $this->history_buy_ins;

        return [
            'id' => $this->id,
            'name' => $this->game_name,
            'gameDate' => $this->game_date,
            'netResult' => $netResult,
        ];
    }
}
