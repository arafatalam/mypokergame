import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import CasinoCalendar from '../../../components/casino-calendar';
import { loadGames } from '../../games/game-list/load-games';
import type { GameFilters, DatedGameListItem, GameListRequest } from '../../games/game-list/load-games';
import { formatAmount, formatDate } from './correction-display';
import CorrectionTable from './correction-table';
import { useCorrectionList } from './use-correction-list';

const defaultFilters: GameFilters = { fromDate: '', toDate: '', status: 'all' };
const defaultQuery: GameListRequest = { ...defaultFilters, page: 1 };
const columns = ['Game', 'Game date', 'Status', 'Dealer tips', 'Game costs', 'Actions'];

type GameTotalsTableProps = {
    onCorrect: (game: DatedGameListItem) => void;
};

export default function GameTotalsTable(props: GameTotalsTableProps) {
    const [filters, setFilters] = useState(defaultFilters);
    const [error, setError] = useState('');
    const list = useCorrectionList(defaultQuery, loadGames);

    function handleFromDate(date: string) {
        setFilters({ ...filters, fromDate: date });
    }

    function handleToDate(date: string) {
        setFilters({ ...filters, toDate: date });
    }

    function handleStatus(event: ChangeEvent<HTMLSelectElement>) {
        const status = event.currentTarget.value;
        if (status === 'all' || status === 'open' || status === 'closed') {
            setFilters({ ...filters, status });
        }
    }

    function handleApply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
            setError('To date must be on or after From date.');
            return;
        }

        setError('');
        list.setQuery({ ...filters, page: 1 });
    }

    function handleClear() {
        setFilters(defaultFilters);
        setError('');
        list.setQuery({ ...defaultQuery });
    }

    const rows = [];
    for (const game of list.result?.data ?? []) {
        function handleCorrect() {
            props.onCorrect(game);
        }

        let status = 'Closed';
        if (game.status === 'open') {
            status = 'Open';
        }
        rows.push(
            <tr key={game.id}>
                <td>{game.name}</td>
                <td><time dateTime={game.gameDate}>{formatDate(game.gameDate)}</time></td>
                <td>{status}</td>
                <td>{formatAmount(game.dealerTips)}</td>
                <td>{formatAmount(game.gameCosts)}</td>
                <td><button className="user-list-action" type="button" onClick={handleCorrect}
                    disabled={list.loading || list.failed}>Correct</button></td>
            </tr>,
        );
    }

    let emptyMessage = 'No games yet.';
    if (list.result?.has_games) {
        emptyMessage = 'No games match these filters.';
    }

    const toolbar = (
        <>
            <form className="user-list-filters flex flex-wrap items-end" onSubmit={handleApply}>
                <div className="user-list-role-filter">
                    <span>From date</span>
                    <CasinoCalendar label="From date" value={filters.fromDate} onChange={handleFromDate} clearable />
                </div>
                <div className="user-list-role-filter">
                    <span>To date</span>
                    <CasinoCalendar label="To date" value={filters.toDate} onChange={handleToDate} clearable />
                </div>
                <label className="user-list-role-filter">
                    Status
                    <select className="casino-select" value={filters.status} onChange={handleStatus}>
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </label>
                <button className="user-list-create" type="submit">Apply filters</button>
                <button className="user-list-create" type="button" onClick={handleClear}>Clear filters</button>
            </form>
            {error && <p className="user-list-feedback mb-2">{error}</p>}
        </>
    );

    return <CorrectionTable title="Game Totals" recordLabel="games" filters={toolbar} columns={columns} rows={rows}
        loading={list.loading} failed={list.failed} emptyMessage={emptyMessage} meta={list.result?.meta}
        onPage={list.goToPage} onRetry={list.retry} />;
}
