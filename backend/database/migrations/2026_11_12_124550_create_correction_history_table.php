<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('correction_history', function (Blueprint $table): void {
            $table->id();
            foreach (['game_session_id', 'cashout_id', 'payment_id'] as $target) {
                $table->foreignId($target)->nullable()->constrained()->restrictOnDelete();
                $table->unique([$target, 'request_id']);
            }
            foreach ([['game_tips', 'game_costs'], ['cashout_ending_chips', 'cashout_cash_paid'], ['payment_amount', 'payment_paid_at', 'payment_note']] as $fields) {
                foreach ($fields as $column) {
                    foreach (['_before', '_after'] as $suffix) {
                        $name = $column.$suffix;
                        match ($column) {
                            'payment_paid_at' => $table->date($name)->nullable(),
                            'payment_note' => $table->text($name)->nullable(),
                            default => $table->unsignedInteger($name)->nullable(),
                        };
                    }
                }
            }
            $table->foreignId('corrected_by')->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->uuid('request_id')->nullable();
            $table->timestamp('created_at');
        });

        // An audit entry must point to exactly one corrected record.
        $condition = '(NEW.payment_id IS NOT NULL) + (NEW.cashout_id IS NOT NULL) + (NEW.game_session_id IS NOT NULL) <> 1';
        foreach (['INSERT', 'UPDATE'] as $event) {
            $trigger = "CREATE TRIGGER correction_history_target_$event BEFORE $event ON correction_history";
            if (DB::getDriverName() === 'sqlite') {
                DB::unprepared("$trigger WHEN $condition BEGIN SELECT RAISE(ABORT, 'Expected one correction target'); END");
            } else {
                DB::unprepared("$trigger FOR EACH ROW BEGIN IF $condition THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected one correction target'; END IF; END");
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('correction_history');
    }
};
