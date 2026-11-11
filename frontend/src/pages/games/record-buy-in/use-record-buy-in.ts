import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { isAxiosError } from 'axios';
import { loadBuyInOptions, saveBuyIn, type BuyInOptions, type BuyInReceipt } from './record-buy-in-api';

export function useRecordBuyIn(initialGameId?: number) {
    const [options, setOptions] = useState<BuyInOptions | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [gameId, setGameId] = useState('');
    const [playerId, setPlayerId] = useState('');
    const [cash, setCash] = useState('');
    const [credit, setCredit] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [receipt, setReceipt] = useState<BuyInReceipt | null>(null);
    const saveInProgress = useRef(false);
    const requestId = useRef<string | null>(null);

    useEffect(function loadOptionsWhenOpened() {
        let ignoreResponse = false;

        async function requestOptions() {
            try {
                const loaded = await loadBuyInOptions();
                if (ignoreResponse) return;
                setOptions(loaded);
                // Select the saved game only if Laravel still lists it as open.
                const initialGame = loaded.games.find(function matchesInitialGame(game) {
                    return game.id === initialGameId;
                });
                if (initialGame) {
                    setGameId(String(initialGame.id));
                } else if (initialGameId === undefined && loaded.games.length === 1) {
                    setGameId(String(loaded.games[0].id));
                }
            } catch {
                if (!ignoreResponse) setLoadFailed(true);
            }
        }

        void requestOptions();
        // Ignore a late response after the user leaves this screen.
        return function ignoreOldOptions() { ignoreResponse = true; };
    }, [initialGameId]);

    const game = options?.games.find(function matchesGame(option) { return String(option.id) === gameId; });
    const player = options?.players.find(function matchesPlayer(option) { return String(option.id) === playerId; });
    const originalGame = options?.games.find(function matchesOriginalGame(option) { return option.id === player?.openGameId; });

    let returnEndingChips = null;
    if (game && player?.openGameId === game.id) {
        returnEndingChips = player.returnEndingChips ?? null;
    }
    const isReturning = returnEndingChips !== null;
    const minimum = Math.max(game?.minimum ?? 0, returnEndingChips ?? 0);
    const maximum = Math.max(game?.maximum ?? 0, returnEndingChips ?? 0);

    let conflict = '';
    if (game && player && originalGame && originalGame.id !== game.id) {
        conflict = player.name + ' is already in ' + originalGame.name + '.';
    }

    const cashAmount = Number(cash);
    const creditAmount = Number(credit);
    const total = cashAmount + creditAmount;
    const validAmounts = /^\d*$/.test(cash) && /^\d*$/.test(credit) &&
        Number.isSafeInteger(cashAmount) && Number.isSafeInteger(creditAmount) && Number.isSafeInteger(total);
    let amountError = '';
    if (!validAmounts) {
        amountError = 'Enter non-negative whole-dollar amounts.';
    } else if (game && (cash !== '' || credit !== '')) {
        if (total < minimum) amountError = 'The minimum buy-in is $' + minimum + '.';
        if (total > maximum) amountError = 'The maximum buy-in is $' + maximum + '.';
        if (isReturning && minimum === maximum && total !== minimum) {
            amountError = 'The return buy-in must be exactly $' + minimum + '.';
        }
    }

    let optionsMessage = '';
    if (loadFailed) {
        optionsMessage = 'Could not load buy-in options. Refresh the page to try again.';
    } else if (!options) {
        optionsMessage = 'Loading buy-in options…';
    } else {
        if (options.games.length === 0) optionsMessage = 'Create a game before recording a buy-in.';
        if (options.players.length === 0) {
            if (optionsMessage) optionsMessage += ' ';
            optionsMessage += 'Create an active Player in Users before recording a buy-in.';
        }
    }

    const locked = saving || receipt !== null;
    const canSave = Boolean(game && player && (cash !== '' || credit !== '') && !conflict && !amountError && !locked && !optionsMessage);

    function clearSaveFeedback() {
        requestId.current = null;
        setSaveError('');
    }

    function clearPlayerAndAmounts() {
        setPlayerId('');
        setCash('');
        setCredit('');
        clearSaveFeedback();
    }

    function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
        setGameId(event.target.value);
        clearPlayerAndAmounts();
    }

    function handlePlayerChange(event: ChangeEvent<HTMLSelectElement>) {
        setPlayerId(event.target.value);
        clearSaveFeedback();
    }

    function handleCashChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        // Reject the entire edit so a paste cannot silently change the amount.
        if (/[^0-9]/.test(value)) return;

        setCash(value);
        clearSaveFeedback();
    }

    function handleCreditChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        // Reject the entire edit so a paste cannot silently change the amount.
        if (/[^0-9]/.test(value)) return;

        setCredit(value);
        clearSaveFeedback();
    }

    function handleRecordAnother() {
        clearPlayerAndAmounts();
        setReceipt(null);
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canSave) {
            setIsReviewOpen(true);
        }
    }

    function handleBackToEdit() {
        setIsReviewOpen(false);
    }

    async function handleConfirmBuyIn() {
        if (!isReviewOpen) return;
        // Guard the request immediately, before React renders the disabled button.
        if (!canSave || !game || !player || saveInProgress.current) return;
        saveInProgress.current = true;
        setIsReviewOpen(false);
        setSaving(true);
        setSaveError('');

        try {
            // An unchanged retry uses the same ID if the first response was lost.
            requestId.current ??= crypto.randomUUID();
            const saved = await saveBuyIn({
                gameId: game.id, playerId: player.id, cash: cashAmount, credit: creditAmount,
                requestId: requestId.current,
            });
            setReceipt(saved);
            // Later selections on this screen must reflect the player's new open game.
            const refreshedPlayers = [];
            for (const option of options?.players ?? []) {
                if (option.id === player.id) {
                    refreshedPlayers.push({ ...option, openGameId: game.id, returnEndingChips: null });
                } else {
                    refreshedPlayers.push(option);
                }
            }
            if (options) setOptions({ games: options.games, players: refreshedPlayers });
        } catch (error) {
            let message = 'Could not record the buy-in. Try again.';
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
        options, optionsMessage, game, player, gameId, playerId, cash, credit, total, validAmounts,
        conflict, amountError, saveError, locked, canSave, saving, receipt, isReturning, minimum, maximum,
        isReviewOpen, handleBackToEdit, handleConfirmBuyIn,
        handleGameChange, handlePlayerChange, handleCashChange, handleCreditChange, handleRecordAnother, handleSubmit,
    };
}
