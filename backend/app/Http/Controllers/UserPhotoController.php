<?php

namespace App\Http\Controllers;

use App\Actions\Users\GetProfilePhotoPath;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserPhotoController extends Controller
{
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
