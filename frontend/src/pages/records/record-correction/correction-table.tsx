import type { ReactNode } from 'react';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/pagination.css';
import '../../users/user-list/user-list.css';

type CorrectionTableProps = {
    title?: string;
    filters: ReactNode;
    columns: string[];
    rows: ReactNode[];
    loading: boolean;
    failed: boolean;
    emptyMessage: string;
    recordLabel: string;
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    onPage: (page: number) => void;
    onRetry: () => void;
};

export default function CorrectionTable(props: CorrectionTableProps) {
    const page = props.meta?.current_page ?? 1;
    const lastPage = props.meta?.last_page ?? 1;
    const canPage = !props.loading && !props.failed && props.rows.length > 0;

    let message = props.emptyMessage;
    if (props.loading) {
        message = 'Loading ' + props.recordLabel + '…';
    } else if (props.failed) {
        message = 'Could not load ' + props.recordLabel + '.';
    } else if (props.meta?.from != null && props.meta.to != null) {
        message = props.meta.from + '–' + props.meta.to + ' of ' + props.meta.total;
    }

    const headings = [];
    for (const column of props.columns) {
        headings.push(<th key={column} scope="col">{column}</th>);
    }

    function handlePrevious() {
        props.onPage(page - 1);
    }

    function handleNext() {
        props.onPage(page + 1);
    }

    return (
        <section className="min-w-0">
            <CasinoTicket compactEdges className="user-list-ticket min-w-0">
                {props.title && <h2 className="correction-table-heading casino-heading mb-3 px-3 py-2 text-center text-2xl">{props.title}</h2>}
                {props.filters}
                {/* Contain horizontal scrolling within this table. */}
                <div className="user-list-scroll overflow-x-auto">
                    <table className="user-list-table w-full">
                        <thead><tr>{headings}</tr></thead>
                        <tbody>{props.rows}</tbody>
                    </table>
                </div>
                <div className="casino-pagination flex flex-wrap items-center">
                    <span>{message}</span>
                    {props.failed && <button type="button" onClick={props.onRetry}>Retry</button>}
                    <span className="casino-pagination-rule" />
                    <button type="button" onClick={handlePrevious} disabled={!canPage || page <= 1}>‹ Previous</button>
                    <button type="button" onClick={handleNext} disabled={!canPage || page >= lastPage}>Next ›</button>
                </div>
            </CasinoTicket>
        </section>
    );
}
