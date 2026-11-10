<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UpdateUserPassword
{
    public function update(User $user, string $password, bool $revokeSessions = true): void
    {
        $passwordHash = Hash::make($password);

        $user->getConnection()->transaction(function () use ($user, $passwordHash, $revokeSessions): void {
            $user->password = $passwordHash;

            if ($revokeSessions) {
                $user->setRememberToken(Str::random(60));
            }

            $user->save();

            if ($revokeSessions) {
                DB::connection(config('session.connection'))
                    ->table(config('session.table', 'sessions'))
                    ->where('user_id', $user->getKey())
                    ->delete();
            }
        });
    }
}
