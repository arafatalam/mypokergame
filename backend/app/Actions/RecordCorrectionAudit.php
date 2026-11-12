<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordCorrectionAudit
{
    public const TARGETS = ['game_totals' => 'game_session_id', 'cashout' => 'cashout_id', 'payment' => 'payment_id'];

    public const FIELDS = [
        'game_totals' => ['dealerTips' => 'game_tips', 'gameCosts' => 'game_costs'],
        'cashout' => ['endingChips' => 'cashout_ending_chips', 'cashPaid' => 'cashout_cash_paid', 'linkedPaymentAmount' => 'payment_amount'],
        'payment' => ['amount' => 'payment_amount', 'paidAt' => 'payment_paid_at', 'note' => 'payment_note'],
    ];

    public static function columns(string $type, int $id, array $before, array $after): array
    {
        $columns = [self::TARGETS[$type] => $id];
        foreach (self::FIELDS[$type] as $field => $column) {
            $columns[$column.'_before'] = $before[$field] ?? null;
            $columns[$column.'_after'] = $after[$field] ?? null;
        }

        return $columns;
    }

    public static function values(object $entry, string $type, string $side): array
    {
        $values = [];
        foreach (self::FIELDS[$type] as $field => $column) {
            $value = $entry->{$column.'_'.$side};
            $values[$field] = $value !== null && ! in_array($field, ['note', 'paidAt'], true) ? (int) $value : $value;
        }

        return $values;
    }

    /** @param array<string, int|string|null> $corrected */
    public static function isRetry(string $type, int $id, User $staff, array $corrected, string $reason, ?string $requestId): bool
    {
        if ($requestId === null) {
            return false;
        }

        // Check under the record lock so a lost response can be retried without a second write.
        $entry = DB::table('correction_history')
            ->where(self::TARGETS[$type], $id)
            ->where('request_id', strtolower($requestId))
            ->lockForUpdate()
            ->first();
        if ($entry === null) {
            return false;
        }

        $saved = self::values($entry, $type, 'after');

        if ((int) $entry->corrected_by !== $staff->id || $entry->reason !== $reason || $saved !== $corrected) {
            throw ValidationException::withMessages(['correction' => 'This request already saved a different correction.']);
        }

        return true;
    }

    /**
     * @param  array<string, int|string|null>  $previous
     * @param  array<string, int|string|null>  $corrected
     */
    public static function record(
        string $type, int $id, User $staff, array $previous, array $corrected, string $reason, ?string $requestId,
    ): void {
        DB::table('correction_history')->insert(self::columns($type, $id, $previous, $corrected) + [
            'corrected_by' => $staff->id,
            'reason' => $reason,
            'request_id' => $requestId === null ? null : strtolower($requestId),
            'created_at' => now(),
        ]);
    }
}
