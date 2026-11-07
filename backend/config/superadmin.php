<?php

return [
    'first_name' => 'Super',
    'last_name' => 'Admin',
    'email' => 'super.admin@example.test',
    'username' => 'super.admin',
    'profile_image_path' => 'images/avatars/super_admin.png',

    // Keep this installation's password outside committed code.
    'password' => env('SUPER_ADMIN_PASSWORD'),
];
