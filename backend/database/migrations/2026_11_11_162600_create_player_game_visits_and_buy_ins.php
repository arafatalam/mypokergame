<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_game_visits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->restrictOnDelete();
            $table->foreignId('player_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->index(['player_id', 'game_session_id', 'closed_at']);
        });

        Schema::create('buy_ins', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('player_game_visit_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('cash');
            $table->unsignedInteger('credit');
            $table->bigInteger('balance_after');
            $table->uuid('request_id');
            $table->timestamp('created_at');

            // An unchanged retry can recover the original receipt after a lost response.
            $table->unique(['player_game_visit_id', 'created_by', 'request_id'], 'buy_ins_visit_staff_request_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buy_ins');
        Schema::dropIfExists('player_game_visits');
    }
};
