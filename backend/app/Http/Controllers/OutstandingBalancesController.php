<?php

namespace App\Http\Controllers;

use App\Actions\Players\ListOutstandingBalances;
use App\Http\Requests\Players\IndexOutstandingBalancesRequest;
use App\Http\Resources\OutstandingBalanceResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OutstandingBalancesController extends Controller
{
    public function __invoke(IndexOutstandingBalancesRequest $request, ListOutstandingBalances $action): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $balances = $action->get($filters['search'] ?? '', $filters['direction'] ?? 'all');

        return OutstandingBalanceResource::collection($balances);
    }
}
