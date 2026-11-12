import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, SyntheticEvent } from 'react';
import CasinoTicket from '../../../components/casino-ticket';
import { loadCashoutCorrection, saveCashoutCorrection } from './cashout-correction-api';
import type { CashoutCorrectionDetails, CashoutCorrectionReceipt } from './cashout-correction-api';
import { formatAmount } from './correction-display';

type CashoutCorrectionDialogProps = {
    cashoutId: number;
    fromPayments: boolean;
    onClose: () => void;
    onSaved: () => void;
};

const inputClass = 'w-full min-w-0 rounded border border-current bg-white/70 px-3 py-2';
const secondaryButton = 'min-h-11 rounded-full border border-current px-4';
const primaryButton = 'casino-button min-h-11 rounded-full px-4';

function isWholeDollar(value: string) {
    return /^\d+$/.test(value) && Number(value) <= 2147483647;
}

function CashoutValues(props: {
    previousEndingChips: number;
    previousCashPaid: number;
    endingChips: number;
    cashPaid: number;
}) {
    return (
        <dl className="grid gap-2">
            <div>
                <dt className="font-semibold">Ending chips</dt>
                <dd>{formatAmount(props.previousEndingChips)} → {formatAmount(props.endingChips)}</dd>
            </div>
            <div>
                <dt className="font-semibold">Cash paid</dt>
                <dd>{formatAmount(props.previousCashPaid)} → {formatAmount(props.cashPaid)}</dd>
            </div>
        </dl>
    );
}

