import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/confirmation-ticket.css';
import CloseGameReview from '../close-game/close-game-review';
import { closeGame, loadCloseGame } from '../close-game/close-game-api';
import type { CloseGameDetails, CloseGameReceipt } from '../close-game/close-game-api';

type GameDetailsCloseProps = {
    gameId: number;
    gameName: string;
    onCancel: () => void;
    onClosed: (receipt: CloseGameReceipt) => void;
};

export default function GameDetailsClose(props: GameDetailsCloseProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closePending = useRef(false);
    const [details, setDetails] = useState<CloseGameDetails>();
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState(false);

    useLayoutEffect(function () {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return function cleanup() {
            dialog?.close();
        };
    }, []);

    useEffect(function () {
        const controller = new AbortController();

        async function loadReview() {
            try {
                const review = await loadCloseGame(props.gameId, controller.signal);
                if (!controller.signal.aborted) {
                    setDetails(review);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setLoadError(true);
                }
            }
        }

        void loadReview();
        return function cleanup() {
            controller.abort();
        };
    }, [props.gameId, attempt]);

    function handleRetry() {
        setLoadError(false);
        setAttempt(attempt + 1);
    }

    function handleEscape(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        if (!closePending.current) {
            props.onCancel();
        }
    }

    async function handleConfirmClose() {
        if (!details || closePending.current) {
            return;
        }

        // Keep retries on the same review and block repeat clicks while closing.
        closePending.current = true;
        setClosing(true);
        setCloseError(false);
        try {
            const receipt = await closeGame(props.gameId, {
                dealerTips: details.dealerTips,
                gameCosts: details.gameCosts,
            });
            props.onClosed(receipt);
        } catch {
            setCloseError(true);
        } finally {
            closePending.current = false;
            setClosing(false);
        }
    }

    return (
        <dialog ref={dialogRef} onCancel={handleEscape}
            className="confirmation-ticket-dialog m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto bg-transparent">
            <CasinoTicket compactEdges className="p-6">
                {details ? (
                    <CloseGameReview gameName={props.gameName} details={details}
                        dealerTips={details.dealerTips} gameCosts={details.gameCosts}
                        projectedIncome={details.buyIns - details.endingChips - details.dealerTips - details.gameCosts}
                        closing={closing} closeError={closeError} backLabel="Cancel"
                        onBackToEdit={props.onCancel} onConfirmClose={handleConfirmClose} />
                ) : (
                    <div className="grid gap-4">
                        <h3 className="casino-heading text-center text-2xl">Review Close</h3>
                        <p>{loadError ? 'Couldn’t load the close review.' : 'Loading close review…'}</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="min-h-11 rounded-full border border-current px-4" onClick={props.onCancel}>Cancel</button>
                            {loadError && <button type="button" className="casino-button min-h-11 rounded-full px-4" onClick={handleRetry}>Retry</button>}
                        </div>
                    </div>
                )}
            </CasinoTicket>
        </dialog>
    );
}
