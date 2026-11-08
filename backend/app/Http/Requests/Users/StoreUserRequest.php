<?php

namespace App\Http\Requests\Users;

use App\Actions\Users\GetAssignableRoles;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // The route will enforce UserPolicy::create before validation.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {

        $actor = $this->user();
        $getAssignableRoles = new GetAssignableRoles;
        $allowedRoles = $getAssignableRoles->get($actor);

        return [
            // Both names are needed to generate the username later.
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],

            'email' => [
                'required',
                'string',
                'email',
                'max:254',
                'unique:users,email',
            ],

            // Phone is optional, but supplied numbers must use our format.
            'phone' => [
                'nullable',
                'string',
                'regex:/\A\+1 [0-9]{3}-[0-9]{3}-[0-9]{4}\z/',
            ],

            // Check permission even if someone changes the browser's role choices.
            'role' => [
                'required',
                'string',
                Rule::in($allowedRoles),
            ],
            // Check optional uploads before any photo is stored.
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ];
    }
}
