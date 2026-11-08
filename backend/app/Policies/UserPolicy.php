<?php

namespace App\Policies;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): Response
    {
        // Everyone may view their own account, including their saved photo.
        if ($user->is($model)) {
            return Response::allow();
        }

        $viewerRole = $user->role;
        $targetRole = $model->role;

        if ($viewerRole === RoleCode::SUPERADMIN
            && in_array($targetRole, [RoleCode::ADMIN, RoleCode::MANAGER, RoleCode::PLAYER], true)) {
            return Response::allow();
        }

        if ($viewerRole === RoleCode::ADMIN
            && in_array($targetRole, [RoleCode::MANAGER, RoleCode::PLAYER], true)) {
            return Response::allow();
        }

        if ($viewerRole === RoleCode::MANAGER && $targetRole === RoleCode::PLAYER) {
            return Response::allow();
        }

        // Do not reveal whether an account outside this person's scope exists.
        return Response::denyAsNotFound();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        $role = $user->role;

        // Only staff may begin creating an account.
        return $role === RoleCode::SUPERADMIN
            || $role === RoleCode::ADMIN
            || $role === RoleCode::MANAGER;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }
}
