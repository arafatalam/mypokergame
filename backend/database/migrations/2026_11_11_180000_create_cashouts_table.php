<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashouts', function (Blueprint $table): void {
            $table->id();
            // One receipt per visit, including the zero-dollar receipt created on game close.
            $table->foreignId('player_game_visit_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('ending_chips');
            $table->unsignedInteger('cash_paid');
            $table->bigInteger('balance_after');
            $table->boolean('automatic')->default(false);
            // Automatic cashouts are created without a browser request ID.
            $table->uuid('request_id')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashouts');
    }
};
