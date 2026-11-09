<?php

use App\Enums\RoleCode;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

beforeEach(function () {
    config(['sanctum.stateful' => ['localhost:7000']]);
});

test('list permission allows staff and denies players', function (string $role, bool $allowed) {
    $actor = User::factory()->make(['role' => $role]);
    expect((new UserPolicy)->viewAny($actor))->toBe($allowed);
})->with([
    'Super Admin' => ['super_admin', true],
    'Admin' => ['admin', true],
    'Manager' => ['manager', true],
    'Player' => ['player', false],
]);

test('guests cannot fetch user pages', function () {
    $this->getJson('/api/v1/users?page=2')->assertUnauthorized();
});

test('players are denied before invalid page input is validated', function () {
    $actor = User::factory()->create(['role' => 'player']);
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users?page=invalid')->assertForbidden();
});

test('five row pages contain exactly the permitted accounts in stable name order', function (string $role, array $staffRoles, int $expectedTotal, int $expectedLastPage) {
    $actor = User::factory()->create(['role' => $role, 'first_name' => 'Zzz', 'last_name' => 'Actor']);
    $players = User::factory()->count(7)->sequence(
        ['last_name' => 'A'], ['last_name' => 'B'], ['last_name' => 'C'],
        ['last_name' => 'D'], ['last_name' => 'E'], ['last_name' => 'Same'], ['last_name' => 'Same'],
    )->create(['role' => 'player', 'first_name' => 'Player']);
    $staff = [];
    foreach (['admin' => 'StaffAdmin', 'manager' => 'StaffManager', 'super_admin' => 'StaffSuper'] as $staffRole => $name) {
        $staff[$staffRole] = User::factory()->create(['role' => $staffRole, 'first_name' => $name]);
    }
    $expectedIds = $players->modelKeys();
    foreach ($staffRoles as $staffRole) {
        $expectedIds[] = $staff[$staffRole]->id;
    }
    if ($role === 'super_admin') {
        $expectedIds[] = $actor->id;
    }
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000');
    $seen = [];
    for ($page = 1; $page <= $expectedLastPage; $page++) {
        $response = $this->getJson('/api/v1/users?page='.$page)->assertOk()
            ->assertJsonPath('meta.current_page', $page)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', $expectedTotal)
            ->assertJsonPath('meta.last_page', $expectedLastPage);
        $ids = array_column($response->json('data'), 'id');
        expect($ids)->toBe(array_slice($expectedIds, ($page - 1) * 5, 5));
        foreach ($response->json('data') as $item) {
            expect(array_keys($item))->toBe(['id', 'first_name', 'last_name', 'username', 'email', 'phone', 'role', 'photo_url']);
            expect($item['photo_url'])->toBe('/api/v1/users/'.$item['id'].'/photo');
            $seen[] = $item['id'];
        }
        if ($page === 1) {
            $response->assertJsonPath('links.prev', null);
        }
        if ($page === $expectedLastPage) {
            $response->assertJsonPath('links.next', null);
        }
    }
    expect($seen)->toBe($expectedIds);
    $expectedOptions = [];
    foreach (['super_admin', 'admin', 'manager', 'player'] as $optionRole) {
        if ($optionRole === 'player' || in_array($optionRole, $staffRoles, true)) {
            $expectedOptions[] = ['value' => $optionRole, 'label' => RoleCode::from($optionRole)->label()];
        }
    }
    expect($response->json('role_options'))->toBe($expectedOptions);
})->with([
    'Super Admin' => ['super_admin', ['admin', 'manager', 'super_admin'], 11, 3],
    'Admin' => ['admin', ['manager'], 8, 2],
    'Manager' => ['manager', [], 7, 2],
]);

test('search and role are applied inside permitted scope before pagination and retained in links', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $hidden = User::factory()->create(['role' => 'super_admin', 'first_name' => 'Match']);
    User::factory()->create(['role' => 'manager', 'first_name' => 'Match']);
    User::factory()->create(['role' => 'player', 'first_name' => 'Different', 'last_name' => 'Unrelated', 'username' => 'unrelated', 'email' => 'unrelated@example.com']);
    $players = User::factory()->count(6)->sequence(
        ['last_name' => 'A'], ['last_name' => 'B'], ['last_name' => 'C'],
        ['last_name' => 'D'], ['last_name' => 'E'], ['last_name' => 'F'],
    )->create(['role' => 'player', 'first_name' => 'Match']);
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000');
    $first = $this->getJson('/api/v1/users?search=Match&role=player')->assertOk()
        ->assertJsonPath('meta.total', 6)->assertJsonCount(5, 'data');
    parse_str(parse_url($first->json('links.next'), PHP_URL_QUERY), $query);
    expect($query)->toMatchArray(['page' => '2', 'search' => 'Match', 'role' => 'player']);
    $this->getJson('/api/v1/users?search=Match&role=player&page=2')->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $players[5]->id)
        ->assertJsonPath('meta.from', 6)->assertJsonPath('meta.to', 6);
    $this->getJson('/api/v1/users?search='.urlencode($hidden->email))->assertOk()
        ->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/users?role=super_admin')->assertOk()
        ->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
});

test('search matches only first and last names', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    $firstNameMatch = User::factory()->create(['role' => 'player', 'first_name' => 'Samira', 'last_name' => 'Brown']);
    $lastNameMatch = User::factory()->create(['role' => 'player', 'first_name' => 'Lee', 'last_name' => 'Sampson']);
    User::factory()->create([
        'role' => 'player',
        'first_name' => 'Alex',
        'last_name' => 'Morgan',
        'username' => 'sam.alias',
        'email' => 'sam.contact@example.com',
    ]);

    $response = $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users?search=Sam')->assertOk()->assertJsonPath('meta.total', 2);

    expect(array_column($response->json('data'), 'id'))->toBe([$lastNameMatch->id, $firstNameMatch->id]);
});

test('empty scoped pages return null range positions and no records', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users')->assertOk()->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.from', null)->assertJsonPath('meta.to', null)
        ->assertJsonPath('meta.total', 0)->assertJsonPath('meta.last_page', 1)
        ->assertJsonPath('links.prev', null)->assertJsonPath('links.next', null);
});

test('a page beyond the last returns no records without exposing other roles', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    User::factory()->create(['role' => 'player']);
    User::factory()->create(['role' => 'super_admin']);
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users?page=20')->assertOk()->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 1)->assertJsonPath('meta.current_page', 20);
});

test('invalid page numbers return validation feedback', function (mixed $page, string $message) {
    $actor = User::factory()->create(['role' => 'manager']);
    $query = http_build_query(['page' => $page]);
    $this->actingAs($actor, 'web')->withHeader('Origin', 'http://localhost:7000')
        ->getJson('/api/v1/users?'.$query)->assertUnprocessable()
        ->assertJsonValidationErrors(['page'])->assertJsonPath('errors.page.0', $message);
})->with([
    'zero' => [0, 'The page field must be at least 1.'],
    'negative' => [-1, 'The page field must be at least 1.'],
    'fraction' => ['1.5', 'The page field must be an integer.'],
    'text' => ['invalid', 'The page field must be an integer.'],
    'array' => [[1], 'The page field must be an integer.'],
    'too large' => ['2147483648', 'The page field must not be greater than 2147483647.'],
]);
