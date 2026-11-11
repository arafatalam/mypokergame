<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class StoreBuyInRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route checks the staff permission before validating the draft.
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'gameId' => ['required', 'integer', 'min:1'],
            'playerId' => ['required', 'integer', 'min:1'],
            'cash' => ['required', 'integer', 'min:0', 'max:2147483647'],
            'credit' => ['required', 'integer', 'min:0', 'max:2147483647'],
            'requestId' => ['required', 'uuid'],
        ];
    }
}
