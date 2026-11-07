<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SignInUser;
use App\Actions\Auth\SignOutUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    private SignInUser $signInUser;

    private SignOutUser $signOutUser;

    public function __construct(SignInUser $signInUser, SignOutUser $signOutUser)
    {
        $this->signInUser = $signInUser;
        $this->signOutUser = $signOutUser;
    }

    public function store(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->signInUser->signIn($validated);

        // Renew the session identifier only after authentication succeeds.
        $request->session()->regenerate();

        $data = [
            'message' => 'Signed in successfully.',
        ];

        return response()->json($data);
    }

    public function destroy(Request $request): JsonResponse
    {
        // Report success only after all-device sign-out completes.
        $this->signOutUser->signOut($request);

        $data = [
            'message' => 'Signed out successfully.',
        ];

        return response()->json($data);
    }
}
