<?php

namespace App\Actions\Users;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class GetProfilePhotoPath
{
    public function get(User $user): string
    {
        $storedPath = $user->profile_image_path;

        // Only generated upload names may resolve inside private photo storage.
        if (preg_match('/\Aprofile-photos\/[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)\z/', $storedPath) === 1) {
            // Bucket uploads keep their storage-relative path.
            abort_unless(Storage::disk()->exists($storedPath), 404);

            return $storedPath;
        } elseif (preg_match('/\Aimages\/avatars\/avatar_(0[1-9]|1[0-9]|20)\.png\z/', $storedPath) === 1) {
            $absolutePath = public_path($storedPath);
        } elseif ($storedPath === 'images/avatars/super_admin.png' && $user->role === RoleCode::SUPERADMIN) {
            $absolutePath = public_path($storedPath);
        } else {
            // Never treat an arbitrary stored path as permission to read a file.
            abort(404);
        }

        abort_unless(is_file($absolutePath), 404);

        return $absolutePath;
    }
}
