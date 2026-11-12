<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HouseIncomeResource extends JsonResource
{
    /** @return array{month: string, closedGames: int, income: int} */
    public function toArray(Request $request): array
    {
        return [
            'month' => $this->resource['month'],
            'closedGames' => $this->resource['count'],
            'income' => $this->resource['total'],
        ];
    }
}
