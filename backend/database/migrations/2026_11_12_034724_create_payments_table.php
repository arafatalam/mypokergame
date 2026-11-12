<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('player_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('amount');
            $table->enum('direction', ['house_pays_player', 'player_pays_house']);
            $table->date('paid_at');
            $table->text('note')->nullable();
            $table->foreignId('cashout_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->bigInteger('balance_after');
            $table->uuid('request_id')->unique();
            $table->timestamp('created_at');
            $table->index(['player_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
