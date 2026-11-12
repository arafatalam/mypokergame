<?php

namespace App\Http\Requests\Players;

use Illuminate\Foundation\Http\FormRequest;

class IndexOutstandingBalancesRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'direction' => ['nullable', 'in:all,collect,pay'],
            'page' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
        ];
    }
}
