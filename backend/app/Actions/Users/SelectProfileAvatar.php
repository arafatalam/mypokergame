<?php

namespace App\Actions\Users;

class SelectProfileAvatar
{
    public static function path(): string
    {
        // Numbered filenames exclude the separate Super Admin artwork.
        $avatarNumber = random_int(1, 20);
        $avatarNumberText = str_pad((string) $avatarNumber, 2, '0', STR_PAD_LEFT);
        $avatarPath = 'images/avatars/avatar_'.$avatarNumberText.'.png';

        return $avatarPath;
    }
}