export default function CashoutCorrectionDialog(props: CashoutCorrectionDialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const submission = useRef<{ draft: string; id: string } | null>(null);
    const [details, setDetails] = useState<CashoutCorrectionDetails>();
    const [receipt, setReceipt] = useState<CashoutCorrectionReceipt>();
    const [attempt, setAttempt] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);
    const [endingChips, setEndingChips] = useState('');
    const [cashPaid, setCashPaid] = useState('');
    const [reason, setReason] = useState('');
    const [reviewing, setReviewing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(function openDialog() {
        const element = dialog.current;
        element?.showModal();
        return function closeDialog() {
            element?.close();
        };
    }, []);

    useEffect(function loadDetails() {
        const controller = new AbortController();

        async function load() {
            try {
                const saved = await loadCashoutCorrection(props.cashoutId, controller.signal);
                if (!controller.signal.aborted) {
                    setDetails(saved);
                    setEndingChips(String(saved.endingChips));
                    setCashPaid(String(saved.cashPaid));
                }
            } catch {
                if (!controller.signal.aborted) {
                    setLoadFailed(true);
                }
            }
        }

        void load();
        return function cancelLoad() {
            controller.abort();
        };
    }, [props.cashoutId, attempt]);

    const trimmedReason = reason.trim();
    const amountsValid = isWholeDollar(endingChips) && isWholeDollar(cashPaid);
    const changed = details !== undefined && (Number(endingChips) !== details.endingChips || Number(cashPaid) !== details.cashPaid);
    const reasonLength = Array.from(trimmedReason).length;
    const canReview = amountsValid && changed && reasonLength > 0 && reasonLength <= 2000;
    const [retryMessage, setRetryMessage] = useState('');
    const context = receipt ?? details;

    function handleEscape(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        if (!saving && !receipt && !retryMessage) {
            props.onClose();
        }
    }

    function handleRetryLoad() {
        setLoadFailed(false);
        setAttempt(attempt + 1);
    }

    function handleEndingChips(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;
        if (value === '' || isWholeDollar(value)) {
            setEndingChips(value);
        }
    }

    function handleCashPaid(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;
        if (value === '' || isWholeDollar(value)) {
            setCashPaid(value);
        }
    }

    function handleReason(event: ChangeEvent<HTMLTextAreaElement>) {
        setReason(event.currentTarget.value);
    }

    function handleReview(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canReview) {
            setReviewing(true);
        }
    }

    function handleBack() {
        setError('');
        setReviewing(false);
    }

    async function handleSave() {
        if (saving || !canReview || details === undefined) {
            return;
        }

        const draft = {
            previousEndingChips: details.endingChips,
            previousCashPaid: details.cashPaid,
            endingChips: Number(endingChips),
            cashPaid: Number(cashPaid),
            reason: trimmedReason,
        };
        const serialized = JSON.stringify(draft);
        // A lost response must reuse the same request ID for the same draft.
        if (submission.current?.draft !== serialized) {
            submission.current = { draft: serialized, id: crypto.randomUUID() };
        }

        setSaving(true);
        setError('');
        try {
            const saved = await saveCashoutCorrection(details.id, draft, submission.current.id);
            if ('message' in saved) {
                setRetryMessage(saved.message);
            } else {
                setDetails(saved);
                setReceipt(saved);
            }
            setReviewing(false);
            props.onSaved();
        } catch (failure) {
            let message = 'Could not save the correction. Try again.';
            if (axios.isAxiosError<{ message?: string }>(failure)) {
                message = failure.response?.data.message ?? message;
            }
            setError(message);
        } finally {
            setSaving(false);
        }
    }

    function handleAnother() {
        setReceipt(undefined);
        setEndingChips('');
        setCashPaid('');
        setReason('');
        submission.current = null;
    }

    return (
        <dialog ref={dialog} onCancel={handleEscape}
            className="confirmation-ticket-dialog m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overflow-x-hidden bg-transparent">
            <CasinoTicket compactEdges className="grid min-w-0 gap-4 p-6">
                <h3 className="casino-heading text-2xl">
                    {retryMessage || (receipt ? 'Cashout Corrected' : reviewing ? 'Review Cashout Correction' : 'Correct Cashout')}
                </h3>
                {context && <p className="[overflow-wrap:anywhere]">{context.player} · {context.game} · Visit {context.visit}</p>}
                {!details && (
                    <div className="grid gap-3">
                        <p>{loadFailed ? 'Could not load this cashout.' : 'Loading cashout…'}</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={secondaryButton} onClick={props.onClose}>Cancel</button>
                            {loadFailed && <button type="button" className={primaryButton} onClick={handleRetryLoad}>Retry</button>}
                        </div>
                    </div>
                )}
                {details && !reviewing && !receipt && !retryMessage && (
                    <form className="grid min-w-0 gap-3" onSubmit={handleReview}>
                        <label className="grid gap-1">Ending chips
                            <input className={inputClass} inputMode="numeric" value={endingChips} onChange={handleEndingChips} required />
                        </label>
                        <label className="grid gap-1">Cash paid
                            <input className={inputClass} inputMode="numeric" value={cashPaid} onChange={handleCashPaid} required />
                        </label>
                        <label className="grid gap-1">Reason
                            <textarea className={inputClass} rows={3} value={reason} onChange={handleReason} required />
                        </label>
                        {reasonLength > 2000 && <p>Use at most 2,000 characters for the reason.</p>}
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={secondaryButton} onClick={props.onClose}>Cancel</button>
                            <button type="submit" className={primaryButton} disabled={!canReview}>Review</button>
                        </div>
                    </form>
                )}
                {details && reviewing && (
                    <>
                        <CashoutValues previousEndingChips={details.endingChips} previousCashPaid={details.cashPaid}
                            endingChips={Number(endingChips)} cashPaid={Number(cashPaid)} />
                        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]"><strong>Reason</strong><br />{trimmedReason}</p>
                        {error && <p className="[overflow-wrap:anywhere]">{error}</p>}
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={secondaryButton} onClick={props.onClose} disabled={saving}>Cancel</button>
                            <button type="button" className={secondaryButton} onClick={handleBack} disabled={saving}>Back to Edit</button>
                            <button type="button" className={primaryButton} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Correction'}
                            </button>
                        </div>
                    </>
                )}
                {retryMessage && <button type="button" className={secondaryButton} onClick={props.onClose}>Done</button>}
                {receipt && (
                    <>
                        <CashoutValues {...receipt} />
                        <p><strong>Updated balance</strong><br />{formatAmount(receipt.balance)}</p>
                        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]"><strong>Reason</strong><br />{receipt.reason}</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={secondaryButton} onClick={props.onClose}>Done</button>
                            {(!props.fromPayments || receipt.cashPaid > 0) &&
                                <button type="button" className={primaryButton} onClick={handleAnother}>Record Another Correction</button>}
                        </div>
                    </>
                )}
            </CasinoTicket>
        </dialog>
    );
}
