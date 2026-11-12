import { useEffect, useState } from 'react';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import '../../../components/player-tab.css';
import { loadPayments } from '../../players/payment-list/load-payments';
import type { PaymentListResponse } from '../../players/payment-list/load-payments';
import { amountFormat, dateFormat, directionLabels } from '../../players/payment-list/payment-display';

type UserPaymentHistoryProps = {
    playerId: number;
};

export default function UserPaymentHistory(props: UserPaymentHistoryProps) {
    // Temporary local layout preview with all ten rows visible at once.
    const isSamplePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('history-preview');
    const playerId = props.playerId;
    const [requestPage, setRequestPage] = useState({ page: 1 });
    const [result, setResult] = useState<PaymentListResponse | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

    useEffect(function fetchPaymentHistory() {
        if (isSamplePreview) {
            return;
        }

        const request = new AbortController();

        async function fetchPage() {
            try {
                const response = await loadPayments({
                    playerId,
                    search: '',
                    direction: '',
                    page: requestPage.page,
                    perPage: 10,
                }, request.signal);

                if (!request.signal.aborted) {
                    setResult(response);
                    setStatus('ready');
                }
            } catch {
                // Leave the last successful page visible while the viewer retries.
                if (!request.signal.aborted) {
                    setStatus('failed');
                }
            }
        }

        void fetchPage();
        return function cancelPaymentHistory() {
            request.abort();
        };
    }, [isSamplePreview, playerId, requestPage]);

    function loadPage(page: number) {
        setStatus('loading');
        setRequestPage({ page });
    }

    const page = result?.meta.current_page ?? 1;
    const lastPage = result?.meta.last_page ?? 1;

    function handlePrevious() {
        loadPage(page - 1);
    }

    function handleNext() {
        loadPage(page + 1);
    }

    function handleRetry() {
        loadPage(requestPage.page);
    }

    let message = '';
    if (status === 'loading') {
        message = 'Loading payments…';
    } else if (status === 'failed') {
        message = 'Could not load payments.';
    } else if (result?.data.length === 0) {
        message = 'No payments found';
    }

    const history: PaymentListResponse["data"] = isSamplePreview ? Array.from({ length: 10 }, function sampleRow(_, index) {
        return {
            id: index + 1,
            paidAt: '2026-11-' + (12 - index).toString().padStart(2, '0'),
            player: 'Sample Player',
            direction: index % 2 === 0 ? 'player_pays_house' : 'house_pays_player',
            amount: (index + 1) * 25,
            note: null,
        };
    }) : result?.data ?? [];

    const rows = [];
    for (const payment of history) {
        // Keep the API's room calendar date in every browser timezone.
        const date = dateFormat.format(new Date(payment.paidAt + 'T00:00:00Z'));
        rows.push(
            <tr key={payment.id}>
                <td><time dateTime={payment.paidAt}>{date}</time></td>
                <td>{directionLabels[payment.direction]}</td>
                <td>{amountFormat.format(payment.amount)}</td>
            </tr>,
        );
    }

    return (
        <TurquoisePaperTicket className="player-tab user-payment-history min-w-0">
            <section className="flex flex-col gap-4">
                <h3>Payment History</h3>
                <table className="w-full table-fixed">
                    <thead>
                        <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Direction</th>
                            <th scope="col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
                {!isSamplePreview && message && <p>{message}</p>}
                <div className="flex flex-wrap justify-center gap-2">
                    {status === 'failed' && <button type="button" className="player-tab-payment" onClick={handleRetry}>Retry</button>}
                    <button type="button" className="player-tab-payment" onClick={handlePrevious} disabled={status !== 'ready' || page <= 1}>Previous</button>
                    <button type="button" className="player-tab-payment" onClick={handleNext} disabled={status !== 'ready' || page >= lastPage}>Next</button>
                </div>
            </section>
        </TurquoisePaperTicket>
    );
}
