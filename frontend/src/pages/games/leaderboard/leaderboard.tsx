import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import CasinoMonthPicker from '../../../components/casino-month-picker';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/pagination.css';
import '../../users/user-list/user-list.css';
import './leaderboard.css';
import { loadLeaderboard } from './load-leaderboard';
import type { LeaderboardPage, LeaderboardRequest, MonthFilters, Ranking } from './load-leaderboard';

const emptyFilters: MonthFilters = { fromMonth: '', toMonth: '' };
const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const monthName = new Intl.DateTimeFormat('en-CA', { month: 'long', timeZone: 'UTC' });

type LeaderboardProps = { onOpenPlayer: (playerId: number) => void };
type Result = { request: LeaderboardRequest; page: LeaderboardPage | null; failed: boolean };

function emptyMessage(request: LeaderboardRequest, page: LeaderboardPage, currentMonth: string) {
    if ((!request.fromMonth && !request.toMonth) || page.has_closed_games) {
        return 'No players have played in a closed game yet';
    }
    if (request.fromMonth && request.fromMonth === (request.toMonth || currentMonth)) {
        return 'No closed games in ' + monthName.format(new Date(request.fromMonth + '-01T00:00:00Z'));
    }

    return 'No closed games in the selected period';
}

export default function Leaderboard(props: LeaderboardProps) {
    const [filters, setFilters] = useState(emptyFilters);
    const [request, setRequest] = useState<LeaderboardRequest>({ ...emptyFilters, page: 1 });
    const [result, setResult] = useState<Result | null>(null);

    useEffect(function fetchRankings() {
        const controller = new AbortController();

        async function fetchPage() {
            try {
                const page = await loadLeaderboard(request, controller.signal);
                if (!controller.signal.aborted) {
                    setResult({ request, page, failed: false });
                }
            } catch {
                if (!controller.signal.aborted) {
                    // Keep the previous rankings available until a request succeeds.
                    setResult(function keepLastPage(previous) {
                        return { request, page: previous?.page ?? null, failed: true };
                    });
                }
            }
        }

        void fetchPage();
        return function cancelRequest() {
            controller.abort();
        };
    }, [request]);

    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const reversed = filters.fromMonth && filters.toMonth && filters.fromMonth > filters.toMonth;
    const future = filters.fromMonth > currentMonth || filters.toMonth > currentMonth;
    const page = result?.page ?? null;
    const loading = result?.request !== request;
    const failed = !loading && result.failed;
    const canPaginate = !loading && !failed && page !== null && page.meta.total > 0;

    function handleFromMonth(month: string) {
        setFilters({ ...filters, fromMonth: month });
    }

    function handleToMonth(month: string) {
        setFilters({ ...filters, toMonth: month });
    }

    function handleApply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reversed && !future) {
            setRequest({ ...filters, page: 1 });
        }
    }

    function handleClear() {
        setFilters(emptyFilters);
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
        setRequest({ ...request });
    }

    function renderRanking(player: Ranking) {
        function openPlayer() {
            props.onOpenPlayer(player.id);
        }

        return (
            <tr key={player.id}>
                <td><button className="user-list-action" type="button" onClick={openPlayer}>{player.firstName} {player.lastName}</button></td>
                <td className="tabular-nums">{money.format(player.winnings).replace('-', '−')}</td>
                <td className="tabular-nums">{player.rank}</td>
            </tr>
        );
    }

    let feedback = null;
    if (loading) {
        feedback = <p>Loading rankings…</p>;
    } else if (failed) {
        feedback = <p>Couldn’t load rankings. <button className="underline" type="button" onClick={handleRetry}>Retry</button></p>;
    } else if (page?.data.length === 0) {
        feedback = <p>{emptyMessage(request, page, currentMonth)}</p>;
    }

    let pageMessage = '';
    if (page?.meta.from != null && page.meta.to != null) {
        pageMessage = page.meta.from + '–' + page.meta.to + ' of ' + page.meta.total;
    }

    return (
        <section className="leaderboard user-list-layout user-list-screen w-full min-w-0 lg:col-span-3 lg:col-start-3">
            <CasinoTicket compactEdges className="user-list-ticket relative min-w-0">
                <form className="leaderboard-filters" onSubmit={handleApply}>
                    <div className="leaderboard-month">
                        <CasinoMonthPicker label="From month" value={filters.fromMonth} maxMonth={currentMonth} onChange={handleFromMonth} />
                    </div>
                    <div className="leaderboard-month">
                        <CasinoMonthPicker label="To month" value={filters.toMonth} maxMonth={currentMonth} onChange={handleToMonth} />
                    </div>
                    <button className="casino-button leaderboard-filter-button" type="submit" disabled={!!reversed || future}>Apply filters</button>
                    <button className="casino-button leaderboard-filter-button" type="button" onClick={handleClear}>Clear filters</button>
                </form>
                {reversed && <p className="user-list-feedback mb-2">To month must be the same as or later than From month</p>}
                {future && <p className="user-list-feedback mb-2">Choose the current month or an earlier month.</p>}
                {feedback && <div className="user-list-feedback mb-2">{feedback}</div>}
                <table className="user-list-table w-full">
                    <thead>
                        <tr><th scope="col">Player</th><th scope="col">Winnings</th><th scope="col">Rank</th></tr>
                    </thead>
                    <tbody>{page?.data.map(renderRanking)}</tbody>
                </table>
                <div className="casino-pagination flex flex-wrap items-center">
                    <span>{pageMessage}</span>
                    <span className="casino-pagination-rule" />
                    <button type="button" onClick={handlePrevious} disabled={!canPaginate || page.meta.current_page <= 1}>‹ Previous</button>
                    <button type="button" onClick={handleNext} disabled={!canPaginate || page.meta.current_page >= page.meta.last_page}>Next ›</button>
                </div>
            </CasinoTicket>
        </section>
    );
}
