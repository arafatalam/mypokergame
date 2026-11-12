import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import CasinoMonthPicker from '../../../components/casino-month-picker';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/pagination.css';
import '../../users/user-list/user-list.css';
import '../leaderboard/leaderboard.css';
import { formatGameMoney } from '../close-game/format-game-money';
import { loadHouseIncome } from './load-house-income';
import type { MonthFilters } from '../leaderboard/load-leaderboard';
import type { HouseIncomePage, HouseIncomeRequest, MonthlyIncome } from './load-house-income';

const emptyFilters: MonthFilters = { fromMonth: '', toMonth: '' };
const monthName = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' });

type Result = { request: HouseIncomeRequest; page: HouseIncomePage | null; failed: boolean };

function formatMonth(month: string) {
    return monthName.format(new Date(month + '-01T00:00:00Z'));
}

function emptyMessage(request: HouseIncomeRequest, currentMonth: string) {
    if (!request.fromMonth && !request.toMonth) {
        return 'No closed games yet';
    }
    if (request.fromMonth && request.fromMonth === (request.toMonth || currentMonth)) {
        return 'No closed games in ' + formatMonth(request.fromMonth);
    }

    return 'No closed games in the selected period';
}

type HouseIncomeProps = {
    onOpenMonth: (month: string) => void;
};

export default function HouseIncome(props: HouseIncomeProps) {
    const [filters, setFilters] = useState(emptyFilters);
    const [request, setRequest] = useState<HouseIncomeRequest>({ ...emptyFilters, page: 1 });
    const [result, setResult] = useState<Result | null>(null);
    const [currentMonth] = useState(function getCurrentMonth() {
        const today = new Date();
        return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    });

    useEffect(function fetchIncome() {
        const controller = new AbortController();

        async function fetchPage() {
            try {
                const page = await loadHouseIncome(request, controller.signal);
                if (!controller.signal.aborted) {
                    setResult({ request, page, failed: false });
                }
            } catch {
                if (!controller.signal.aborted) {
                    // Keep the previous monthly totals available until a request succeeds.
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

    function renderMonth(month: MonthlyIncome) {
        function handleOpenMonth(event: MouseEvent<HTMLElement>) {
            // A click on the month button should open the list only once.
            event.stopPropagation();
            props.onOpenMonth(month.month);
        }

        return (
            <tr key={month.month} className="cursor-pointer" onClick={handleOpenMonth}>
                <td><button type="button" className="cursor-pointer underline" onClick={handleOpenMonth}>{formatMonth(month.month)}</button></td>
                <td className="tabular-nums">{month.closedGames}</td>
                <td className="tabular-nums">{formatGameMoney(month.income)}</td>
            </tr>
        );
    }

    let feedback = null;
    if (loading) {
        feedback = <p>Loading house income…</p>;
    } else if (failed) {
        feedback = <p>Couldn’t load house income. <button className="underline" type="button" onClick={handleRetry}>Retry</button></p>;
    } else if (page?.data.length === 0) {
        feedback = <p>{emptyMessage(request, currentMonth)}</p>;
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
                        <tr><th scope="col">Month</th><th scope="col">Games</th><th scope="col">Income</th></tr>
                    </thead>
                    <tbody>{page?.data.map(renderMonth)}</tbody>
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
