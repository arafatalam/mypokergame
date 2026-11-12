<?php

namespace Database\Seeders;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $players = [
            'Liam Gallant', 'Sophie LeBlanc', 'Ethan Clarke', 'Priya Shah', 'Noah Campbell',
            'Amelia Martin', 'Lucas Roy', 'Maya Patel', 'Owen Fraser', 'Chloe Richard',
            'Daniel Nguyen', 'Isabelle Cormier', 'Adam Haddad', 'Zoe MacDonald', 'Mateo Rivera',
            'Avery Reid', 'Emma Boudreau', 'Felix Tremblay', 'Mia Chen', 'Hugo Gagnon',
            'Olivia Sutherland', 'Arjun Singh', 'Charlotte Ouellet', 'William Wilson', 'Ella Anderson',
            'Leo OConnor', 'Aisha Ahmed', 'Thomas Michaud', 'Alice Gauthier', 'Jack Murphy',
            'Nora McKenzie', 'Samuel Arsenault', 'Eva Dube', 'Henry Morrison', 'Grace Robinson',
            'Amir Rahman', 'Rose Poirier', 'James Bennett', 'Naomi Brooks', 'Theo Pelletier',
            'Sarah Johnston', 'Nathan Brown', 'Clara Landry', 'Yusuf Ali', 'Mila Stewart',
            'Elliot Ross', 'Leila Nasser', 'Julien Bouchard', 'Riley Park', 'Camille Desjardins',
        ];

        $this->createAccount('Skander Ismail', RoleCode::ADMIN, 0);
        foreach ($players as $index => $name) {
            $this->createAccount($name, RoleCode::PLAYER, $index + 1);
        }
    }

    private function createAccount(string $name, RoleCode $role, int $index): void
    {
        [$firstName, $lastName] = explode(' ', $name, 2);
        $username = Str::lower($firstName.'.'.$lastName);
        $avatar = sprintf('%02d', $index % 16 + 1);

        User::query()->create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'email' => $username.'@demo.example.test',
            'phone' => sprintf('+1 506-555-01%02d', $index),
            'profile_image_path' => 'images/avatars/avatar_'.$avatar.'.png',
            'role' => $role,
            'is_active' => true,
            'must_change_password' => false,
            'password' => $username,
        ]);
    }
}
