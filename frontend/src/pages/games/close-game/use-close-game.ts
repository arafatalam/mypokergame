import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react';
import { closeGame, loadCloseGame, loadOpenGames } from './close-game-api';
import type { CloseGameDetails, CloseGameReceipt, OpenGame } from './close-game-api';

const maximumAmount = 2147483647;

export function useCloseGame() {
    const [games, setGames] = useState<OpenGame[]>([]);
    const [gameId, setGameId] = useState<number>();
    const [details, setDetails] = useState<CloseGameDetails>();
    const [dealerTips, setDealerTips] = useState('0');
    const [gameCosts, setGameCosts] = useState('0');
    const [gamesStatus, setGamesStatus] = useState('loading');
    const [detailsStatus, setDetailsStatus] = useState('loading');
    const [gamesAttempt, setGamesAttempt] = useState(0);
    const [detailsAttempt, setDetailsAttempt] = useState(0);
    const [reviewing, setReviewing] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState(false);
    const [receipt, setReceipt] = useState<CloseGameReceipt>();
    const closePending = useRef(false);

    const tipsTooHigh = Number(dealerTips) > maximumAmount;
    const costsTooHigh = Number(gameCosts) > maximumAmount;
    const canReview = details !== undefined && !tipsTooHigh && !costsTooHigh;
    const selectedGame = games.find(function (game) {
        return game.id === gameId;
    });

    useEffect(function () {
        const controller = new AbortController();

        async function loadGames() {
            try {
                const options = await loadOpenGames(controller.signal);
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

        async function loadDetails() {
            try {
                const game = await loadCloseGame(selectedGameId, controller.signal);
                if (controller.signal.aborted) {
                    return;
                }

                setDetails(game);
                setDealerTips(String(game.dealerTips));
                setGameCosts(String(game.gameCosts));
                setDetailsStatus('ready');
            } catch {
                if (!controller.signal.aborted) {
                    setDetailsStatus('error');
                }
            }
        }

        void loadDetails();
        return function cleanup() {
            controller.abort();
        };
    }, [gameId, detailsAttempt]);

    function retryGames() {
        setGamesStatus('loading');
        setGamesAttempt(gamesAttempt + 1);
    }

    function retryDetails() {
        setDetailsStatus('loading');
        setDetailsAttempt(detailsAttempt + 1);
    }

    function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
        // Hide the old preview until the newly selected game has loaded.
        setDetails(undefined);
        setDetailsStatus('loading');
        setGameId(Number(event.target.value));
    }

    function handleDealerTipsChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (/^[0-9]*$/.test(value)) {
            setDealerTips(value.replace(/^0+/, '') || '0');
        }
    }

    function handleGameCostsChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (/^[0-9]*$/.test(value)) {
            setGameCosts(value.replace(/^0+/, '') || '0');
        }
    }

    function handleAmountPaste(event: ClipboardEvent<HTMLInputElement>) {
        if (/[^0-9]/.test(event.clipboardData.getData('text'))) {
            event.preventDefault();
        }
    }

    function handleReview(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canReview) {
            setReviewing(true);
        }
    }

    function handleBackToEdit() {
        setCloseError(false);
        setReviewing(false);
    }

    async function handleConfirmClose() {
        if (gameId === undefined || closePending.current || !reviewing || !canReview) {
            return;
        }

        // Block a second submission before React redraws the disabled buttons.
        closePending.current = true;
        setClosing(true);
        setCloseError(false);
        try {
            const saved = await closeGame(gameId, {
                dealerTips: Number(dealerTips),
                gameCosts: Number(gameCosts),
            });
            setReceipt(saved);
        } catch {
            setCloseError(true);
        } finally {
            closePending.current = false;
            setClosing(false);
        }
    }

    function handleCloseAnotherGame() {
        // Fetch the open list again now that this game has closed.
        setReceipt(undefined);
        setReviewing(false);
        setGames([]);
        setGameId(undefined);
        setDetails(undefined);
        setDetailsStatus('loading');
        retryGames();
    }

    return {
        games, gameId, selectedGame, gamesStatus, detailsStatus, details, dealerTips, gameCosts,
        tipsTooHigh, costsTooHigh, canReview, reviewing, closing, closeError, receipt,
        retryGames, retryDetails, handleGameChange, handleDealerTipsChange, handleGameCostsChange,
        handleAmountPaste, handleReview, handleBackToEdit, handleConfirmClose, handleCloseAnotherGame,
    };
}
