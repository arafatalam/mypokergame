<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ReplaceProfilePhoto
{
    public function replace(User $user, UploadedFile $photo): string
    {
        $newPath = $photo->store('profile-photos', ['visibility' => 'private']);

        if ($newPath === false) {
            throw new RuntimeException('The replacement photo could not be stored.');
        }

        try {
            $savedPath = $this->savePath($user, $newPath);
        } catch (Throwable $exception) {
            Storage::disk()->delete($newPath);

            throw $exception;
        }

        return $savedPath;
    }

    public function remove(User $user): string
    {
        $savedPath = $this->savePath($user, null);

        return $savedPath;
    }

    private function savePath(User $user, ?string $newPath): string
    {
        [$previousPath, $savedPath] = DB::transaction(function () use ($user, $newPath): array {
            // Recheck the current portrait under a lock so repeated removal keeps the assigned avatar.
            $account = User::query()->lockForUpdate()->findOrFail($user->getKey());
            $previousPath = $account->profile_image_path;

            if ($newPath === null && ! GetProfilePhotoPath::isUpload($previousPath)) {
                return [$previousPath, $previousPath];
            }

            $savedPath = $newPath ?? SelectProfileAvatar::path();
            $account->profile_image_path = $savedPath;
            $account->save();

            return [$previousPath, $savedPath];
        });

        // Clean up an old private upload only after the new portrait is committed.
        if (GetProfilePhotoPath::isUpload($previousPath)) {
            try {
                if (! User::query()->where('profile_image_path', $previousPath)->exists()) {
                    Storage::disk()->delete($previousPath);
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return $savedPath;
    }
}
