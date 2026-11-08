<?php

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SignOutUser
{
    public function signOut(Request $request): void
    {
        // Keep the account ID before logout clears the authenticated user.
        $userId = $request->user()->getAuthIdentifier();

        DB::transaction(function () use ($userId): void {
            // Laravel also rotates the account's Remember me token.
            Auth::guard('web')->logout();

            // Prevent the new guest session from retaining this account's user ID.
            Auth::guard('sanctum')->forgetUser();

            // Ordinary logout ends this account's sessions on every device.
            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('user_id', $userId)
                ->delete();
        });

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
