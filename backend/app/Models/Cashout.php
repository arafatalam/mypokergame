<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cashout extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'player_game_visit_id',
        'created_by',
        'ending_chips',
        'cash_paid',
        'balance_after',
        'automatic',
        'request_id',
        'created_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ending_chips' => 'integer',
            'cash_paid' => 'integer',
            'balance_after' => 'integer',
            'automatic' => 'boolean',
        ];
    }
}
