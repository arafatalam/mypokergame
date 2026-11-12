<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class CorrectCashoutRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $amount = ['required', 'integer:strict', 'min:0', 'max:2147483647'];

        return [
            'endingChips' => $amount,
            'cashPaid' => $amount,
            'previousEndingChips' => $amount,
            'previousCashPaid' => $amount,
            'reason' => ['required', 'string', 'max:2000'],
            'requestId' => ['required', 'uuid'],
        ];
    }
}
