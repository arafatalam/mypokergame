<?php

namespace App\Actions\Auth;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class SignInUser
{
    /** @param array{login: string, password: string, remember?: bool|int|string} $data */
    public function signIn(array $data): void
    {
        // Prepare Laravel's credentials from the already validated form values.
        $credentials = $this->credentials($data['login'], $data['password']);
        $remember = (bool) ($data['remember'] ?? false);

        // Laravel checks the stored password hash and signs in on success.
        $authenticated = Auth::guard('web')->attempt($credentials, $remember);

        if (! $authenticated) {
            // Give the same explanation for missing, inactive and incorrect accounts.
            throw ValidationException::withMessages([
                'login' => ['These credentials do not match our records.'],
            ]);
        }
    }

    /** @return array<string|int, mixed> */
    private function credentials(string $login, string $password): array
    {
        // The password is checked as a hash; the other entries select the account.
        $credentials = [
            'password' => $password,
            'is_active' => true,
            function (Builder $query) use ($login): void {
                // Capture the submitted login for Laravel's later query callback.
                // Either identifier may match, but the account must still be active.
                $query->whereAny(['username', 'email'], $login);
            },
        ];

        return $credentials;
    }
}
