<?php

namespace App\Http\Controllers;

use App\Actions\Games\ListHouseIncome;
use App\Http\Requests\Games\IndexGameMonthRequest;
use App\Http\Resources\HouseIncomeResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HouseIncomeController extends Controller
{
    public function __invoke(IndexGameMonthRequest $request, ListHouseIncome $action): AnonymousResourceCollection
    {
        $months = $action->get(
            $request->validated('from_month'),
            $request->validated('to_month'),
            (int) $request->validated('page', 1),
        );

        return HouseIncomeResource::collection($months);
    }
}
