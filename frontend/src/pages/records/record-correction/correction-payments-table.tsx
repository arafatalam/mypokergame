import type { ChangeEvent } from 'react';
import { loadPayments } from '../../players/payment-list/load-payments';
import type { PaymentListItem, PaymentListQuery } from '../../players/payment-list/load-payments';
import { directionLabels, formatAmount, formatDate } from './correction-display';
import CorrectionTable from './correction-table';
import { useCorrectionList } from './use-correction-list';

const defaultQuery: PaymentListQuery = { search: '', direction: '', page: 1 };
const columns = ['Payment date', 'Player', 'Direction', 'Amount', 'Note', 'Actions'];

type CorrectionPaymentsTableProps = {
    onCorrect: (payment: PaymentListItem) => void;
};

export default function CorrectionPaymentsTable(props: CorrectionPaymentsTableProps) {
    const list = useCorrectionList(defaultQuery, loadPayments);

    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        list.setQuery({ ...list.query, search: event.currentTarget.value, page: 1 });
    }

    function handleDirection(event: ChangeEvent<HTMLSelectElement>) {
        list.setQuery({ ...list.query, direction: event.currentTarget.value, page: 1 });
    }

    const rows = [];
    for (const payment of list.result?.data ?? []) {
        function handleCorrect() {
            props.onCorrect(payment);
        }

        rows.push(
            <tr key={payment.id}>
                <td><time dateTime={payment.paidAt}>{formatDate(payment.paidAt)}</time></td>
                <td>{payment.player}</td>
                <td>{directionLabels[payment.direction]}</td>
                <td>{formatAmount(payment.amount)}</td>
                <td className="max-w-52 break-words">{payment.note ?? '—'}</td>
                <td><button className="user-list-action" type="button" onClick={handleCorrect}
                    disabled={list.loading || list.failed}>Correct</button></td>
            </tr>,
        );
    }

    const toolbar = (
        <div className="user-list-filters flex flex-wrap items-end">
            <label className="user-list-search">
                Search Player
                <span className="user-list-search-field relative block">
                    <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
                    <input type="search" maxLength={100} value={list.query.search} onChange={handleSearch} />
                </span>
            </label>
            <label className="user-list-role-filter min-w-40">
                Direction
                <select className="casino-select" value={list.query.direction} onChange={handleDirection}>
                    <option value="">All directions</option>
                    <option value="player_pays_house">Player paid house</option>
                    <option value="house_pays_player">House paid player</option>
                </select>
            </label>
        </div>
    );

    return <CorrectionTable title="Payments" recordLabel="payments" filters={toolbar} columns={columns} rows={rows}
        loading={list.loading} failed={list.failed} emptyMessage="No payments found." meta={list.result?.meta}
        onPage={list.goToPage} onRetry={list.retry} />;
}
