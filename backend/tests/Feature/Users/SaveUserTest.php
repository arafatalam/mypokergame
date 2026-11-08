<?php

use App\Actions\Users\SaveUser;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, LazilyRefreshDatabase::class);

test('a database insert failure removes only the newly uploaded photo', function (string $diskName) {
    config(['filesystems.default' => $diskName]);
    Storage::fake('local');
    Storage::fake($diskName);
    Storage::disk($diskName)->put('profile-photos/existing.jpg', 'existing photo');
    $existing = User::factory()->create();
    $data = User::factory()->raw(['email' => $existing->email, 'role' => 'player']);
    $data['photo'] = UploadedFile::fake()->image('portrait.jpg');

    expect(function () use ($data) {
        app(SaveUser::class)->save($data);
    })->toThrow(QueryException::class);

    $this->assertDatabaseCount('users', 1);
    expect(Storage::disk($diskName)->allFiles('profile-photos'))->toBe(['profile-photos/existing.jpg']);
    expect(Storage::disk($diskName)->get('profile-photos/existing.jpg'))->toBe('existing photo');
    if ($diskName !== 'local') {
        Storage::disk('local')->assertDirectoryEmpty('profile-photos');
    }
})->with(['local', 'private']);

test('a photo write failure stops account creation', function () {
    $data = User::factory()->raw(['role' => 'player']);
    $data['photo'] = UploadedFile::fake()->image('portrait.jpg');
    $disk = Mockery::mock(FilesystemAdapter::class);
    $disk->shouldReceive('putFileAs')->once()->andReturn(false);
    Storage::shouldReceive('disk')->with(null)->once()->andReturn($disk);

    expect(function () use ($data) {
        app(SaveUser::class)->save($data);
    })->toThrow(RuntimeException::class, 'The profile photo could not be stored.');

    $this->assertDatabaseCount('users', 0);
});

test('returns the saved account and generated password while storing only its hash', function () {
    $data = User::factory()->raw([
        'first_name' => 'Sam',
        'last_name' => 'Carter',
        'role' => 'player',
    ]);
    $action = app(SaveUser::class);

    $result = $action->save($data);

    expect($result)->toHaveKeys(['user', 'generated_password']);
    expect($result['user'])->toBeInstanceOf(User::class);
    expect($result['generated_password'])->toBeString()->toHaveLength(8);

    // Reload from storage so the password checks cover the actual database value.
    $this->assertDatabaseCount('users', 1);
    $savedUser = User::query()->sole();
    expect($result['user']->is($savedUser))->toBeTrue();
    expect($savedUser->username)->toBe('sam.carter');
    expect($savedUser->email)->toBe($data['email']);
    expect($savedUser->getRawOriginal('password'))->not->toBe($result['generated_password']);
    expect(Hash::check($result['generated_password'], $savedUser->getRawOriginal('password')))->toBeTrue();

    // The readable credential belongs to the creation result, never the account record.
    expect(in_array($result['generated_password'], $savedUser->getAttributes(), true))->toBeFalse();
    expect($savedUser->toArray())->not->toHaveKey('password')->not->toHaveKey('generated_password');
});
