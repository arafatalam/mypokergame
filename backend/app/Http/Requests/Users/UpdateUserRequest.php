<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $actor = $this->user();
        $targetUser = $this->route('user');

        // Ask the policy only when Laravel has both accounts.
        if ($actor === null || ! ($targetUser instanceof User)) {
            return false;
        }

        if ($actor->is($targetUser)) {
            return true;
        }

        return $actor->can('update', $targetUser);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Use the account Laravel found from the URL for the email exception.
        $targetUser = $this->route('user');

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],

            // The account can keep its own email, but cannot take another account's email.
            'email' => [
                'required',
                'string',
                'email',
                'max:254',
                Rule::unique('users', 'email')->ignore($targetUser),
            ],

            // A blank phone is allowed. A supplied phone must match +1 506-555-0123.
            'phone' => [
                'nullable',
                'string',
                'regex:/\A\+1 [0-9]{3}-[0-9]{3}-[0-9]{4}\z/',
            ],
        ];
    }
}
