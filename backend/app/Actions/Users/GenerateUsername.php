<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GenerateUsername
{
    public function generate(string $firstName, string $lastName, ?User $ignoreUser = null): string
    {
        // Check the original names before conversion can remove characters.
        $this->validateOriginalName($firstName, 'first_name');
        $this->validateOriginalName($lastName, 'last_name');

        $firstName = $this->normalizeName($firstName);
        $lastName = $this->normalizeName($lastName);

        // Original characters can be allowed yet clean to an empty name, such as ---.
        $this->validateNormalizedName($firstName, 'first_name');
        $this->validateNormalizedName($lastName, 'last_name');

        $baseUsername = $firstName.'.'.$lastName;
        $username = $this->findAvailableUsername($baseUsername, $ignoreUser);

        return $username;
    }

    private function validateOriginalName(string $name, string $field): void
    {
        // Check before normalization can remove unsupported characters.
        if (! preg_match("/\A[\p{L}\p{M} '’-]+\z/u", $name)) {
            throw ValidationException::withMessages([
                $field => 'Use only letters, spaces, hyphens and apostrophes.',
            ]);
        }
    }

    private function normalizeName(string $name): string
    {
        // Convert accented letters before removing separators and lowercasing.
        $name = Str::ascii($name);
        $name = str_replace([' ', '-', "'"], '', $name);
        $name = strtolower($name);

        return $name;
    }

    private function validateNormalizedName(string $name, string $field): void
    {
        // The generated login name must contain supported letters in both parts.
        if (! preg_match('/\A[a-z]+\z/', $name)) {
            throw ValidationException::withMessages([
                $field => 'This name cannot produce a supported username.',
            ]);
        }
    }

    private function findAvailableUsername(string $baseUsername, ?User $ignoreUser): string
    {
        $username = $baseUsername;
        $suffix = 1;

        while (true) {
            $query = User::query()->where('username', $username);

            // An edit can reuse the username already held by this account.
            if ($ignoreUser !== null) {
                $query->whereKeyNot($ignoreUser->getKey());
            }

            if (! $query->exists()) {
                return $username;
            }

            $ending = '.'.str_pad((string) $suffix, 2, '0', STR_PAD_LEFT);
            $username = $baseUsername.$ending;

            $suffix++;
        }
    }
}
