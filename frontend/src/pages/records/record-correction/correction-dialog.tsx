import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, SyntheticEvent } from 'react';
import CasinoTicket from '../../../components/casino-ticket';
import type { DatedGameListItem } from '../../games/game-list/load-games';
import type { PaymentListItem } from '../../players/payment-list/load-payments';
import { directionLabels } from './correction-display';
import { correctionError, saveGameTotalsCorrection, savePaymentCorrection } from './save-correction';

export type CorrectionRecord =
    | { kind: 'game'; game: DatedGameListItem }
    | { kind: 'payment'; payment: PaymentListItem };

type CorrectionDialogProps = {
    record: CorrectionRecord;
    onCancel: () => void;
    onSaved: (message?: string) => void;
};

function isWholeDollar(value: string, minimum: number): boolean {
    const amount = Number(value);
    return /^\d+$/.test(value) && amount >= minimum && amount <= 2147483647;
}

export default function CorrectionDialog(props: CorrectionDialogProps) {
    const record = props.record;
    const game = record.kind === 'game' ? record.game : null;
    const payment = record.kind === 'payment' ? record.payment : null;
    const [tips, setTips] = useState(String(game?.dealerTips ?? ''));
    const [costs, setCosts] = useState(String(game?.gameCosts ?? ''));
    const [amount, setAmount] = useState(String(payment?.amount ?? ''));
    const [paidAt, setPaidAt] = useState(payment?.paidAt ?? '');
    const [note, setNote] = useState(payment?.note ?? '');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    const request = useRef<{ payload: string; id: string } | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(function openDialog() {
        const dialog = dialogRef.current;
        dialog?.showModal();

        return function closeDialog() {
            dialog?.close();
        };
    }, []);

    function handleTips(event: ChangeEvent<HTMLInputElement>) {
        setTips(event.currentTarget.value);
    }

    function handleCosts(event: ChangeEvent<HTMLInputElement>) {
        setCosts(event.currentTarget.value);
    }

    function handleAmount(event: ChangeEvent<HTMLInputElement>) {
        setAmount(event.currentTarget.value);
    }

    function handleDate(event: ChangeEvent<HTMLInputElement>) {
        setPaidAt(event.currentTarget.value);
    }

    function handleNote(event: ChangeEvent<HTMLTextAreaElement>) {
        setNote(event.currentTarget.value);
    }

    function handleReason(event: ChangeEvent<HTMLTextAreaElement>) {
        setReason(event.currentTarget.value);
    }

    function handleCancel() {
        if (!pending.current) {
            props.onCancel();
        }
    }

    function handleEscape(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        handleCancel();
    }

    const trimmedReason = reason.trim();
    const trimmedNote = note.trim() || null;
    let hasChange = false;
    let fieldError = '';
    let title = '';
    let fields = null;
    const inputClass = 'w-full rounded border border-current bg-white/70 px-3 py-2';

    if (game) {
        title = 'Correct Game Totals';
        hasChange = Number(tips) !== game.dealerTips || Number(costs) !== game.gameCosts;
        if (!isWholeDollar(tips, 0) || !isWholeDollar(costs, 0)) {
            fieldError = 'Enter whole dollars from $0 to $2,147,483,647.';
        }
        fields = (
            <>
                <p>{game.name}</p>
                <label className="grid gap-1">Dealer tips
                    <input className={inputClass} inputMode="numeric" value={tips} onChange={handleTips} />
                </label>
                <label className="grid gap-1">Game costs
                    <input className={inputClass} inputMode="numeric" value={costs} onChange={handleCosts} />
                </label>
            </>
        );
    } else if (payment) {
        title = 'Correct Payment';
        hasChange = Number(amount) !== payment.amount || paidAt !== payment.paidAt || trimmedNote !== payment.note;
        if (!isWholeDollar(amount, 1)) {
            fieldError = 'Enter a whole-dollar amount from $1 to $2,147,483,647.';
        }
        fields = (
            <>
                <p>{payment.player} · {directionLabels[payment.direction]}</p>
                <label className="grid gap-1">Amount
                    <input className={inputClass} inputMode="numeric" value={amount} onChange={handleAmount} />
                </label>
                <label className="grid gap-1">Payment date
                    <input className={inputClass} type="date" required value={paidAt} onChange={handleDate} />
                </label>
                <label className="grid gap-1">Note
                    <textarea className={inputClass} maxLength={2000} value={note} onChange={handleNote} />
                </label>
            </>
        );
    }

    const canSave = hasChange && !fieldError && trimmedReason.length > 0 && trimmedReason.length <= 2000
        && (payment === null || paidAt !== '') && !saving;

    function requestIdFor(draft: object): string {
        // Reuse the ID when retrying the same values after a lost response.
        const payload = JSON.stringify(draft);
        if (request.current?.payload !== payload) {
            request.current = { payload, id: crypto.randomUUID() };
        }
        return request.current.id;
    }

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave || pending.current) {
            return;
        }

        pending.current = true;
        setSaving(true);
        setError('');
        try {
            let message: string | undefined;
            if (game) {
                const draft = { dealerTips: Number(tips), gameCosts: Number(costs), reason: trimmedReason };
                message = await saveGameTotalsCorrection(game.id, { ...draft, requestId: requestIdFor(draft) });
            } else if (payment) {
                const draft = { amount: Number(amount), paidAt, note: trimmedNote, reason: trimmedReason };
                message = await savePaymentCorrection(payment.id, { ...draft, requestId: requestIdFor(draft) });
            }
            props.onSaved(message);
        } catch (requestError) {
            setError(correctionError(requestError));
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }

    return (
        <dialog ref={dialogRef} onCancel={handleEscape}
            className="confirmation-ticket-dialog m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto bg-transparent">
            <CasinoTicket compactEdges className="p-6">
                <form className="grid gap-4" onSubmit={handleSave}>
                    <h3 className="casino-heading text-2xl">{title}</h3>
                    <fieldset disabled={saving} className="grid min-w-0 gap-3">
                        {fields}
                        <label className="grid gap-1">Reason
                            <textarea className={inputClass} required rows={3} value={reason} onChange={handleReason} />
                        </label>
                    </fieldset>
                    {fieldError && <p>{fieldError}</p>}
                    {trimmedReason.length > 2000 && <p>Use at most 2,000 characters for the reason.</p>}
                    {error && <p>{error}</p>}
                    <div className="flex flex-wrap gap-2">
                        <button className="min-h-11 rounded-full border border-current px-4" type="button"
                            disabled={saving} onClick={handleCancel}>Cancel</button>
                        <button className="casino-button min-h-11 rounded-full px-4" type="submit" disabled={!canSave}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </CasinoTicket>
        </dialog>
    );
}
