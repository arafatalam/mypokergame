<?php

use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('a selected account can keep its own email when editing details', function () {
    $player = User::factory()->create();
    $route = new Route('PATCH', '/users/{user}', []);
    $request = UpdateUserRequest::create('/users/'.$player->getKey(), 'PATCH', [
        'first_name' => 'Sam',
        'last_name' => $player->last_name,
        'email' => $player->email,
        'phone' => null,
    ]);
    $route->bind($request);
    $route->setParameter('user', $player);
    $request->setRouteResolver(function () use ($route): Route {
        return $route;
    });

    $validated = Validator::make($request->all(), $request->rules())->validate();

    expect($validated['email'])->toBe($player->email);
});
