import { useEffect, useState } from 'react';
import type { UserListItem } from '../../users/user-list/load-users';
import type { ChangeEvent } from 'react';
import waiterCoin from '../../../assets/casino/payment-list-waiter-coin.webp';
import chipKingBank from '../../../assets/casino/payment-list-chip-king-bank.webp';
import CasinoTicket from '../../../components/casino-ticket';
import '../../../components/pagination.css';
import '../../users/user-list/user-list.css';
import { loadPayments } from './load-payments';
import type { PaymentListQuery, PaymentListResponse } from './load-payments';

import { amountFormat, dateFormat, directionLabels } from './payment-display';

type PaymentListProps = {
    initialPlayer?: UserListItem;
    onRecordPayment: () => void;
};

export default function PaymentList(props: PaymentListProps) {
    const [query, setQuery] = useState<PaymentListQuery>(function initialQuery() {
        const player = props.initialPlayer;
        let search = '';
        if (player) {
            search = player.first_name + ' ' + player.last_name;
        }

        return { search, playerId: player?.id, direction: '', page: 1 };
    });
    const [result, setResult] = useState<PaymentListResponse | null>(null);
    const [successfulQuery, setSuccessfulQuery] = useState<PaymentListQuery | null>(null);
    const [settledQuery, setSettledQuery] = useState<PaymentListQuery | null>(null);

    useEffect(function fetchPaymentPage() {
        const request = new AbortController();

        async function fetchPayments() {
            try {
                const response = await loadPayments(query, request.signal);
                if (request.signal.aborted) {
                    return;
                }

                setResult(response);
                setSuccessfulQuery(query);
            } catch {
                // Keep the last successful rows visible when loading fails.
            } finally {
                // Only the latest request can unlock the pagination controls.
                if (!request.signal.aborted) {
                    setSettledQuery(query);
                }
            }
        }

        void fetchPayments();
        return function cancelPaymentPage() {
            request.abort();
        };
    }, [query]);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        // Editing the prefilled name returns to the ordinary name search.
        setQuery({ ...query, search: event.currentTarget.value, playerId: undefined, page: 1 });
    }

    function handleDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
        setQuery({ ...query, direction: event.currentTarget.value, page: 1 });
    }

    const page = result?.meta.current_page ?? 1;
    const lastPage = result?.meta.last_page ?? 1;
    const isLoading = query !== settledQuery;
    const failed = !isLoading && query !== successfulQuery;
    const canPage = !isLoading && successfulQuery?.search === query.search && successfulQuery?.direction === query.direction
        && successfulQuery?.playerId === query.playerId;

    function handlePrevious() {
        setQuery({ ...query, page: page - 1 });
    }

    function handleNext() {
        // A fresh query also retries a failed request for the same page number.
        setQuery({ ...query, page: page + 1 });
    }

    function handleRetry() {
        setQuery({ ...query });
    }

    let message = 'Loading payments…';
    if (failed) {
        message = 'Could not load payments.';
    } else if (!isLoading && result !== null) {
        const pagination = result.meta;
        message = 'No payments found.';
        if (pagination.from !== null && pagination.to !== null) {
            message = pagination.from + '–' + pagination.to + ' of ' + pagination.total;
        }
    }

    const rows = [];
    for (const payment of result?.data ?? []) {
        // Interpret the room's saved calendar date consistently in every browser timezone.
        const date = dateFormat.format(new Date(payment.paidAt + 'T00:00:00Z'));
        rows.push(
            <tr key={payment.id}>
                <td><time dateTime={payment.paidAt}>{date}</time></td>
                <td>{payment.player}</td>
                <td>{directionLabels[payment.direction]}</td>
                <td>{amountFormat.format(payment.amount)}</td>
                <td>{payment.note || '—'}</td>
            </tr>,
        );
    }

    return (
        <div className="w-full min-w-0 min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,920px)_minmax(0,1fr)]">
            {/* The ticket sets the row height so the side art can follow it. */}
            <div className="relative hidden min-[1200px]:block">
                <img src={waiterCoin} alt="" className="absolute right-0 bottom-0 h-[90%] w-full max-w-[324px] object-fill" />
            </div>
            <section className="user-list-layout user-list-screen mx-auto w-full min-w-0 max-w-[920px]!">
                <CasinoTicket compactEdges className="user-list-ticket min-w-0">
                    <div className="user-list-filters flex flex-wrap items-end">
                        <label className="user-list-search">
                            Search Player
                            <span className="user-list-search-field relative block">
                                <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
                                <input type="search" maxLength={100} value={query.search} onChange={handleSearchChange} />
                            </span>
                        </label>
                        <label className="user-list-role-filter min-w-40">
                            Direction
                            <select className="casino-select" value={query.direction} onChange={handleDirectionChange}>
                                <option value="">All directions</option>
                                <option value="player_pays_house">Player paid house</option>
                                <option value="house_pays_player">House paid player</option>
                            </select>
                        </label>
                        <button className="user-list-create" type="button" onClick={props.onRecordPayment}>
                            Record Payment
                        </button>
                    </div>

                    {/* Keep wide columns scrollable inside the ticket on narrow screens. */}
                    <div className="user-list-scroll overflow-x-auto" tabIndex={0}>
                        <table className="user-list-table w-full">
                            <thead>
                                <tr>
                                    <th scope="col">Payment date</th>
                                    <th scope="col">Player</th>
                                    <th scope="col">Direction</th>
                                    <th scope="col">Amount</th>
                                    <th scope="col">Note</th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </table>
                    </div>

                    <div className="casino-pagination flex flex-wrap items-center">
                        <span>{message}</span>
                        {failed && !canPage && <button type="button" onClick={handleRetry}>Retry</button>}
                        <span className="casino-pagination-rule" />
                        <button type="button" onClick={handlePrevious} disabled={!canPage || page <= 1}>‹ Previous</button>
                        <button type="button" onClick={handleNext} disabled={!canPage || page >= lastPage}>Next ›</button>
                    </div>
                </CasinoTicket>
            </section>
            <div className="relative hidden min-[1200px]:block">
                {/* Leave a gutter between the piggy bank and the ticket as the side column narrows. */}
                <img src={chipKingBank} alt="" className="absolute bottom-0 left-7 h-[90%] w-[calc(100%-1.75rem)] max-w-[324px] object-fill" />
            </div>
        </div>
    );
}
