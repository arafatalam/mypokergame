<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateUserDetails
{
    private GenerateUsername $generateUsername;

    public function __construct(GenerateUsername $generateUsername)
    {
        $this->generateUsername = $generateUsername;
    }

    /** @param array{first_name: string, last_name: string, email: string, phone?: string|null} $details */
    public function save(User $user, array $details): User
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            try {
                $savedUser = DB::transaction(function () use ($user, $details): User {
                    // Compare names against the latest saved row, including after a retry.
                    $account = User::query()->lockForUpdate()->findOrFail($user->getKey());
                    $account->fill($details);

                    if ($account->isDirty(['first_name', 'last_name'])) {
                        $account->username = $this->generateUsername->generate(
                            $account->first_name,
                            $account->last_name,
                            $account,
                        );
                    }

                    $account->save();

                    return $account;
                }, attempts: 3);

                return $savedUser;
            } catch (UniqueConstraintViolationException $exception) {
                // Retry only when another write claimed the same username.
                if ($exception->index !== 'users_username_unique'
                    && $exception->columns !== ['username']
                    && $exception->columns !== ['users.username']) {
                    throw $exception;
                }
            }
        }

        throw ValidationException::withMessages([
            'first_name' => 'Accounts with this name are being saved right now. Please try saving again.',
        ]);
    }
}
