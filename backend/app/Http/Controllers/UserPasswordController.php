<?php

namespace App\Http\Controllers;

use App\Actions\Users\UpdateUserPassword;
use App\Http\Requests\Users\UpdateUserPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class UserPasswordController extends Controller
{
    private UpdateUserPassword $updateUserPassword;

    public function __construct(UpdateUserPassword $updateUserPassword)
    {
        $this->updateUserPassword = $updateUserPassword;
    }

    public function __invoke(UpdateUserPasswordRequest $request, User $user): JsonResponse
    {
        $isOwnAccount = $request->user()->is($user);
        $validated = $request->validated();

        $this->updateUserPassword->update(
            $user,
            $validated['password'],
            revokeSessions: ! $isOwnAccount,
        );

        if ($isOwnAccount) {
            // Give Laravel the updated user so it saves the new password check for this browser.
            Auth::guard('web')->setUser($user);
        }

        $data = [
            'message' => 'Password updated successfully.',
            'signed_out' => false,
        ];

        return response()->json($data);
    }
}
