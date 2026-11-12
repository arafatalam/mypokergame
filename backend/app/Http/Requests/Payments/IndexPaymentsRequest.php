<?php

namespace App\Http\Requests\Payments;

use Illuminate\Foundation\Http\FormRequest;

class IndexPaymentsRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
            'per_page' => ['nullable', 'integer', 'in:5,10'],
            'player_id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:100'],
            'direction' => ['nullable', 'in:player_pays_house,house_pays_player'],
        ];
    }
}
