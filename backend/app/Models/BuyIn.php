<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuyIn extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'player_game_visit_id',
        'created_by',
        'cash',
        'credit',
        'balance_after',
        'request_id',
        'created_at',
    ];
}
