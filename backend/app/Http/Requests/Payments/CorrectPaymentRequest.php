<?php

namespace App\Http\Requests\Payments;

use Illuminate\Foundation\Http\FormRequest;

class CorrectPaymentRequest extends FormRequest
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
        $existing = (new StorePaymentRequest)->rules();

        return [
            'amount' => $existing['amount'],
            'paidAt' => $existing['paidAt'],
            'note' => $existing['note'],
            'reason' => ['required', 'string', 'max:2000'],
            'requestId' => ['sometimes', 'required', 'uuid'],
        ];
    }
}
