<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('direct guest API visits return JSON instead of resolving a login redirect', function (string $path) {
    // Address-bar navigation asks for HTML and supplies no frontend Origin.
    $response = $this->get($path, ['Accept' => 'text/html']);

    $response->assertUnauthorized()
        ->assertHeader('Content-Type', 'application/json')
        ->assertExactJson(['message' => 'Unauthenticated.']);
})->with([
    'current user' => ['/api/v1/user'],
    'creation options' => ['/api/v1/users/create-options'],
]);

test('JSON guests cannot read creation options', function () {
    $this->getJson('/api/v1/users/create-options')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Unauthenticated.']);
});

test('staff receive exactly their permitted role values and labels', function (string $actorRole, array $expectedRoles) {
    config(['sanctum.stateful' => ['localhost:7000']]);
    $actor = User::factory()->create(['role' => $actorRole]);
    $this->actingAs($actor, 'web');

    $response = $this->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users/create-options');

    $response->assertOk()->assertExactJson(['roles' => $expectedRoles]);
    $this->assertAuthenticatedAs($actor, 'web');
})->with([
    'Super Admin' => ['super_admin', [
        ['value' => 'admin', 'label' => 'Admin'],
        ['value' => 'manager', 'label' => 'Manager'],
        ['value' => 'player', 'label' => 'Player'],
    ]],
    'Admin' => ['admin', [
        ['value' => 'manager', 'label' => 'Manager'],
        ['value' => 'player', 'label' => 'Player'],
    ]],
    'Manager' => ['manager', [
        ['value' => 'player', 'label' => 'Player'],
    ]],
]);

test('players cannot read creation options', function () {
    config(['sanctum.stateful' => ['localhost:7000']]);
    $actor = User::factory()->create(['role' => 'player']);
    $this->actingAs($actor, 'web');

    $this->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users/create-options')
        ->assertForbidden();
});
