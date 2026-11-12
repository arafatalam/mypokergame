import { useState } from 'react';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import type { ChangeEvent } from 'react';
import { formatAmount, formatDate } from '../record-correction/correction-display';
import CorrectionTable from '../record-correction/correction-table';
import { useCorrectionList } from '../record-correction/use-correction-list';
import { loadCorrectionHistory } from './load-correction-history';
import type { CorrectionEntry, CorrectionType, HistoryQuery, HistoryValue } from './load-correction-history';
import './correction-history.css';

const initialQuery: HistoryQuery = { type: '', page: 1 };
const columns = ['Type', 'Affected record', 'Date and time'];
const typeLabels: Record<CorrectionType, string> = {
    game_totals: 'Game totals',
    cashout: 'Cashout',
    payment: 'Payment',
};
const fieldLabels: Record<string, string> = {
    dealerTips: 'Dealer tips',
    gameCosts: 'Game costs',
    endingChips: 'Ending chips',
    cashPaid: 'Cash paid',
    linkedPaymentAmount: 'Payment to player',
    amount: 'Amount',
    paidAt: 'Payment date',
    note: 'Note',
};
const monctonTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Moncton',
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatValue(field: string, value: HistoryValue) {
    if (field === 'note' && (value === null || value === '')) {
        return 'No note';
    }
    if (field === 'linkedPaymentAmount' && value === null) {
        return 'No payment';
    }
    if (typeof value === 'number') {
        return formatAmount(value);
    }
    if (field === 'paidAt' && value !== null) {
        return formatDate(value);
    }

    return value ?? '—';
}

export default function CorrectionHistory() {
    const list = useCorrectionList(initialQuery, loadCorrectionHistory);

    const [selected, setSelected] = useState<CorrectionEntry | null>(null);

    function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelected(null);
        list.replaceFilters({ type: event.currentTarget.value, page: 1 });
    }

    function handlePage(page: number) {
        setSelected(null);
        list.goToPage(page);
    }

    function handleCloseDetails() {
        setSelected(null);
    }

    const rows = [];
    for (const entry of list.result?.data ?? []) {
        function handleSelect() {
            setSelected(entry);
        }

        rows.push(
            <tr key={entry.id} onClick={handleSelect} className="cursor-pointer"
                data-selected={selected?.id === entry.id}>
                <td>{typeLabels[entry.type]}</td>
                <td><button type="button" className="user-list-action text-left" onClick={function handleSelectRecord(event) { event.stopPropagation(); handleSelect(); }}>{entry.affectedRecord}</button></td>
                <td><time dateTime={entry.correctedAt}>{monctonTime.format(new Date(entry.correctedAt))}</time></td>
            </tr>,
        );
    }

    const changes = [];
    if (selected) {
        for (const [field, label] of Object.entries(fieldLabels)) {
            const change = selected.changes[field];
            if (change !== undefined) {
                changes.push(
                    <div key={field} className="grid grid-cols-3 gap-x-3">
                        <dt className="font-bold">{label}</dt>
                        <dd className="whitespace-pre-wrap">{formatValue(field, change.before)}</dd>
                        <dd className="whitespace-pre-wrap">{formatValue(field, change.after)}</dd>
                    </div>,
                );
            }
        }
    }

    let emptyMessage = 'No corrections found';
    if (list.query.type !== '') {
        emptyMessage = 'No ' + typeLabels[list.query.type as CorrectionType].toLowerCase() + ' corrections found';
    }

    const filters = (
        <div className="user-list-filters">
            <label className="user-list-role-filter">
                Type
                <select className="casino-select" value={list.query.type} onChange={handleTypeChange}>
                    <option value="">All types</option>
                    <option value="game_totals">Game totals</option>
                    <option value="cashout">Cashout</option>
                    <option value="payment">Payment</option>
                </select>
            </label>
        </div>
    );

    return (
        <div className="correction-history user-list-layout user-list-screen grid w-full min-w-0 items-start gap-4">
            <CorrectionTable columns={columns} filters={filters} rows={rows}
                loading={list.loading} failed={list.failed} emptyMessage={emptyMessage} recordLabel="corrections"
                meta={list.result?.meta} onPage={handlePage} onRetry={list.retry} />
            {selected && (
                <TurquoisePaperTicket>
                    <div className="grid min-w-0 gap-3 p-[12px] [overflow-wrap:anywhere]">
                        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-start gap-2">
                            <h2 className="casino-heading col-start-2 text-center text-2xl">{typeLabels[selected.type]} correction</h2>
                            <button type="button" className="justify-self-end rounded bg-[#fff0cf] px-2 py-1 font-bold text-[#075152] hover:bg-white" onClick={handleCloseDetails}>Close</button>
                        </div>
                        <p className="font-bold">{selected.affectedRecord}</p>
                        <p>{selected.staff} · <time dateTime={selected.correctedAt}>{monctonTime.format(new Date(selected.correctedAt))}</time></p>
                        <div className="grid grid-cols-3 gap-x-3 font-bold">
                            <span className="col-start-2">Before</span>
                            <span>After</span>
                        </div>
                        <dl className="grid gap-3">
                            {changes}
                            <div className="grid grid-cols-3 gap-x-3">
                                <dt className="font-bold">Reason</dt>
                                <dd className="col-span-2 whitespace-pre-wrap">{selected.reason}</dd>
                            </div>
                        </dl>
                    </div>
                </TurquoisePaperTicket>
            )}
        </div>
    );
}
