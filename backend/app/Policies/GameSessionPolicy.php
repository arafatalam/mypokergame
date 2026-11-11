<?php

namespace App\Policies;

use App\Enums\RoleCode;
use App\Models\User;

class GameSessionPolicy
{
    public function create(User $user): bool
    {
        return $this->canManageGames($user);
    }

    public function recordBuyIn(User $user): bool
    {
        return $this->canManageGames($user);
    }

    public function recordCashout(User $user): bool
    {
        return $this->canManageGames($user);
    }

    public function recordTotals(User $user): bool
    {
        return $this->canManageGames($user);
    }

    public function close(User $user): bool
    {
        return $this->canManageGames($user);
    }

    private function canManageGames(User $user): bool
    {
        $canManageGames = in_array($user->role, [
            RoleCode::SUPERADMIN,
            RoleCode::ADMIN,
            RoleCode::MANAGER,
        ], true);

        return $canManageGames && $user->is_active && ! $user->must_change_password;
    }
}
