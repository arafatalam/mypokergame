<?php

namespace App\Http\Resources;

use App\Models\Cashout;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Cashout */
class CashoutReceiptResource extends JsonResource
{
    /** @return array{game: string, player: string, endingChips: int, cashPaid: int, balance: int} */
    public function toArray(Request $request): array
    {
        return [
            'game' => $this->game->game_name,
            'player' => $this->player->first_name.' '.$this->player->last_name,
            'endingChips' => $this->ending_chips,
            'cashPaid' => $this->cash_paid,
            'balance' => $this->balance_after,
        ];
    }
}
