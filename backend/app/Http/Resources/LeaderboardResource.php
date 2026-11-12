<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaderboardResource extends JsonResource
{
    /** @return array{id: int, firstName: string, lastName: string, winnings: int, rank: int} */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'winnings' => (int) $this->winnings,
            'rank' => (int) $this->leaderboard_rank,
        ];
    }
}
