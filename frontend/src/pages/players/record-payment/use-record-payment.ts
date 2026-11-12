import { isAxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, SubmitEvent } from 'react';
import { loadPaymentOptions, savePayment } from './record-payment-api';
import type { PaymentDirection, PaymentOptions, PaymentReceipt } from './record-payment-api';

const maximumAmount = 2147483647;

export function useRecordPayment(direction: PaymentDirection, initialPlayerId: number | undefined, refreshKey: number, onPaymentSaved: () => void) {
    const [options, setOptions] = useState<PaymentOptions | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [playerId, setPlayerId] = useState('');
    const [initialPlayerUnavailable, setInitialPlayerUnavailable] = useState(false);
    const pendingInitialPlayerId = useRef(initialPlayerId);
    const resetDateOnLoad = useRef(true);
    const [amount, setAmount] = useState('');
    const [paidAt, setPaidAt] = useState('');
    const [note, setNote] = useState('');
    const [reviewing, setReviewing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
    const requestId = useRef<string | null>(null);
    const saveInProgress = useRef(false);

    useEffect(function loadOptions() {
        const controller = new AbortController();

        async function requestOptions() {
            try {
                const loaded = await loadPaymentOptions(controller.signal);
                if (!controller.signal.aborted) {
                    setOptions(loaded);
                    if (resetDateOnLoad.current) {
                        setPaidAt(loaded.today);
                        resetDateOnLoad.current = false;
                    }
                    const preferredId = pendingInitialPlayerId.current;
                    if (preferredId !== undefined) {
                        // Resolve the shortcut against the active-player list only once.
                        pendingInitialPlayerId.current = undefined;
                        const eligible = loaded.players.some(function matchesInitialPlayer(option) {
                            return option.id === preferredId;
                        });
                        if (eligible) {
                            setPlayerId(String(preferredId));
                        } else {
                            setInitialPlayerUnavailable(true);
                        }
                    }
                }
            } catch {
                if (!controller.signal.aborted) {
                    setLoadFailed(true);
                }
            }
        }

        void requestOptions();
        return function cancelRequest() {
            controller.abort();
        };
    }, [loadAttempt, refreshKey]);

    const player = options?.players.find(function matchesPlayer(option) {
        return String(option.id) === playerId;
    });
    let resultingBalance = 0;
    const paymentAmount = Number(amount);
    if (player) {
        resultingBalance = player.balance + paymentAmount;
        if (direction === 'house_pays_player') {
            resultingBalance = player.balance - paymentAmount;
        }
    }

    const locked = saving || receipt !== null;
    const validAmount = paymentAmount >= 1 && paymentAmount <= maximumAmount;
    const validDate = Boolean(options && /^\d{4}-\d{2}-\d{2}$/.test(paidAt) && paidAt <= options.today);
    const canReview = Boolean(player && validAmount && validDate && !locked);

    function reloadOptions() {
        setLoadFailed(false);
        setOptions(null);
        setLoadAttempt(function nextAttempt(previous) { return previous + 1; });
    }

    function handleRetryLoadOptions() {
        reloadOptions();
    }

    function clearSaveFeedback() {
        // A changed draft needs a new ID. An unchanged retry keeps its ID.
        requestId.current = null;
        setSaveError('');
    }

    function handlePlayerChange(id: string) {
        if (id === playerId) {
            return;
        }
        setPlayerId(id);
        setInitialPlayerUnavailable(false);
        setAmount('');
        clearSaveFeedback();
    }

    function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;
        if (/^[0-9]*$/.test(value)) {
            setAmount(value);
            clearSaveFeedback();
        }
    }

    function handleAmountPaste(event: ClipboardEvent<HTMLInputElement>) {
        if (/[^0-9]/.test(event.clipboardData.getData('text'))) {
            event.preventDefault();
        }
    }

    function handleDateChange(date: string) {
        setPaidAt(date);
        clearSaveFeedback();
    }

    function handleNoteChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setNote(event.currentTarget.value);
        clearSaveFeedback();
    }

    function handleReview(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canReview) {
            setReviewing(true);
        }
    }

    function handleBackToEdit() {
        setReviewing(false);
    }

    async function handleConfirmPayment() {
        if (!reviewing || !canReview || !player || saveInProgress.current) {
            return;
        }

        saveInProgress.current = true;
        setReviewing(false);
        setSaving(true);
        setSaveError('');
        try {
            requestId.current ??= crypto.randomUUID();
            const saved = await savePayment({
                playerId: player.id,
                direction,
                amount: paymentAmount,
                paidAt,
                note: note.trim() || null,
                requestId: requestId.current,
            });
            setReceipt(saved);
            // Refresh player options so the next payment uses the latest balance.
            onPaymentSaved();
        } catch (error) {
            let message = 'Could not record the payment. Try again.';
            if (isAxiosError<{ message?: string }>(error) && error.response?.status === 422) {
                message = error.response.data.message ?? message;
            }
            setSaveError(message);
        } finally {
            saveInProgress.current = false;
            setSaving(false);
        }
    }

    return {
        options, loadFailed, initialPlayerUnavailable, player, amount, paymentAmount, paidAt, note, direction, resultingBalance,
        validAmount, validDate, locked, canReview, reviewing, saving, saveError, receipt, handleRetryLoadOptions,
        handlePlayerChange, handleAmountChange, handleAmountPaste, handleDateChange, handleNoteChange,
        handleReview, handleBackToEdit, handleConfirmPayment,
    };
}
