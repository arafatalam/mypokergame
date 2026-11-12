<?php

namespace App\Http\Requests\Payments;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'playerId' => ['required', 'integer', 'min:1'],
            'direction' => ['required', 'in:house_pays_player,player_pays_house'],
            'amount' => ['required', 'integer:strict', 'min:1', 'max:2147483647'],
            'paidAt' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.today(config('payments.timezone'))->toDateString()],
            'note' => ['nullable', 'string', 'max:2000'],
            'requestId' => ['required', 'uuid'],
        ];
    }
}
