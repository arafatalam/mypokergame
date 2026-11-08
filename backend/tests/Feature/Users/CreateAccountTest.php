<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('supported photo uploads pass validation including the size boundary', function (string $extension) {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web');
    $this->accountData['photo'] = UploadedFile::fake()->image('portrait.'.$extension)->size(2048);

    $this->post('/api/v1/users', $this->accountData, ['Accept' => 'application/json'])
        ->assertCreated();

    $this->assertDatabaseHas('users', ['email' => $this->accountData['email']]);
    $this->assertDatabaseCount('users', 2);
    $user = User::query()->where('email', $this->accountData['email'])->sole();
    expect($user->profile_image_path)->toStartWith('profile-photos/');
    expect(basename($user->profile_image_path))->not->toBe('portrait.'.$extension);
    Storage::disk('local')->assertExists($user->profile_image_path);
    expect(Storage::disk('local')->get($user->profile_image_path))
        ->toBe(file_get_contents($this->accountData['photo']->getPathname()));
})->with(['jpg', 'jpeg', 'png', 'webp']);

test('invalid photo uploads return 422 without creating an account', function (Closure $makePhoto) {
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web');
    $this->accountData['photo'] = $makePhoto();

    $response = $this->post('/api/v1/users', $this->accountData, ['Accept' => 'application/json']);

    $response->assertUnprocessable()->assertJsonValidationErrors('photo');
    expect($response->json())->not->toHaveKey('generated_password');
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseMissing('users', ['email' => $this->accountData['email']]);
})->with([
    'over size limit' => [function () {
        return UploadedFile::fake()->image('portrait.png')->size(2049);
    }],
    'GIF image' => [function () {
        return UploadedFile::fake()->image('portrait.gif');
    }],
    'SVG image' => [function () {
        return UploadedFile::fake()->createWithContent('portrait.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    }],
    'text disguised as PNG' => [function () {
        $photo = UploadedFile::fake()->createWithContent('portrait.png', 'This is not an image.');
        // Fake uploads otherwise infer MIME from the filename, hiding the bad content.
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($photo->getPathname());

        return $photo->mimeType($mimeType);
    }],
    'truncated PNG' => [function () {
        $photo = UploadedFile::fake()->createWithContent('portrait.png', "\x89PNG\r\n\x1a\n");
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($photo->getPathname());

        return $photo->mimeType($mimeType);
    }],
    'non-file value' => [function () {
        return 'portrait.png';
    }],
]);

test('an explicitly empty optional photo passes validation', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web');
    $this->accountData['photo'] = null;

    $this->postJson('/api/v1/users', $this->accountData)->assertCreated();

    $this->assertDatabaseHas('users', ['email' => $this->accountData['email']]);
    $this->assertDatabaseCount('users', 2);
});

beforeEach(function () {
    config(['sanctum.stateful' => ['localhost:7000']]);
    $this->withHeader('Origin', 'http://localhost:7000');
    $this->accountData = User::factory()->make([
        'first_name' => 'Sam',
        'last_name' => 'Carter',
    ])->only(['first_name', 'last_name', 'email']);
    $this->accountData['role'] = 'player';
});

test('staff can create only their permitted roles and receive usable credentials', function (string $actorRole, string $targetRole) {
    $actor = User::factory()->create(['role' => $actorRole]);
    $this->actingAs($actor, 'web');
    $this->accountData['role'] = $targetRole;

    $response = $this->postJson('/api/v1/users', $this->accountData);

    $response->assertCreated()->assertJsonPath('message', 'Account created successfully.');
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();
    $this->assertDatabaseCount('users', 2);
    $user = User::query()->where('email', $this->accountData['email'])->sole();
    $password = $response->json('generated_password');
    expect($password)->toBeString()->toHaveLength(8);
    expect(Hash::check($password, $user->getRawOriginal('password')))->toBeTrue();
    expect($user->getRawOriginal('password'))->not->toBe($password);
    expect($user->role)->toBe(RoleCode::from($targetRole));
    expect($user->is_active)->toBeTrue();
    expect($user->must_change_password)->toBeFalse();
    expect($user->phone)->toBeNull();
    expect($user->profile_image_path)->toMatch('/\Aimages\/avatars\/avatar_(0[1-9]|1[0-9]|20)\.png\z/');
    expect(is_file(public_path($user->profile_image_path)))->toBeTrue();
    $response->assertExactJson([
        'message' => 'Account created successfully.',
        'username' => 'sam.carter',
        'generated_password' => $password,
    ]);
    $this->assertAuthenticatedAs($actor, 'web');
})->with([
    ['super_admin', 'admin'], ['super_admin', 'manager'], ['super_admin', 'player'],
    ['admin', 'manager'], ['admin', 'player'], ['manager', 'player'],
]);

test('guests cannot create accounts', function () {
    $this->postJson('/api/v1/users', $this->accountData)->assertUnauthorized();
    $this->assertDatabaseCount('users', 0);
});

test('players are denied before field validation', function () {
    $actor = User::factory()->create(['role' => 'player']);
    $this->actingAs($actor, 'web');

    $this->postJson('/api/v1/users', [])->assertForbidden();

    $this->assertDatabaseCount('users', 1);
});

test('staff cannot assign roles outside their hierarchy', function (string $actorRole, string $targetRole) {
    $actor = User::factory()->create(['role' => $actorRole]);
    $this->actingAs($actor, 'web');
    $this->accountData['role'] = $targetRole;

    $response = $this->postJson('/api/v1/users', $this->accountData);

    $response->assertUnprocessable()->assertJsonValidationErrors('role');
    expect($response->json())->not->toHaveKey('generated_password');
    $this->assertDatabaseCount('users', 1);
})->with([
    ['super_admin', 'super_admin'], ['admin', 'super_admin'], ['admin', 'admin'],
    ['manager', 'super_admin'], ['manager', 'admin'], ['manager', 'manager'],
    ['manager', 'invented_role'],
]);

test('invalid account details create nothing', function (string $field, mixed $value) {
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web');
    $this->accountData[$field] = $value;

    $response = $this->postJson('/api/v1/users', $this->accountData);

    $response->assertUnprocessable()->assertJsonValidationErrors($field);
    expect($response->json())->not->toHaveKey('generated_password');
    $this->assertDatabaseCount('users', 1);
})->with([
    ['first_name', ''], ['last_name', ''], ['email', ''], ['email', 'invalid'],
    ['first_name', str_repeat('a', 101)], ['last_name', str_repeat('a', 101)],
    ['first_name', 'Sam1'], ['last_name', '---'],
    ['first_name', ['Sam']], ['phone', '5065550123'], ['role', ''],
]);

test('an existing email is rejected without changing either account', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    $existing = User::factory()->create();
    $original = $existing->fresh()->getAttributes();
    $this->actingAs($actor, 'web');
    $this->accountData['email'] = $existing->email;

    $this->postJson('/api/v1/users', $this->accountData)
        ->assertUnprocessable()->assertJsonValidationErrors('email');

    $this->assertDatabaseCount('users', 2);
    expect($existing->fresh()->getAttributes())->toBe($original);
});

test('server generated credentials and defaults override unvalidated fields', function () {
    $actor = User::factory()->create(['role' => 'manager']);
    User::factory()->create(['username' => 'sam.carter']);
    $this->actingAs($actor, 'web');
    $this->accountData['phone'] = '+1 506-555-0123';
    $this->accountData['username'] = 'chosen.username';
    $this->accountData['password'] = 'chosen-password';
    $this->accountData['is_active'] = false;
    $this->accountData['must_change_password'] = true;
    $this->accountData['profile_image_path'] = 'images/avatars/super_admin.png';

    $response = $this->postJson('/api/v1/users', $this->accountData);

    $response->assertCreated()->assertJsonPath('username', 'sam.carter.01');
    $user = User::query()->where('email', $this->accountData['email'])->sole();
    expect($user->username)->toBe('sam.carter.01');
    expect($user->phone)->toBe('+1 506-555-0123');
    expect($user->is_active)->toBeTrue();
    expect($user->must_change_password)->toBeFalse();
    expect($user->profile_image_path)->not->toBe('images/avatars/super_admin.png');
    expect(Hash::check('chosen-password', $user->password))->toBeFalse();
    expect(Hash::check($response->json('generated_password'), $user->password))->toBeTrue();
    $this->assertDatabaseCount('users', 3);
});
