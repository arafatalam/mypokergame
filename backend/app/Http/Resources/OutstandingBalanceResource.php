<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class OutstandingBalanceResource extends JsonResource
{
    /**
     * @return array{id: int, name: string, balance: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->first_name.' '.$this->last_name,
            'balance' => $this->poker_balance,
        ];
    }
}
