import cardFan from '../../../assets/casino/create-game-card-fan.png';
import pokerFace from '../../../assets/casino/create-game-poker-face.png';
import smugChip from '../../../assets/casino/create-game-smug-chip.png';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import { saveGame } from './save-game';
import { loadGameCreateOptions } from './load-game-create-options';


type CreateGameProps = {
    onCancel: () => void;
    onGameCreated: (gameId: number) => void;
};

function CreateGame(props: CreateGameProps) {

    const [useCustomLimits, setUseCustomLimits] = useState(false);
    // Keep amounts as text so either field can be cleared while editing.
    const [minimumBuyIn, setMinimumBuyIn] = useState('');
    const [maximumBuyIn, setMaximumBuyIn] = useState('');
    const [defaultLimits, setDefaultLimits] = useState<{ minimum: string; maximum: string } | null>(null);
    const [gameName, setGameName] = useState('—');
    const [gameDetails, setGameDetails] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [saveError, setSaveError] = useState('');
    const saveInProgress = useRef(false);
    const isScreenOpen = useRef(false);

    useEffect(function loadCreateGamePreview() {
        isScreenOpen.current = true;

        async function requestGameName() {
            try {
                const options = await loadGameCreateOptions();
                const limits = {
                    minimum: String(options.default_min_buy_in),
                    maximum: String(options.default_max_buy_in),
                };
                setDefaultLimits(limits);
                setMinimumBuyIn(limits.minimum);
                setMaximumBuyIn(limits.maximum);
                setGameName(options.game_name);
                const date = new Date(options.game_date);
                const formattedDate = date.toLocaleDateString('en-CA', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC', // Preserve the calendar date Laravel sent.
                });
                setGameDetails(formattedDate + ' · Game ' + options.game_number);
            } catch {
                setGameName('Game name unavailable');
            }
        }

        // Load the game preview and house limits when the ticket opens.
        void requestGameName();
        return function markScreenClosed() {
            isScreenOpen.current = false;
        };
    }, []);

    function handleCustomLimitsChange(event: ChangeEvent<HTMLInputElement>) {
        setUseCustomLimits(event.currentTarget.checked);

        // Turning custom limits off restores the house limits loaded for this ticket.
        if (!event.currentTarget.checked && defaultLimits !== null) {
            setMinimumBuyIn(defaultLimits.minimum);
            setMaximumBuyIn(defaultLimits.maximum);
        }
    }

    function handleMinimumBuyInChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;

        // Accept digits only, including an empty value while the amount is being replaced.
        if (/^[0-9]*$/.test(value)) {
            setMinimumBuyIn(value);
        }
    }

    function handleMaximumBuyInChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;

        if (/^[0-9]*$/.test(value)) {
            setMaximumBuyIn(value);
        }
    }

    let buyInHeading = 'Default buy-in limits';

    if (useCustomLimits) {
        buyInHeading = 'Custom buy-in limits';
    }

    // Wait for both amounts before comparing them, so clearing a field doesn't show a range error.
    let buyInError = '';

    if (useCustomLimits && minimumBuyIn !== '' && maximumBuyIn !== '' && BigInt(maximumBuyIn) < BigInt(minimumBuyIn)) {
        buyInError = 'Maximum buy-in must be at least the minimum.';
    }

    const amountsMissing = useCustomLimits && (minimumBuyIn === '' || maximumBuyIn === '');
    const canSave = defaultLimits !== null && !amountsMissing && buyInError === '' && !isSaving;

    function handleReviewGame() {
        if (canSave && !saveInProgress.current) {
            setIsReviewOpen(true);
        }
    }

    function handleBackToEdit() {
        setIsReviewOpen(false);
    }

    async function handleConfirmCreateGame() {
        if (!isReviewOpen || !canSave || saveInProgress.current) {
            return;
        }

        // Lock immediately so a second confirmation cannot send another request.
        saveInProgress.current = true;
        setIsReviewOpen(false);
        setIsSaving(true);
        setSaveError('');

        let gameId: number;
        try {
            const game = await saveGame({
                game_name: gameName,
                use_custom_limits: useCustomLimits,
                min_buy_in: Number(minimumBuyIn),
                max_buy_in: Number(maximumBuyIn),
            });
            gameId = game.id;
        } catch (error) {
            let message = 'Could not confirm the save. Reopen Create Game before trying again.';

            if (isAxiosError(error) && error.response?.status === 403) {
                message = 'You do not have permission to create a game.';
            }

            if (isAxiosError<{ message?: string }>(error) && error.response?.status === 422) {
                message = error.response.data.message ?? message;
            }

            setSaveError(message);
            return;
        } finally {
            saveInProgress.current = false;
            setIsSaving(false);
        }

        // Keep the current destination if staff navigated away during the save.
        if (isScreenOpen.current) {
            props.onGameCreated(gameId);
        }
    }

    return (
        <div className="relative mx-auto w-full max-w-[37.5rem]">
            <CasinoTicket compactEdges className="w-full min-w-0 p-6 text-[#620b19] sm:aspect-[1.18] sm:p-8">
                <div className="grid gap-5 sm:h-full sm:grid-rows-[auto_1fr_auto]">
                    <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">
                        Create Game
                    </h2>

                    <div className="grid gap-4 sm:items-center sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        {/* Game identity and artwork occupy the left half on desktop. */}
                        <div className="grid min-w-0 content-start justify-items-center gap-3 text-center sm:justify-items-start sm:text-left">
                            <dl className="grid min-w-0 gap-1">
                                <dt className="font-semibold">Game name</dt>
                                <dd className="casino-heading break-words text-2xl font-bold sm:text-3xl">
                                    {gameName}
                                </dd>
                                <dd className="text-sm">{gameDetails}</dd>
                            </dl>
                            <img src={cardFan} alt="" className="h-auto w-52 max-w-full" />
                        </div>

                        <section className="min-w-0 border-t border-[#620b19]/25 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                            <h3 className="mb-2 font-bold">{buyInHeading}</h3>
                            {/* Keep the dollar sign separate so the whole row can accept clicks and the value stays digits-only. */}
                            <dl className="grid gap-2 text-center">
                                <div className="rounded-lg border border-[#620b19]/35 bg-white/35 px-3 py-2">
                                    <dt className="text-sm font-semibold">Minimum</dt>
                                    <dd className="relative rounded text-2xl font-bold tabular-nums has-[:read-write]:bg-[#d9f0e8] focus-within:has-[:read-write]:bg-[#c6e7dd] focus-within:has-[:read-write]:ring-1 focus-within:has-[:read-write]:ring-inset focus-within:has-[:read-write]:ring-[#075152]">
                                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center">$</span>
                                        <input
                                            className="w-full min-w-0 border-0 bg-transparent px-6 text-center create-game-amount"
                                            type="text"
                                            inputMode="numeric"
                                            value={minimumBuyIn}
                                            onChange={handleMinimumBuyInChange}
                                            readOnly={!useCustomLimits || isSaving}
                                        />
                                    </dd>
                                </div>
                                <div className="rounded-lg border border-[#620b19]/35 bg-white/35 px-3 py-2">
                                    <dt className="text-sm font-semibold">Maximum</dt>
                                    <dd className="relative rounded text-2xl font-bold tabular-nums has-[:read-write]:bg-[#d9f0e8] focus-within:has-[:read-write]:bg-[#c6e7dd] focus-within:has-[:read-write]:ring-1 focus-within:has-[:read-write]:ring-inset focus-within:has-[:read-write]:ring-[#075152]">
                                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center">$</span>
                                        <input
                                            className="w-full min-w-0 border-0 bg-transparent px-6 text-center create-game-amount"
                                            type="text"
                                            inputMode="numeric"
                                            value={maximumBuyIn}
                                            onChange={handleMaximumBuyInChange}
                                            readOnly={!useCustomLimits || isSaving}
                                        />
                                    </dd>
                                </div>
                            </dl>
                            <p hidden={buyInError === ''} className="mt-2 text-sm font-semibold">
                                {buyInError}
                            </p>
                            <label className="mt-3 flex items-center gap-2">
                                <input type="checkbox" checked={useCustomLimits} disabled={defaultLimits === null || isSaving} onChange={handleCustomLimitsChange} />
                                Use custom limits
                            </label>
                        </section>
                    </div>

                    <div>
                        <p hidden={saveError === ''} className="mb-2 text-sm font-semibold">{saveError}</p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <button
                                type="button"
                                disabled={!canSave}
                                onClick={handleReviewGame}
                                data-invalid={buyInError !== ''}
                                className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase data-[invalid=true]:opacity-50"
                            >
                                {isSaving ? 'Saving…' : 'Create Game'}
                            </button>
                            <button type="button" disabled={isSaving} onClick={props.onCancel} className="min-h-11 rounded-full border border-current px-5 py-2 font-semibold">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </CasinoTicket>

            <ConfirmationTicket
                isOpen={isReviewOpen}
                title="Review Game"
                message={(
                    <>
                        <strong className="block break-words">{gameName}</strong>
                        <span className="block">{buyInHeading}</span>
                        <span className="block">Minimum ${minimumBuyIn}</span>
                        <span className="block">Maximum ${maximumBuyIn}</span>
                    </>
                )}
                cancelLabel="Back to Edit"
                confirmLabel="Confirm Create Game"
                onCancel={handleBackToEdit}
                onConfirm={handleConfirmCreateGame}
            />

            {/* Keep the artwork in the space beside the ticket on wide screens. */}
            <img src={pokerFace} alt="" className="pointer-events-none absolute right-full top-0 mr-4 hidden w-[calc((100vw_-_37.5rem)*0.4344)] max-w-none xl:block" />
            <img src={smugChip} alt="" className="pointer-events-none absolute bottom-0 left-full ml-4 hidden w-[calc((100vw_-_37.5rem)*0.36)] max-w-none xl:block" />
        </div>
    );
}

export default CreateGame;
