<?php

namespace App\Models;

use App\Enums\RoleCode;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string $username
 * @property string $profile_image_path
 * @property string|null $phone
 * @property RoleCode $role
 * @property bool $is_active
 * @property int $poker_balance
 * @property bool $must_change_password
 * @property string $password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Hidden(['password', 'remember_token', 'poker_balance'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'username',
        'profile_image_path',
        'phone',
        'role',
        'is_active',
        'must_change_password',
        'password',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => RoleCode::class,
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password' => 'hashed',
            'poker_balance' => 'integer',
        ];
    }
}
