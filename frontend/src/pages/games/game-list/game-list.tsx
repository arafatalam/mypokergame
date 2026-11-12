import CasinoCalendar from '../../../components/casino-calendar';
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import missingIncomeArtwork from '../../../assets/casino/game-list-missing-income.webp';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/pagination.css';
import '../../users/user-list/user-list.css';
import { buildGameRows } from './build-game-rows';
import { loadGames } from './load-games';
import type { GameFilters, GameListItem, GameListRequest, GameListResponse } from './load-games';

const emptyFilters: GameFilters = { fromDate: '', toDate: '', status: 'all' };

type GameListProps = {
    initialFilters?: GameFilters;
    onOpenGame: (gameName: string, game: GameListItem) => void;
    onCreateGame: () => void;
    totalsRevision?: number;
};

type GameListResult = {
    request: GameListRequest;
    lastPage: GameListResponse | null;
    failed: boolean;
};

function GameList(props: GameListProps) {
    // Keep the visible dates and the first request in sync when opening from House Income.
    const initialFilters = props.initialFilters ?? emptyFilters;
    const [filters, setFilters] = useState(initialFilters);
    const [request, setRequest] = useState<GameListRequest>({ ...initialFilters, page: 1 });
    const [result, setResult] = useState<GameListResult | null>(null);
    const [filterError, setFilterError] = useState('');

    useEffect(function fetchGamePage() {
        const controller = new AbortController();

        async function fetchGames() {
            try {
                const response = await loadGames(request, controller.signal);
                if (!controller.signal.aborted) {
                    setResult({ request, lastPage: response, failed: false });
                }
            } catch {
                if (!controller.signal.aborted) {
                    // Keep the last successful page visible while retrying or changing filters.
                    setResult(function keepLastPage(previous) {
                        return { request, lastPage: previous?.lastPage ?? null, failed: true };
                    });
                }
            }
        }

        void fetchGames();

        return function cancelRequest() {
            controller.abort();
        };
    }, [request, props.totalsRevision]);

    const page = result?.lastPage ?? null;
    const loading = result?.request !== request;
    const failed = !loading && result.failed;
    const canPaginate = !loading && !failed && page !== null;

    function handleFromDateChange(date: string) {
        setFilters({ ...filters, fromDate: date });
        setFilterError('');
    }

    function handleToDateChange(date: string) {
        setFilters({ ...filters, toDate: date });
        setFilterError('');
    }

    function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
        const status = event.currentTarget.value;
        if (status === 'all' || status === 'open' || status === 'closed') {
            setFilters({ ...filters, status });
        }
    }

    function handleApply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
            setFilterError('To date must be on or after From date.');
            return;
        }

        setFilterError('');
        setRequest({ ...filters, page: 1 });
    }

    function handleClear() {
        setFilters(emptyFilters);
        setFilterError('');
        setRequest({ ...emptyFilters, page: 1 });
    }

    function handlePrevious() {
        if (canPaginate && page.meta.current_page > 1) {
            setRequest({ ...request, page: page.meta.current_page - 1 });
        }
    }

    function handleNext() {
        if (canPaginate && page.meta.current_page < page.meta.last_page) {
            setRequest({ ...request, page: page.meta.current_page + 1 });
        }
    }

    function handleRetry() {
        // Retry the failed request even if someone has edited the unapplied fields.
        setRequest({ ...request });
    }

    let pageMessage = '';
    if (page?.meta.from != null && page.meta.to != null) {
        pageMessage = page.meta.from + '–' + page.meta.to + ' of ' + page.meta.total;
    }

    let feedback = null;
    if (loading) {
        feedback = <p>Loading games…</p>;
    } else if (failed) {
        feedback = <p>Couldn’t load games. <button className="underline" type="button" onClick={handleRetry}>Retry</button></p>;
    } else if (page?.data.length === 0) {
        let message = 'No games yet.';
        if (page.has_games) {
            message = 'No games match these filters.';
        }
        feedback = <p>{message}</p>;
    }

    return (
        <section className="user-list-layout user-list-screen grid w-full min-w-0 gap-4 lg:grid-cols-12">
            <CasinoTicket compactEdges className="user-list-ticket relative min-w-0 lg:col-span-10">
                {/* Wrap the filters before the table needs to scroll. */}
                <form className="user-list-filters game-list-filters flex flex-wrap items-end" onSubmit={handleApply}>
                    <div className="user-list-role-filter game-list-date">
                        <span>From date</span>
                        <CasinoCalendar label="From date" value={filters.fromDate} onChange={handleFromDateChange} clearable anchored />
                    </div>
                    <div className="user-list-role-filter game-list-date">
                        <span>To date</span>
                        <CasinoCalendar label="To date" value={filters.toDate} onChange={handleToDateChange} clearable anchored />
                    </div>
                    <label className="user-list-role-filter">
                        Status
                        <select className="casino-select" value={filters.status} onChange={handleStatusChange}>
                            <option value="all">All</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                        </select>
                    </label>
                    {/* Keep the actions together when the toolbar wraps below the filters. */}
                    <div className="game-list-actions flex grow flex-wrap gap-2">
                        <button className="user-list-create" type="submit">Apply filters</button>
                        <button className="user-list-create game-list-clear" type="button" onClick={handleClear}>Clear filters</button>
                        <button className="user-list-create game-list-create" type="button" onClick={props.onCreateGame}>Create Game</button>
                    </div>
                </form>
                {filterError && <p className="user-list-feedback mb-2">{filterError}</p>}
                {feedback && <div className="user-list-feedback mb-2">{feedback}</div>}

                {/* Keep the table's horizontal scroll inside the ticket. */}
                <div className="user-list-scroll overflow-x-auto">
                    <table className="user-list-table w-full">
                        <thead>
                            <tr>
                                <th scope="col">Game</th>
                                <th scope="col">Buy-in</th>
                                <th scope="col">Cashout</th>
                                <th scope="col">Cash paid</th>
                                <th scope="col">Tips</th>
                                <th scope="col">Game cost</th>
                                <th scope="col">Income</th>
                                <th scope="col">View game</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buildGameRows(page?.data ?? [], props.onOpenGame)}
                        </tbody>
                    </table>
                </div>

                <div className="casino-pagination flex flex-wrap items-center">
                    <span>{pageMessage}</span>
                    <span className="casino-pagination-rule" />
                    <button type="button" onClick={handlePrevious} disabled={!canPaginate || page.meta.current_page <= 1}>‹ Previous</button>
                    <button type="button" onClick={handleNext} disabled={!canPaginate || page.meta.current_page >= page.meta.last_page}>Next ›</button>
                </div>
            </CasinoTicket>
            {/* Give the table the full width on smaller screens. */}
            <div className="hidden min-w-0 self-center lg:col-span-2 lg:block">
                <img
                    src={missingIncomeArtwork}
                    alt="A detective studies the missing income in a ledger beside a worried turquoise poker chip."
                    className="block h-auto w-full drop-shadow-xl"
                />
            </div>
        </section>
    );
}

export default GameList;
