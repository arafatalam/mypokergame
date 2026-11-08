<?php

use App\Actions\Users\GenerateUsername;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('normalizes names into a lowercase username', function () {
    $generator = app(GenerateUsername::class);

    $username = $generator->generate('Éva-Marie', "O'Connor");

    expect($username)->toBe('evamarie.oconnor');
});

test('uses the first available numbered suffix for duplicate names', function () {
    // Existing accounts must keep their usernames when another Sam joins.
    User::factory()->create(['username' => 'sam.carter']);
    User::factory()->create(['username' => 'sam.carter.01']);
    $generator = app(GenerateUsername::class);

    expect($generator->generate('Sam', 'Carter'))->toBe('sam.carter.02');
    expect(User::query()->count())->toBe(2);
});

test('uses the base username when it is available', function () {
    $generator = app(GenerateUsername::class);

    expect($generator->generate('Sam', 'Carter'))->toBe('sam.carter');
    expect(User::query()->count())->toBe(0);
});

test('rejects unsupported or empty normalized name parts with the correct field', function (string $firstName, string $lastName, string $field, string $message) {
    $generator = app(GenerateUsername::class);

    try {
        $generator->generate($firstName, $lastName);
        $this->fail('An invalid name was accepted.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toBe([$field => [$message]]);
    }
})->with([
    'unsupported first name' => ['Sam1', 'Carter', 'first_name', 'Use only letters, spaces, hyphens and apostrophes.'],
    'unsupported last name' => ['Sam', 'Carter!', 'last_name', 'Use only letters, spaces, hyphens and apostrophes.'],
    'empty first name' => ['---', 'Carter', 'first_name', 'This name cannot produce a supported username.'],
    'empty last name' => ['Sam', '---', 'last_name', 'This name cannot produce a supported username.'],
]);
