import { useEffect, useState } from 'react';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import '../../../components/player-tab.css';
import { loadGameHistory, type GameHistoryResponse } from './load-game-history';
import { amountFormat, dateFormat } from '../../players/payment-list/payment-display';

type UserGameHistoryProps = {
    playerId: number;
};

export default function UserGameHistory(props: UserGameHistoryProps) {
    // Temporary local layout preview with all ten rows visible at once.
    const isSamplePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('history-preview');
    const playerId = props.playerId;
    const [requestPage, setRequestPage] = useState({ page: 1 });
    const [result, setResult] = useState<GameHistoryResponse | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

    useEffect(function fetchGameHistory() {
        if (isSamplePreview) {
            return;
        }

        const request = new AbortController();

        async function fetchPage() {
            try {
                const response = await loadGameHistory(playerId, requestPage.page, request.signal);

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
        return function cancelGameHistory() {
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
        message = 'Loading games…';
    } else if (status === 'failed') {
        message = 'Could not load games.';
    } else if (result?.data.length === 0) {
        message = 'No completed games';
    }

    const history: GameHistoryResponse["data"] = isSamplePreview ? Array.from({ length: 10 }, function sampleRow(_, index) {
        return {
            id: index + 1,
            name: (12 - index).toString().padStart(2, '0') + '_NOV_2026_1',
            gameDate: '2026-11-' + (12 - index).toString().padStart(2, '0'),
            netResult: (5 - index) * 40,
        };
    }) : result?.data ?? [];

    const rows = [];
    for (const game of history) {
        // Keep the API's room calendar date in every browser timezone.
        const date = dateFormat.format(new Date(game.gameDate + 'T00:00:00Z'));
        let netResult = amountFormat.format(game.netResult);
        if (game.netResult > 0) {
            netResult = '+' + netResult;
        }
        rows.push(
            <tr key={game.id}>
                <td>{game.name}</td>
                <td><time dateTime={game.gameDate}>{date}</time></td>
                <td>{netResult}</td>
            </tr>,
        );
    }

    return (
        <TurquoisePaperTicket className="player-tab user-game-history min-w-0">
            <section className="flex flex-col gap-4">
                <h3>Game History</h3>
                <table className="w-full table-fixed">
                    <thead>
                        <tr>
                            <th scope="col">Game Name</th>
                            <th scope="col">Date</th>
                            <th scope="col">Win/Loss</th>
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
