<?php

namespace Database\Seeders;

use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            // Demo history must never be mixed with an existing roster or ledger.
            if (User::query()->where('role', '!=', RoleCode::SUPERADMIN->value)->exists()
                || DB::table('game_sessions')->exists()) {
                throw new RuntimeException('Demo seeding requires a fresh database with at most the Super Admin.');
            }

            $this->call([
                SuperAdminSeeder::class,
                DemoAccountsSeeder::class,
                DemoGamesSeeder::class,
                DemoPaymentsSeeder::class,
                DemoPaymentCorrectionsSeeder::class,
            ]);
        });
    }
}
