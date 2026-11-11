<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSession extends Model
{
    protected function casts(): array
    {
        return [
            'dealer_tips' => 'integer',
            'game_costs' => 'integer',
        ];
    }
}
