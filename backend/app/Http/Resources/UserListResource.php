<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Build the protected photo URL for this account using a relative path.
        $photoUrl = route(
            'api.v1.users.photo',
            ['user' => $this->id],
            false
        );
        // Choose the identity fields exposed for each account.
        $userData = [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'username' => $this->username,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => [
                'value' => $this->role->value,
                'label' => $this->role->label(),
            ],
            'photo_url' => $photoUrl,
        ];

        return $userData;
    }
}
