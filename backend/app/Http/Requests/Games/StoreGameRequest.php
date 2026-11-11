<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route checks GameSessionPolicy::create before validation.
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'game_name' => ['required', 'string', 'max:255'],
            'use_custom_limits' => ['required', 'boolean'],
            // House-limit games use server defaults, even if amounts were submitted.
            'min_buy_in' => ['exclude_unless:use_custom_limits,true', 'required', 'integer', 'min:0', 'max:2147483647'],
            'max_buy_in' => ['exclude_unless:use_custom_limits,true', 'required', 'integer', 'gte:min_buy_in', 'max:2147483647'],
        ];
    }
}
