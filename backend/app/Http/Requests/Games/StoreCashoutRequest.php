<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashoutRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'gameId' => ['required', 'integer', 'min:1'],
            'playerId' => ['required', 'integer', 'min:1'],
            'visitId' => ['required', 'integer', 'min:1'],
            'endingChips' => ['required', 'integer:strict', 'min:0', 'max:2147483647'],
            'cashPaid' => ['required', 'integer:strict', 'min:0', 'max:2147483647'],
            'requestId' => ['required', 'uuid'],
        ];
    }
}
