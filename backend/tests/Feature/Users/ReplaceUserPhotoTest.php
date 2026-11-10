<?php

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('authorized staff can replace a portrait and retrieve the saved bytes', function () {
    $disk = Storage::fake(config('filesystems.default'));
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $previousPhoto = UploadedFile::fake()->image('previous.png')->store('profile-photos');
    $player = User::factory()->create([
        'role' => RoleCode::PLAYER,
        'profile_image_path' => $previousPhoto,
    ]);
    $photo = UploadedFile::fake()->image('replacement.png', 80, 80);
    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000');

    $reply = $this->postJson(route('api.v1.users.photo.replace', $player), ['photo' => $photo])
        ->assertOk()
        ->assertJsonPath('has_uploaded_photo', true);

    $newPhoto = $player->fresh()->profile_image_path;
    $disk->assertExists($newPhoto);
    $disk->assertMissing($previousPhoto);
    expect($disk->getVisibility($newPhoto))->toBe('private');
    expect($this->get($reply->json('photo_url'))->assertOk()->streamedContent())->toBe($photo->get());
});

test('removing a saved upload assigns one built-in avatar and keeps it on repeated removal', function () {
    $disk = Storage::fake(config('filesystems.default'));
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $previousPhoto = UploadedFile::fake()->image('previous.png')->store('profile-photos');
    $player = User::factory()->create([
        'role' => RoleCode::PLAYER,
        'profile_image_path' => $previousPhoto,
    ]);
    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000');

    $this->getJson(route('api.v1.users.show', $player))->assertJsonPath('has_uploaded_photo', true);
    $reply = $this->deleteJson(route('api.v1.users.photo.remove', $player))
        ->assertOk()
        ->assertJsonPath('has_uploaded_photo', false);

    $avatarPath = $player->fresh()->profile_image_path;
    expect($avatarPath)->toMatch('/\Aimages\/avatars\/avatar_(0[1-9]|1[0-9]|20)\.png\z/');
    $disk->assertMissing($previousPhoto);
    $this->get($reply->json('photo_url'))->assertOk();
    $this->getJson(route('api.v1.users.show', $player))->assertJsonPath('has_uploaded_photo', false);
    $this->deleteJson(route('api.v1.users.photo.remove', $player))
        ->assertOk()
        ->assertJsonPath('photo_url', $reply->json('photo_url'));
    expect($player->fresh()->profile_image_path)->toBe($avatarPath);
});

test('a rejected photo leaves the saved portrait untouched', function () {
    $disk = Storage::fake(config('filesystems.default'));
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $player = User::factory()->create(['role' => RoleCode::PLAYER]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000')
        ->postJson(route('api.v1.users.photo.replace', $player), [
            'photo' => UploadedFile::fake()->image('large.png')->size(2049),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');

    expect($player->fresh()->profile_image_path)->toBe($player->profile_image_path);
    expect($disk->allFiles())->toBe([]);
});

test('each role can upload and remove their own photo', function (RoleCode $role) {
    $disk = Storage::fake(config('filesystems.default'));
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user, 'web')->withHeader('Origin', 'http://localhost:8000');
    $this->getJson(route('api.v1.users.show', $user))->assertOk()->assertJsonPath('can_change_photo', true);

    $this->postJson(route('api.v1.users.photo.replace', $user), [
        'photo' => UploadedFile::fake()->image('portrait.png'),
    ])->assertOk()->assertJsonPath('has_uploaded_photo', true);

    $uploadedPath = $user->fresh()->profile_image_path;
    $disk->assertExists($uploadedPath);

    $this->deleteJson(route('api.v1.users.photo.remove', $user))
        ->assertOk()
        ->assertJsonPath('has_uploaded_photo', false);

    $disk->assertMissing($uploadedPath);
    expect($user->fresh()->profile_image_path)->toStartWith('images/avatars/');
})->with(RoleCode::cases());

test('photo changes to another account follow the staff update hierarchy', function () {
    $manager = User::factory()->create(['role' => RoleCode::MANAGER]);
    $admin = User::factory()->create(['role' => RoleCode::ADMIN]);

    $this->actingAs($manager, 'web')->withHeader('Origin', 'http://localhost:8000');

    $this->postJson(route('api.v1.users.photo.replace', $admin), [])->assertForbidden();
    $this->deleteJson(route('api.v1.users.photo.remove', $admin))->assertForbidden();
});
