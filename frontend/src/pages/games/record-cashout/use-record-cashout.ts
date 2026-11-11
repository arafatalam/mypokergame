import { isAxiosError } from 'axios';
import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { loadCashoutOptions, saveCashout, type CashoutOptions, type CashoutReceipt } from './record-cashout-api';

const maximumAmount = 2147483647;

export function useRecordCashout() {
    const [options, setOptions] = useState<CashoutOptions | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [gameId, setGameId] = useState('');
    const [visitId, setVisitId] = useState('');
    const [endingChips, setEndingChips] = useState('0');
    const [cashPaid, setCashPaid] = useState('0');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [receipt, setReceipt] = useState<CashoutReceipt | null>(null);
    const saveInProgress = useRef(false);
    const requestId = useRef<string | null>(null);

    useEffect(function loadOptionsWhenOpened() {
        let ignoreResponse = false;

        async function requestOptions() {
            try {
                const loaded = await loadCashoutOptions();
                if (ignoreResponse) return;
                setOptions(loaded);
                if (loaded.games.length === 1) {
                    setGameId(String(loaded.games[0].id));
                }
            } catch {
                if (!ignoreResponse) setLoadFailed(true);
            }
        }

        void requestOptions();
        return function ignoreOldOptions() { ignoreResponse = true; };
    }, []);

    const game = options?.games.find(function matchesGame(option) { return String(option.id) === gameId; });
    const players = (options?.players ?? []).filter(function matchesGame(option) { return option.gameId === game?.id; });
    const player = players.find(function matchesVisit(option) { return String(option.visitId) === visitId; });
    const endingChipsAmount = Number(endingChips);
    const cashPaidAmount = Number(cashPaid);
    const validAmounts = /^\d*$/.test(endingChips) && /^\d*$/.test(cashPaid) &&
        endingChipsAmount <= maximumAmount && cashPaidAmount <= maximumAmount;
    const locked = saving || receipt !== null;
    const canReview = Boolean(game && player && validAmounts && !locked);

    let hint = 'Player’s buy-ins for this game';
    if (loadFailed) {
        hint = 'Could not load cashout options. Refresh to try again.';
    } else if (!options) {
        hint = 'Loading cashout options…';
    } else if (options.games.length === 0) {
        hint = 'There are no open games.';
    } else if (game && players.length === 0) {
        hint = 'No players are eligible in this game.';
    }

    if (!validAmounts) hint = 'Enter whole-dollar amounts from $0 to $2,147,483,647.';
    if (saveError) hint = saveError;

    function clearSaveFeedback() {
        requestId.current = null;
        setSaveError('');
    }

    function clearPlayerAndAmounts() {
        setVisitId('');
        setEndingChips('0');
        setCashPaid('0');
        clearSaveFeedback();
    }

    function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
        setGameId(event.target.value);
        clearPlayerAndAmounts();
    }

    function handlePlayerChange(event: ChangeEvent<HTMLSelectElement>) {
        setVisitId(event.target.value);
        clearSaveFeedback();
    }

    function handleEndingChipsChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        // Reject the entire edit so a paste cannot silently change the amount.
        if (/[^0-9]/.test(value)) return;

        setEndingChips(value);
        clearSaveFeedback();
    }

    function handleCashPaidChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        // Reject the entire edit so a paste cannot silently change the amount.
        if (/[^0-9]/.test(value)) return;

        setCashPaid(value);
        clearSaveFeedback();
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canReview) setIsReviewOpen(true);
    }

    function handleBackToEdit() {
        setIsReviewOpen(false);
    }

    function handleRecordAnother() {
        if (options && player) {
            // Keep the saved player in the locked form until the user starts a new cashout.
            const remainingPlayers = options.players.filter(function isAnotherVisit(option) {
                return option.visitId !== player?.visitId;
            });
            setOptions({ games: options.games, players: remainingPlayers });
        }
        clearPlayerAndAmounts();
        setReceipt(null);
    }

    async function handleConfirmCashout() {
        if (!isReviewOpen || !canReview || !game || !player || saveInProgress.current) return;

        // Guard against a second click before React renders the pending state.
        saveInProgress.current = true;
        setIsReviewOpen(false);
        setSaving(true);
        setSaveError('');

        try {
            // Keep the same ID when retrying an unchanged draft after a lost response.
            requestId.current ??= crypto.randomUUID();
            const saved = await saveCashout({
                gameId: game.id, playerId: player.id, visitId: player.visitId,
                endingChips: endingChipsAmount, cashPaid: cashPaidAmount,
                requestId: requestId.current,
            });
            setReceipt(saved);
        } catch (error) {
            let message = 'Could not record the cashout. Try again.';
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
        options, game, players, player, gameId, visitId, endingChips, cashPaid, endingChipsAmount, cashPaidAmount,
        hint, locked, saving, canReview, isReviewOpen, receipt, handleGameChange, handlePlayerChange,
        handleEndingChipsChange, handleCashPaidChange, handleSubmit, handleBackToEdit, handleConfirmCashout, handleRecordAnother,
    };
}
