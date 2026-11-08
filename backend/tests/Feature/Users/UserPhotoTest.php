<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

beforeEach(function () {
    config(['sanctum.stateful' => ['localhost:7000']]);
    $this->withHeader('Origin', 'http://localhost:7000');
    Storage::fake('local');
});

test('guests cannot fetch a photo even when requesting an image', function () {
    $target = User::factory()->create();
    $this->get(route('api.v1.users.photo', $target), ['Accept' => 'image/png'])
        ->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
});

test('each role can view its own uploaded photo', function (RoleCode $role, string $extension) {
    $photo = UploadedFile::fake()->image('portrait.'.$extension);
    $path = $photo->store('profile-photos', 'local');
    $actor = User::factory()->create(['role' => $role, 'profile_image_path' => $path]);
    $this->actingAs($actor, 'web');
    $response = $this->get(route('api.v1.users.photo', $actor));

    $mimeTypes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $response->assertOk()->assertHeader('Content-Type', $mimeTypes[$extension])
        ->assertHeader('X-Content-Type-Options', 'nosniff');
    expect($response->headers->hasCacheControlDirective('private'))->toBeTrue();
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();
    $response->assertStreamedContent(file_get_contents($photo->getPathname()));
})->with(RoleCode::cases())->with(['jpg', 'jpeg', 'png', 'webp']);

test('photo access follows the complete staff and target role matrix', function (RoleCode $actorRole, RoleCode $targetRole) {
    $actor = User::factory()->create(['role' => $actorRole]);
    $target = User::factory()->create(['role' => $targetRole]);
    $this->actingAs($actor, 'web');

    // Explicit expectations keep this test independent of the policy implementation.
    $allowed = [
        'super_admin' => ['admin', 'manager', 'player'],
        'admin' => ['manager', 'player'],
        'manager' => ['player'],
        'player' => [],
    ];
    $expectedStatus = 404;
    if (in_array($targetRole->value, $allowed[$actorRole->value], true)) {
        $expectedStatus = 200;
    }
    $this->get(route('api.v1.users.photo', $target))->assertStatus($expectedStatus);
})->with(RoleCode::cases())->with(RoleCode::cases());

test('allowed staff receive an uploaded photo rather than a fallback avatar', function () {
    $photo = UploadedFile::fake()->image('portrait.jpg');
    $path = $photo->store('profile-photos', 'local');
    $actor = User::factory()->create(['role' => 'manager']);
    $target = User::factory()->create(['role' => 'player', 'profile_image_path' => $path]);
    $this->actingAs($actor, 'web');
    $response = $this->get(route('api.v1.users.photo', $target));
    $response->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    $response->assertStreamedContent(file_get_contents($photo->getPathname()));
});

test('the endpoint returns the persisted avatar without selecting another', function () {
    $actor = User::factory()->create(['role' => 'player', 'profile_image_path' => 'images/avatars/avatar_20.png']);
    $this->actingAs($actor, 'web');
    foreach ([1, 2] as $attempt) {
        $response = $this->get(route('api.v1.users.photo', $actor));
        $response->assertOk()->assertHeader('Content-Type', 'image/png');
        expect($response->baseResponse->getFile()->getPathname())->toBe(public_path('images/avatars/avatar_20.png'));
    }
    expect($actor->fresh()->profile_image_path)->toBe('images/avatars/avatar_20.png');
});

test('Super Admin can retrieve their separate saved artwork', function () {
    $actor = User::factory()->create(['role' => 'super_admin', 'profile_image_path' => 'images/avatars/super_admin.png']);
    $this->actingAs($actor, 'web');
    $response = $this->get(route('api.v1.users.photo', $actor));
    $response->assertOk();
    expect($response->baseResponse->getFile()->getPathname())->toBe(public_path('images/avatars/super_admin.png'));
});

test('missing photos and unsafe stored paths return not found', function (string $path) {
    $actor = User::factory()->create(['role' => 'player', 'profile_image_path' => $path]);
    $this->actingAs($actor, 'web');
    $response = $this->getJson(route('api.v1.users.photo', $actor));
    $response->assertNotFound();
    expect($response->getContent())->not->toContain($path);
})->with([
    'missing upload' => 'profile-photos/missing.png',
    'private traversal' => 'profile-photos/../../.env',
    'public traversal' => 'images/avatars/../../../.env',
    'absolute path' => '/etc/passwd',
    'external URL' => 'https://example.com/portrait.png',
    'non-image file' => 'profile-photos/secret.txt',
    'wrong avatar' => 'images/avatars/avatar_99.png',
    'reserved artwork' => 'images/avatars/super_admin.png',
]);

test('denied photo access does not inspect private storage', function () {
    $actor = User::factory()->create(['role' => 'player']);
    $target = User::factory()->create(['role' => 'super_admin', 'profile_image_path' => 'profile-photos/secret.png']);
    $this->actingAs($actor, 'web');
    Storage::shouldReceive('disk')->never();
    $this->getJson(route('api.v1.users.photo', $target))->assertNotFound();
});

test('unknown account IDs return not found', function () {
    $actor = User::factory()->create(['role' => 'super_admin']);
    $this->actingAs($actor, 'web');
    $this->getJson(route('api.v1.users.photo', ['user' => 999999]))->assertNotFound();
});

test('a newly created private upload is served to its creator but not after sign out', function (string $diskName) {
    config(['filesystems.default' => $diskName]);
    Storage::fake($diskName);
    $actor = User::factory()->create(['role' => 'manager']);
    $this->actingAs($actor, 'web');
    $photo = UploadedFile::fake()->image('portrait.png');
    $data = User::factory()->make()->only(['first_name', 'last_name', 'email']);
    $data['role'] = 'player';
    $data['photo'] = $photo;

    $this->post(route('api.v1.users.store'), $data, ['Accept' => 'application/json'])->assertCreated();
    $target = User::query()->where('email', $data['email'])->sole();
    Storage::disk($diskName)->assertExists($target->profile_image_path);
    expect(Storage::disk($diskName)->getVisibility($target->profile_image_path))->toBe('private');
    if ($diskName !== 'local') {
        Storage::disk('local')->assertMissing($target->profile_image_path);
    }
    $photoUrl = route('api.v1.users.photo', $target);
    $response = $this->get($photoUrl, ['Accept' => 'image/png']);
    $response->assertOk()->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertStreamedContent(file_get_contents($photo->getPathname()));
    expect($response->headers->hasCacheControlDirective('private'))->toBeTrue();
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();

    $this->postJson(route('api.v1.logout'))->assertOk();
    // A signed-out request must be rejected before storage is touched.
    Storage::shouldReceive('disk')->never();
    $this->get($photoUrl, ['Accept' => 'image/png'])->assertUnauthorized()
        ->assertJsonPath('message', 'Unauthenticated.');
})->with(['local', 'private']);
