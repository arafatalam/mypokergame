import { useEffect, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react';
import { loadGameTotals, loadGameTotalsOptions, saveGameTotals } from './record-game-totals-api';
import type { GameTotals, GameTotalsOption } from './record-game-totals-api';

const maximumAmount = 2147483647;

export function useRecordGameTotals() {
    const [games, setGames] = useState<GameTotalsOption[]>([]);
    const [gameId, setGameId] = useState<number>();
    const [requestedGameId, setRequestedGameId] = useState<number>();
    const [gamesStatus, setGamesStatus] = useState('loading');
    const [totalsStatus, setTotalsStatus] = useState('loading');
    const [gamesAttempt, setGamesAttempt] = useState(0);
    const [totalsAttempt, setTotalsAttempt] = useState(0);
    const [saved, setSaved] = useState<GameTotals>();
    const [dealerTips, setDealerTips] = useState('0');
    const [gameCosts, setGameCosts] = useState('0');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveFailed, setSaveFailed] = useState(false);

    const tipsTooHigh = Number(dealerTips) > maximumAmount;
    const costsTooHigh = Number(gameCosts) > maximumAmount;
    const changed = saved !== undefined
        && (Number(dealerTips) !== saved.dealerTips || Number(gameCosts) !== saved.gameCosts);
    const canSave = changed && !tipsTooHigh && !costsTooHigh && !saving && totalsStatus === 'ready';

    useEffect(function () {
        const controller = new AbortController();

        async function loadGames() {
            try {
                const options = await loadGameTotalsOptions(controller.signal);
                if (controller.signal.aborted) {
                    return;
                }

                setGames(options);
                setGameId(options[0]?.id);
                setGamesStatus('ready');
            } catch {
                if (!controller.signal.aborted) {
                    setGamesStatus('error');
                }
            }
        }

        void loadGames();
        return function cleanup() {
            controller.abort();
        };
    }, [gamesAttempt]);

    useEffect(function () {
        if (gameId === undefined) {
            return;
        }

        const selectedGameId = gameId;
        const controller = new AbortController();

        async function loadAmounts() {
            try {
                const totals = await loadGameTotals(selectedGameId, controller.signal);
                if (controller.signal.aborted) {
                    return;
                }

                setSaved(totals);
                setDealerTips(String(totals.dealerTips));
                setGameCosts(String(totals.gameCosts));
                setTotalsStatus('ready');
            } catch {
                if (!controller.signal.aborted) {
                    setTotalsStatus('error');
                }
            }
        }

        void loadAmounts();
        return function cleanup() {
            controller.abort();
        };
    }, [gameId, totalsAttempt]);

    function retryGames() {
        setGamesStatus('loading');
        setGamesAttempt(gamesAttempt + 1);
    }

    function retryTotals() {
        setTotalsStatus('loading');
        setTotalsAttempt(totalsAttempt + 1);
    }

    function selectGame(nextGameId: number) {
        // Hide the previous game's amounts while the next game loads.
        setTotalsStatus('loading');
        setSaved(undefined);
        setDealerTips('0');
        setGameCosts('0');
        setSaveMessage('');
        setGameId(nextGameId);
    }

    function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextGameId = Number(event.target.value);
        if (saving || nextGameId === gameId) {
            return;
        }

        if (changed) {
            setRequestedGameId(nextGameId);
            return;
        }

        selectGame(nextGameId);
    }

    function keepEditing() {
        setRequestedGameId(undefined);
    }

    function discardChanges() {
        if (requestedGameId !== undefined) {
            selectGame(requestedGameId);
        }

        setRequestedGameId(undefined);
    }

    function handleDealerTipsChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (saving || !/^[0-9]*$/.test(value)) {
            return;
        }

        setDealerTips(value.replace(/^0+/, '') || '0');
        setSaveMessage('');
    }

    function handleGameCostsChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (saving || !/^[0-9]*$/.test(value)) {
            return;
        }

        setGameCosts(value.replace(/^0+/, '') || '0');
        setSaveMessage('');
    }

    function handleAmountPaste(event: ClipboardEvent<HTMLInputElement>) {
        // Check the full paste before the browser can strip characters such as line breaks.
        if (/[^0-9]/.test(event.clipboardData.getData('text'))) {
            event.preventDefault();
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (gameId === undefined || !canSave) {
            return;
        }

        setSaving(true);
        setSaveMessage('');
        try {
            const totals = await saveGameTotals(gameId, {
                dealerTips: Number(dealerTips),
                gameCosts: Number(gameCosts),
            });
            setSaved(totals);
            setDealerTips(String(totals.dealerTips));
            setGameCosts(String(totals.gameCosts));
            setSaveFailed(false);
            setSaveMessage('Game totals saved.');
        } catch {
            setSaveFailed(true);
            setSaveMessage('Couldn’t save game totals. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return {
        games, gameId, gamesStatus, totalsStatus, saved, dealerTips, gameCosts, tipsTooHigh, costsTooHigh,
        canSave, saving, saveMessage, saveFailed, requestedGameId,
        handleGameChange, keepEditing, discardChanges, retryGames, retryTotals,
        handleDealerTipsChange, handleGameCostsChange, handleAmountPaste, handleSubmit,
    };
}
