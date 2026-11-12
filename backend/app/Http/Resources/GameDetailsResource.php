<?php

namespace App\Http\Resources;

use App\Actions\Games\GetGameDetails;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameSession */
class GameDetailsResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $summary = new GameListResource($this->resource);
        $details = app(GetGameDetails::class);

        return [
            ...$summary->toArray($request),
            'date' => $this->game_date,
            'minBuyIn' => (int) $this->min_buy_in,
            'maxBuyIn' => (int) $this->max_buy_in,
            'players' => $details->players($this->resource),
        ];
    }
}
