<?php

namespace App\Http\Controllers;

use App\Actions\Users\GetProfilePhotoPath;
use App\Actions\Users\ReplaceProfilePhoto;
use App\Http\Requests\Users\ReplaceUserPhotoRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserPhotoController extends Controller
{
    public function replace(ReplaceUserPhotoRequest $request, User $user, ReplaceProfilePhoto $replaceProfilePhoto): JsonResponse
    {
        $path = $replaceProfilePhoto->replace($user, $request->file('photo'));

        return $this->photoResponse($user, $path);
    }

    public function remove(User $user, ReplaceProfilePhoto $replaceProfilePhoto): JsonResponse
    {
        $path = $replaceProfilePhoto->remove($user);

        return $this->photoResponse($user, $path);
    }

    private function photoResponse(User $user, string $path): JsonResponse
    {
        // The new URL makes the browser request the replacement even if the account ID stays the same.
        $photoUrl = route('api.v1.users.photo', [
            'user' => $user->id,
            'version' => hash('sha256', $path),
        ], false);
        $responseData = [
            'photo_url' => $photoUrl,
            'has_uploaded_photo' => GetProfilePhotoPath::isUpload($path),
        ];

        return response()->json($responseData);
    }

    public function __invoke(
        User $user,
        GetProfilePhotoPath $getProfilePhotoPath
    ): BinaryFileResponse|StreamedResponse {
        // Route middleware checks sign-in and permission before reading the photo.
        $photoPath = $getProfilePhotoPath->get($user);

        $headers = [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if (str_starts_with($photoPath, 'profile-photos/')) {
            // Stream uploads through Laravel from the default storage disk.
            $response = Storage::disk()->response($photoPath, null, $headers);
        } else {
            $response = response()->file($photoPath, $headers);
        }

        $response->setPrivate();

        return $response;
    }
}
