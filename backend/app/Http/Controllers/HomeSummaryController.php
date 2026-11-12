<?php

namespace App\Http\Controllers;

use App\Actions\GetHomeSummary;
use Illuminate\Http\JsonResponse;

class HomeSummaryController extends Controller
{
    public function __invoke(GetHomeSummary $action): JsonResponse
    {
        $summary = $action->get();

        return response()->json($summary);
    }
}
