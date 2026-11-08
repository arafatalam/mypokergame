<?php

namespace App\Actions\Users;

use App\Enums\RoleCode;
use App\Models\User;

class GetAssignableRoles
{
    /** @return list<RoleCode> */
    public function get(User $actor): array
    {
        $role = $actor->role;

        // Limit choices using the signed-in person's role.
        if ($role === RoleCode::SUPERADMIN) {
            return [
                RoleCode::ADMIN,
                RoleCode::MANAGER,
                RoleCode::PLAYER,
            ];
        }

        if ($role === RoleCode::ADMIN) {
            return [
                RoleCode::MANAGER,
                RoleCode::PLAYER,
            ];
        }

        if ($role === RoleCode::MANAGER) {
            return [RoleCode::PLAYER];
        }

        // Everyone else receives no assignable roles.
        return [];
    }
}
