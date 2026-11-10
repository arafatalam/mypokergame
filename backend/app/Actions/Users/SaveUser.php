<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SaveUser
{
    private GenerateUsername $generateUsername;

    public function __construct(GenerateUsername $generateUsername)
    {
        // Keep the generator available for the account-saving method.
        $this->generateUsername = $generateUsername;
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone?: string|null, role: string, photo?: UploadedFile|null}  $data
     * @return array{user: User, generated_password: string}
     */
    public function save(array $data): array
    {
        // Generate the username before preparing the account for saving.
        $username = $this->generateUsername->generate(
            $data['first_name'],
            $data['last_name']
        );

        // Keep the readable password available for the one-time creation response.
        $password = Str::password(8);

        $photo = $data['photo'] ?? null;
        $image = $this->prepareProfileImage($photo);
        $user = $this->saveAccount($data, $username, $password, $image);

        // Return credentials only after the account saves successfully.
        $result = [
            'user' => $user,
            'generated_password' => $password,
        ];

        return $result;
    }

    /** @return array{path: string, uploaded_path: string|null} */
    private function prepareProfileImage(?UploadedFile $photo): array
    {
        $storedPhotoPath = null;

        if ($photo !== null) {
            $storedPhotoPath = $this->storePhoto($photo);
            $imagePath = $storedPhotoPath;
        } else {
            $imagePath = SelectProfileAvatar::path();
        }

        // Remember which file belongs only to this creation attempt.
        $image = [
            'path' => $imagePath,
            'uploaded_path' => $storedPhotoPath,
        ];

        return $image;
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone?: string|null, role: string, photo?: UploadedFile|null}  $data
     * @param  array{path: string, uploaded_path: string|null}  $image
     */
    private function saveAccount(array $data, string $username, string $password, array $image): User
    {
        try {
            $accountData = $this->buildAccountData($data, $username, $password, $image['path']);
            $user = $this->prepareUser($accountData);
            $user->save();
        } catch (Throwable $exception) {
            // A failed account save must not remove a shared fallback avatar.
            if ($image['uploaded_path'] !== null) {
                Storage::disk()->delete($image['uploaded_path']);
            }

            throw $exception;
        }

        return $user;
    }

    private function storePhoto(UploadedFile $photo): string
    {
        // Use the environment's default disk and keep uploads private.
        $storedPath = $photo->store('profile-photos', [
            'visibility' => 'private',
        ]);

        // Do not continue creating an account if its photo could not be saved.
        if ($storedPath === false) {
            throw new RuntimeException('The profile photo could not be stored.');
        }

        return $storedPath;
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone?: string|null, role: string, photo?: UploadedFile|null}  $data
     * @return array{first_name: string, last_name: string, email: string, phone: string|null, role: string, username: string, password: string, profile_image_path: string, is_active: bool, must_change_password: bool}
     */
    private function buildAccountData(array $data, string $username, string $password, string $avatarPath): array
    {
        // Copy only permitted fields; account defaults remain server-controlled.
        $accountData = [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'username' => $username,
            'password' => $password,
            'profile_image_path' => $avatarPath,

            // Apply our account defaults rather than accepting these from the request.
            'is_active' => true,
            'must_change_password' => false,
        ];

        return $accountData;
    }

    /** @param array<string, mixed> $accountData */
    private function prepareUser(array $accountData): User
    {
        $user = new User;

        // Filling applies the model's password hash cast before any database write.
        $user->fill($accountData);

        return $user;
    }
}
