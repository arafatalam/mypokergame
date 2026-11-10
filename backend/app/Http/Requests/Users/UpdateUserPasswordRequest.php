<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();
        $targetUser = $this->route('user');

        if ($actor === null || ! ($targetUser instanceof User)) {
            return false;
        }

        return $actor->can('updatePassword', $targetUser);
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'password' => [
                'bail',
                'required',
                'string',
                Password::min(8),
                'confirmed',
                function (string $attribute, string $value, Closure $fail): void {
                    if (strlen($value) > 72) {
                        $fail('The password must be no more than 72 bytes.');
                    }

                    if (str_contains($value, "\0")) {
                        $fail('The password must not contain a null character.');
                    }
                },
            ],
        ];
    }
}
