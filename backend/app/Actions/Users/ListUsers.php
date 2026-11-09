<?php

namespace App\Actions\Users;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ListUsers
{
    /** @return Builder<User> */
    public function query(User $actor, string $search = '', string $role = ''): Builder
    {
        $visibleRoles = $this->getVisibleRoles($actor->role);

        $query = User::query()
            ->whereIn('role', $visibleRoles)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id');

        // Narrow the permitted accounts to the selected role.
        if ($role !== '') {
            $query->where('role', $role);
        }

        if ($search !== '') {
            $pattern = '%'.$search.'%';

            // Match the search in any of these four fields.
            $query->whereAny([
                'first_name',
                'last_name',
            ], 'like', $pattern);

        }

        return $query;
    }

    /** @return list<array{value: string, label: string}> */
    public function getRoleOptions(RoleCode $role): array
    {
        $visibleRoles = $this->getVisibleRoles($role);
        $roleOptions = [];

        foreach ($visibleRoles as $roleValue) {
            // Convert the stored string into its enum to read the label.
            $visibleRole = RoleCode::from($roleValue);

            $roleOptions[] = [
                'value' => $visibleRole->value,
                'label' => $visibleRole->label(),
            ];
        }

        return $roleOptions;
    }

    /** @return list<string> */
    private function getVisibleRoles(RoleCode $role): array
    {
        $visibleRoles = [];

        // Managers may list Player accounts only.
        if ($role === RoleCode::MANAGER) {
            $visibleRoles = [RoleCode::PLAYER->value];
        }
        // Admins may list Manager and Player accounts.
        if ($role === RoleCode::ADMIN) {
            $visibleRoles = [
                RoleCode::MANAGER->value,
                RoleCode::PLAYER->value,
            ];
        }
        // Super Admin may list every account, including their own.
        if ($role === RoleCode::SUPERADMIN) {
            $visibleRoles = [
                RoleCode::SUPERADMIN->value,
                RoleCode::ADMIN->value,
                RoleCode::MANAGER->value,
                RoleCode::PLAYER->value,
            ];
        }

        return $visibleRoles;
    }
}
