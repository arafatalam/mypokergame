<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceUserPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route checks photo edit permission before validating the upload.
        return true;
    }

    /** @return array{photo: list<string>} */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
