<?php

namespace Database\Seeders;

use App\Actions\Payments\CorrectPayment;
use App\Enums\RoleCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoPaymentCorrectionsSeeder extends Seeder
{
    public function run(CorrectPayment $corrections): void
    {
        $staff = User::query()->where('username', 'skander.ismail')
            ->whereIn('role', [RoleCode::ADMIN->value, RoleCode::MANAGER->value])->sole();
        $date = Carbon::yesterday(config('payments.timezone'))->setTime(23, 30);

        foreach (['player_pays_house', 'house_pays_player'] as $direction) {
            $payments = DB::table('payments')->where('direction', $direction)->whereNull('cashout_id')
                ->whereDate('paid_at', $date->toDateString())->oldest('id')->limit(3)->get();
            foreach ($payments as $payment) {
                // Keep the payout link untouched and audit the settlement correction.
                $amount = $payment->amount > 5 ? $payment->amount - 5 : $payment->amount;
                $note = 'Settlement checked against the cash log.';

                Carbon::withTestNow($date, function () use ($corrections, $staff, $payment, $amount, $note): void {
                    $corrections->save($staff, $payment->id, $amount, $payment->paid_at, $note, 'Reconciled with the cash log.', Str::uuid()->toString());
                });
            }
        }
    }
}
