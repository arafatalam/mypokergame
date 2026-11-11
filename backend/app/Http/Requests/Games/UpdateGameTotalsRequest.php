<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGameTotalsRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'dealerTips' => ['required', 'integer:strict', 'min:0', 'max:2147483647'],
            'gameCosts' => ['required', 'integer:strict', 'min:0', 'max:2147483647'],
        ];
    }
}
