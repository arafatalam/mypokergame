<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class IndexGameMonthRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $monthRules = ['bail', 'nullable', 'date_format:Y-m', 'before_or_equal:'.now()->format('Y-m')];
        $toRules = $monthRules;
        if ($this->filled('from_month')) {
            $toRules[] = 'after_or_equal:from_month';
        }

        return [
            'page' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
            'from_month' => $monthRules,
            'to_month' => $toRules,
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['to_month.after_or_equal' => 'To month must be the same as or later than From month'];
    }
}
