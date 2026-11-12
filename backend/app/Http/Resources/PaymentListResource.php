<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentListResource extends JsonResource
{
    /** @return array{id: int, paidAt: string, player: string, direction: string, amount: int, note: string|null, cashoutId: int|null} */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'paidAt' => $this->paid_at,
            'player' => $this->first_name.' '.$this->last_name,
            'direction' => $this->direction,
            'amount' => (int) $this->amount,
            'note' => $this->note,
            'cashoutId' => $this->cashout_id === null ? null : (int) $this->cashout_id,
        ];
    }
}
