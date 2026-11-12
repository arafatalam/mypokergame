import { Fragment, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import cardFan from '../../../assets/casino/show-user-card-fan.png';
import type { GameListItem } from '../game-list/load-games';
import { formatGameMoney } from '../close-game/format-game-money';
import type { GameTotals } from '../record-game-totals/record-game-totals-api';
import CashoutCorrectionDialog from '../../records/record-correction/cashout-correction-dialog';
import GameDetailsClose from './game-details-close';
import { loadGameDetails } from './load-game-details';
import type { SavedGameDetails } from './load-game-details';
import GameDetailsTotals from './game-details-totals';
import CasinoTicket from '../../../components/casino-ticket';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import '../../../components/player-tab.css';

type GameDetailsProps = {
    game: GameListItem;
    onTotalsSaved: () => void;
};

const playersPerPage = 5;
const gameDateFormat = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
});

function displayAmount(amount: number | null) {
    return amount === null ? '—' : formatGameMoney(amount);
}

function GameDetails(props: GameDetailsProps) {
    const [details, setDetails] = useState<SavedGameDetails>();
    const [loadStatus, setLoadStatus] = useState('loading');
    const [attempt, setAttempt] = useState(0);
    const [showCloseReview, setShowCloseReview] = useState(false);
    const [closedHere, setClosedHere] = useState(false);
    const [savingTotals, setSavingTotals] = useState(false);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [resultFilter, setResultFilter] = useState('all');
    const [cashoutId, setCashoutId] = useState<number | null>(null);
    const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
    const game = details ?? props.game;
    const gameId = game.id;

    useEffect(function () {
        const controller = new AbortController();

        async function load() {
            try {
                const savedGame = await loadGameDetails(gameId, controller.signal);
                if (!controller.signal.aborted) {
                    setDetails(savedGame);
                    setLoadStatus('ready');
                }
            } catch {
                if (!controller.signal.aborted) {
                    setLoadStatus('error');
                }
            }
        }

        void load();
        return function cleanup() {
            controller.abort();
        };
    }, [gameId, attempt]);

    // Apply both filters before choosing the current page.
    const searchName = searchText.trim().toLowerCase();
    const matchingPlayers = (details?.players ?? []).filter(function matchesFilters(player) {
        if (!player.name.toLowerCase().includes(searchName)) {
            return false;
        }

        if (resultFilter === 'winners') {
            return player.result !== null && player.result > 0;
        }
        if (resultFilter === 'losers') {
            return player.result !== null && player.result < 0;
        }

        return true;
    });
    const lastPage = Math.max(1, Math.ceil(matchingPlayers.length / playersPerPage));
    const currentPage = Math.min(page, lastPage);
    const firstPlayerIndex = (currentPage - 1) * playersPerPage;
    const visiblePlayers = matchingPlayers.slice(firstPlayerIndex, firstPlayerIndex + playersPerPage);
    let playerCount = 'No players found';
    if (matchingPlayers.length > 0) {
        playerCount = (firstPlayerIndex + 1) + '–' + (firstPlayerIndex + visiblePlayers.length) + ' of ' + matchingPlayers.length + ' players';
    }
    const ticketClass = 'min-w-0 px-5 py-5 sm:px-8';
    const closedBadge = 'inline-block rounded-full bg-[#620b19] px-3 py-1 text-sm text-[#fff0cf]';
    function reloadDetails() {
        setLoadStatus('loading');
        setAttempt(attempt + 1);
    }

    function handleCashoutClose() {
        setCashoutId(null);
    }

    function handleCashoutSaved() {
        reloadDetails();
        props.onTotalsSaved();
    }

    function handleOpenCloseReview() {
        setShowCloseReview(true);
    }

    function handleCancelClose() {
        setShowCloseReview(false);
    }

    function handleTotalsSaved(totals: GameTotals) {
        setDetails(function updateTotals(previous) {
            return previous && { ...previous, ...totals };
        });
        props.onTotalsSaved();
    }

    function handleClosed(totals: GameTotals) {
        setShowCloseReview(false);
        setClosedHere(true);
        setExpandedPlayer(null);
        setDetails(function updateClosedGame(previous) {
            return previous && { ...previous, ...totals, status: 'closed' };
        });
        // The close can create cashouts, changing player statuses and results.
        reloadDetails();
        props.onTotalsSaved();
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setSearchText(event.currentTarget.value);
        setPage(1);
        setExpandedPlayer(null);
    }

    function handleResultChange(event: ChangeEvent<HTMLSelectElement>) {
        setResultFilter(event.currentTarget.value);
        setPage(1);
        setExpandedPlayer(null);
    }

    function handlePrevious() {
        setExpandedPlayer(null);
        setPage(Math.max(1, currentPage - 1));
    }

    function handleNext() {
        setExpandedPlayer(null);
        setPage(Math.min(lastPage, currentPage + 1));
    }

    function handlePlayerToggle(event: React.MouseEvent<HTMLButtonElement>) {
        const playerId = Number(event.currentTarget.value);
        if (expandedPlayer === playerId) {
            setExpandedPlayer(null);
            return;
        }

        setExpandedPlayer(playerId);
    }

    return (
        <div className="game-details mx-auto w-full min-w-0 max-w-6xl text-[#620b19]">
            <div className="grid items-start gap-4 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-4">
                    {/* Keep the selected game visible while its saved details load. */}
                    <TurquoisePaperTicket className="game-summary-ticket">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex w-full min-w-0 items-center justify-between gap-3">
                                <h3 className="casino-heading min-w-0 text-3xl [overflow-wrap:anywhere] sm:text-4xl">{game.name}</h3>
                                <span className={closedBadge + ' shrink-0'}>{game.status === 'closed' ? 'Closed' : 'Open'}</span>
                            </div>
                            {details && (
                                <dl className="flex w-full flex-wrap justify-between gap-x-8 gap-y-2">
                                    <div><dt>Game date</dt><dd className="font-semibold">{gameDateFormat.format(new Date(details.date))}</dd></div>
                                    <div><dt>Buy-in limits</dt><dd className="font-semibold">{formatGameMoney(details.minBuyIn)}–{formatGameMoney(details.maxBuyIn)}</dd></div>
                                </dl>
                            )}
                        </div>
                        {loadStatus === 'ready' && game.status === 'open' && (
                            <button type="button" className="game-records-button mt-3 w-full rounded-md border px-3 py-3 uppercase" style={{ color: '#620b19' }}
                                disabled={savingTotals} onClick={handleOpenCloseReview}>
                                Close game
                            </button>
                        )}
                        {closedHere && <p className="mt-2 font-semibold">Game closed.</p>}
                    </TurquoisePaperTicket>

                    {details && (
                        <TurquoisePaperTicket className="game-summary-ticket">
                            <GameDetailsTotals game={details} onSaved={handleTotalsSaved}
                                refreshing={loadStatus === 'loading'} onSavingChange={setSavingTotals} />
                        </TurquoisePaperTicket>
                    )}
                </div>

                <CasinoTicket compactEdges className={ticketClass + ' lg:col-span-8'}>
                    {loadStatus === 'loading' && <p>Loading game details…</p>}
                    {loadStatus === 'error' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <p>Couldn’t load game details.</p>
                            <button type="button" className="casino-button rounded-md px-4 py-2" onClick={reloadDetails}>Retry</button>
                        </div>
                    )}
                    {loadStatus === 'ready' && (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-4">
                                <label className="flex w-full min-w-0 max-w-xs items-center gap-3 text-sm font-semibold">
                                    <span className="shrink-0">Search player</span>
                                    <input
                                        className="min-w-0 flex-1 rounded-md border border-[#ad8d5c] bg-[#fff0cf] px-3 py-2 font-normal"
                                        type="search"
                                        maxLength={100}
                                        value={searchText}
                                        onChange={handleSearchChange}
                                    />
                                </label>
                                <label className="flex items-center gap-3 text-sm font-semibold">
                                    Result
                                    <select className="casino-select w-32" value={resultFilter} onChange={handleResultChange}>
                                        <option value="all">All</option>
                                        <option value="winners">Winners</option>
                                        <option value="losers">Losers</option>
                                    </select>
                                </label>
                                <img src={cardFan} alt="" className="ml-auto hidden h-16 w-24 shrink-0 object-contain object-right sm:block" />
                            </div>
                            {/* Keep wide player columns scrollable inside the paper ticket. */}
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] border-collapse text-center">
                                    <thead className="casino-title-band">
                                        <tr className="[&>th]:px-3 [&>th]:py-2">
                                            <th scope="col" className="text-left">Player</th>
                                            <th scope="col">Buy in</th>
                                            <th scope="col">Cash out</th>
                                            <th scope="col">Result</th>
                                            <th scope="col">Cash paid</th>
                                            <th scope="col">History</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&>tr>*]:px-3 [&>tr>*]:py-3">
                                        {visiblePlayers.map(function renderPlayer(player) {
                                            const isExpanded = expandedPlayer === player.id;
                                            let historyRow = null;
                                            if (isExpanded) {
                                                historyRow = (
                                                    <tr key={player.id} className="buy-in-history-row border-b border-[#ad8d5c]">
                                                        <td colSpan={6} className="text-left">
                                                            <div className="max-w-[calc(100vw-96px)] sm:max-w-none">
                                                                <h4 className="font-semibold">Buy-in history</h4>
                                                                <div className="mt-2 overflow-x-auto">
                                                                    <table className="buy-in-history-table w-full min-w-[30rem] text-center text-sm tabular-nums">
                                                                        <thead>
                                                                            <tr className="[&>th]:px-2 [&>th]:py-2">
                                                                                <th scope="col" className="text-left">Purchase</th>
                                                                                <th scope="col">Visit</th>
                                                                                <th scope="col">Cash</th>
                                                                                <th scope="col">Credit</th>
                                                                                <th scope="col">Total</th>
                                                                                <th scope="col">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-[#6cada0]/50">
                                                                            {player.purchases.map(function renderBuyIn(buyIn, index) {
                                                                                // Show one action per visit, even when that visit has top-ups.
                                                                                const firstPurchase = player.purchases[index - 1]?.visit !== buyIn.visit;
                                                                                const cashout = firstPurchase
                                                                                    ? player.cashouts?.find(function matchesVisit(item) {
                                                                                        return item.visit === buyIn.visit;
                                                                                    })
                                                                                    : undefined;

                                                                                function handleCorrectCashout() {
                                                                                    if (cashout) {
                                                                                        setCashoutId(cashout.id);
                                                                                    }
                                                                                }

                                                                                return (
                                                                                    <tr key={buyIn.id} className="[&>*]:px-2 [&>*]:py-2">
                                                                                        <th scope="row" className="text-left font-medium">{buyIn.label}</th>
                                                                                        <td>{buyIn.visit}</td>
                                                                                        <td>{formatGameMoney(buyIn.cash)}</td>
                                                                                        <td>{formatGameMoney(buyIn.credit)}</td>
                                                                                        <td className="font-semibold">{formatGameMoney(buyIn.total)}</td>
                                                                                        <td>
                                                                                            {cashout && (
                                                                                                <button type="button" className="casino-button min-h-8 px-2" onClick={handleCorrectCashout}>
                                                                                                    Correct
                                                                                                </button>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <Fragment key={player.id}>
                                                    <tr className="border-b border-[#ad8d5c]">
                                                        <th scope="row" className="text-left">
                                                            {player.name}
                                                            <span className="ml-2 inline-block whitespace-nowrap text-xs font-normal text-[#620b19]/65">
                                                                {player.stillPlaying ? 'Still playing' : 'Cashed out'}
                                                            </span>
                                                        </th>
                                                        <td>{formatGameMoney(player.buyIns)}</td>
                                                        <td>{displayAmount(player.endingChips)}</td>
                                                        <td>{player.result !== null && player.result > 0 ? '+' : ''}{displayAmount(player.result)}</td>
                                                        <td>{displayAmount(player.cashPaid)}</td>
                                                        <td>
                                                            <button type="button" value={player.id} onClick={handlePlayerToggle} className="cursor-pointer whitespace-nowrap text-[#075152] underline underline-offset-4 hover:text-[#620b19]">
                                                                {isExpanded ? 'Hide history' : 'View history'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {historyRow}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="casino-pagination flex flex-wrap items-center">
                                <span>{playerCount}</span>
                                <span className="casino-pagination-rule" />
                                <button type="button" onClick={handlePrevious} disabled={currentPage === 1}>‹ Previous</button>
                                <button type="button" onClick={handleNext} disabled={currentPage === lastPage}>Next ›</button>
                            </div>
                        </>
                    )}
                </CasinoTicket>
            </div>
            {cashoutId !== null && <CashoutCorrectionDialog cashoutId={cashoutId} fromPayments={false}
                onClose={handleCashoutClose} onSaved={handleCashoutSaved} />}
            {showCloseReview && (
                <GameDetailsClose gameId={gameId} gameName={game.name}
                    onCancel={handleCancelClose} onClosed={handleClosed} />
            )}
        </div>
    );
}

export default GameDetails;
