import { useState } from 'react';
import type { DatedGameListItem } from '../../games/game-list/load-games';
import type { PaymentListItem } from '../../players/payment-list/load-payments';
import CashoutCorrectionDialog from './cashout-correction-dialog';
import CorrectionDialog from './correction-dialog';
import type { CorrectionRecord } from './correction-dialog';
import CorrectionPaymentsTable from './correction-payments-table';
import GameTotalsTable from './game-totals-table';
import './record-correction.css';

export default function RecordCorrection() {
    const [record, setRecord] = useState<CorrectionRecord | null>(null);
    const [cashoutId, setCashoutId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [revision, setRevision] = useState(0);

    function handleCorrectGame(game: DatedGameListItem) {
        setMessage('');
        setRecord({ kind: 'game', game });
    }

    function handleCorrectPayment(payment: PaymentListItem) {
        if (payment.cashoutId != null) {
            setCashoutId(payment.cashoutId);
            return;
        }

        setMessage('');
        setRecord({ kind: 'payment', payment });
    }

    function handleCancel() {
        setRecord(null);
    }

    function handleCashoutClose() {
        setCashoutId(null);
    }

    function refreshLists() {
        // Recreate both lists so their filters, pages and requests start from the defaults.
        setRevision(function nextRevision(previous) {
            return previous + 1;
        });
    }

    function handleSaved(savedMessage?: string) {
        setMessage(savedMessage ?? '');
        setRecord(null);
        refreshLists();
    }

    return (
        <>
            {message && <p>{message}</p>}
            <div key={revision} className="record-correction user-list-layout user-list-screen grid w-full min-w-0 items-start gap-4 lg:grid-cols-2">
                <GameTotalsTable onCorrect={handleCorrectGame} />
                <CorrectionPaymentsTable onCorrect={handleCorrectPayment} />
            </div>
            {cashoutId !== null && <CashoutCorrectionDialog cashoutId={cashoutId} fromPayments
                onClose={handleCashoutClose} onSaved={refreshLists} />}
            {record && <CorrectionDialog record={record} onCancel={handleCancel} onSaved={handleSaved} />}
        </>
    );
}
