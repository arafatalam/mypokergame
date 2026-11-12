<?php

return [
    // Payment dates follow the poker room's calendar, including when UTC rolls into tomorrow.
    'timezone' => env('PAYMENT_TIMEZONE', 'America/Moncton'),
];
