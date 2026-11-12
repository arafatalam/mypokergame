<?php

namespace App\Http\Resources;

use App\Actions\RecordCorrectionAudit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class CorrectionHistoryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        foreach (RecordCorrectionAudit::TARGETS as $type => $column) {
            if ($this->{$column} !== null) {
                $targetId = $this->{$column};
                break;
            }
        }
        $before = RecordCorrectionAudit::values($this->resource, $type, 'before');
        $after = RecordCorrectionAudit::values($this->resource, $type, 'after');
        $changes = [];

        foreach ($after as $field => $value) {
            $previous = $before[$field] ?? null;
            if ($previous !== $value) {
                $changes[$field] = ['before' => $previous, 'after' => $value];
            }
        }

        return [
            'id' => $this->id,
            'type' => $type,
            'affectedRecord' => $this->affectedRecord($type, (int) $targetId),
            'changes' => $changes,
            'staff' => $this->staff_first_name.' '.$this->staff_last_name,
            'correctedAt' => Carbon::parse($this->created_at, 'UTC')->toIso8601String(),
            'reason' => $this->reason,
        ];
    }

    private function affectedRecord(string $type, int $targetId): string
    {
        if ($type === 'game_totals') {
            return $this->game_name ?? 'Game #'.$targetId;
        }

        if ($type === 'payment') {
            $payment = 'Payment #'.$targetId;
            if ($this->player_first_name !== null) {
                return $this->player_first_name.' '.$this->player_last_name.' · '.$payment;
            }

            return $payment;
        }

        if ($this->cashout_game_name !== null) {
            return $this->cashout_first_name.' '.$this->cashout_last_name.' · '.$this->cashout_game_name.' · Visit '.$this->cashout_visit_number;
        }

        return 'Cashout #'.$targetId;
    }
}
