<?php

namespace App\Http\Requests\Games;

use Illuminate\Foundation\Http\FormRequest;

class IndexGamesRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $toDate = ['nullable', 'date_format:Y-m-d'];
        if ($this->filled('from_date')) {
            $toDate[] = 'after_or_equal:from_date';
        }

        return [
            'page' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => $toDate,
            'status' => ['nullable', 'in:all,open,closed'],
        ];
    }
}
