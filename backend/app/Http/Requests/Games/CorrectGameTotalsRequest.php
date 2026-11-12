<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class CorrectGameTotalsRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');
        if (is_string($reason)) {
            $this->merge(['reason' => trim($reason)]);
        }
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $existing = (new UpdateGameTotalsRequest)->rules();

        return [
            'dealerTips' => $existing['dealerTips'],
            'gameCosts' => $existing['gameCosts'],
            'reason' => ['required', 'string', 'max:2000'],
            'requestId' => ['sometimes', 'required', 'uuid'],
        ];
    }
}
