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
        $signedOut = $request->user()->is($user);
        $validated = $request->validated();

        $this->updateUserPassword->update($user, $validated['password']);

        if ($signedOut) {
            // The action already rotated the token for every remembered device.
            Auth::guard('web')->logoutCurrentDevice();
            Auth::guard('sanctum')->forgetUser();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $data = [
            'message' => 'Password updated successfully.',
            'signed_out' => $signedOut,
        ];

        return response()->json($data);
    }
}
