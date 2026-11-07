<?php

namespace App\Enums;

enum RoleCode: string
{
    case SUPERADMIN = 'super_admin';
    case ADMIN = 'admin';
    case MANAGER = 'manager';
    case PLAYER = 'player';

    public function label(): string
    {
        return match ($this) {
            self::SUPERADMIN => 'Super Admin',
            self::ADMIN => 'Admin',
            self::MANAGER => 'Manager',
            self::PLAYER => 'Player',
        };
    }
}
