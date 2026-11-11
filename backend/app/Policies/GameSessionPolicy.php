<?php

namespace App\Policies;

use App\Enums\RoleCode;
use App\Models\User;

class GameSessionPolicy
{
    public function create(User $user): bool
    {
        $canCreateGames = in_array($user->role, [
            RoleCode::SUPERADMIN,
            RoleCode::ADMIN,
            RoleCode::MANAGER,
        ], true);

        return $canCreateGames && $user->is_active && ! $user->must_change_password;
    }
}
