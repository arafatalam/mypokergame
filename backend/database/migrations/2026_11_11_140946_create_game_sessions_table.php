<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();
            $table->date('game_date');
            $table->unsignedInteger('game_number');
            $table->string('game_name')->unique();
            $table->enum('status', ['open', 'closed'])->default('open');

            // Save the limits that applied when this game was created.
            $table->unsignedInteger('min_buy_in');
            $table->unsignedInteger('max_buy_in');

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            // Each date has its own sequence.
            $table->unique(['game_date', 'game_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_sessions');
    }
};
