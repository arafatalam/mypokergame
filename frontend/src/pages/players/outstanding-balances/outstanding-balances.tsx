import { useEffect, useState, type ChangeEvent } from 'react';
import accountantArtwork from '../../../assets/casino/balance-accountant.webp';
import kingArtwork from '../../../assets/casino/balance-king.webp';
import CasinoTicket from '../../../components/casino-ticket';
import Pagination from '../../../components/pagination';
import { formatGameMoney } from '../../games/close-game/format-game-money';
import '../../users/user-list/user-list.css';
import type { PaymentDirection } from '../record-payment/record-payment-api';
import { loadOutstandingBalances } from './load-outstanding-balances';
import type { OutstandingBalancesPage, OutstandingBalancesQuery } from './load-outstanding-balances';

type BalanceResult = {
    query: OutstandingBalancesQuery;
    page: OutstandingBalancesPage | null;
};

type OutstandingBalancesProps = {
    onMakePayment: (playerId: number, direction: PaymentDirection) => void;
    showingPayment: boolean;
};

export default function OutstandingBalances(props: OutstandingBalancesProps) {
    const [query, setQuery] = useState<OutstandingBalancesQuery>({ search: '', direction: 'all', page: 1 });
    const [result, setResult] = useState<BalanceResult | null>(null);

    useEffect(function fetchBalances() {
        if (props.showingPayment) {
            return;
        }
        const controller = new AbortController();

        async function fetchPage() {
            try {
                const page = await loadOutstandingBalances(query, controller.signal);
                if (!controller.signal.aborted) {
                    setResult({ query, page });
                }
            } catch {
                if (!controller.signal.aborted) {
                    setResult({ query, page: null });
                }
            }
        }

        void fetchPage();
        // A slower response must never replace results for a newer filter.
        return function cancelRequest() {
            controller.abort();
        };
    }, [query, props.showingPayment]);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setQuery({ ...query, search: event.currentTarget.value, page: 1 });
    }

    function handleDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
        const direction = event.currentTarget.value;
        if (direction === 'all' || direction === 'collect' || direction === 'pay') {
            setQuery({ ...query, direction, page: 1 });
        }
    }

    function handlePrevious() {
        if (page !== null) {
            setQuery({ ...query, page: page.meta.current_page - 1 });
        }
    }

    function handleNext() {
        if (page !== null) {
            setQuery({ ...query, page: page.meta.current_page + 1 });
        }
    }

    function handleRetry() {
        setQuery({ ...query });
    }

    const loading = result?.query !== query;
    const page = loading ? null : result.page;
    const failed = !loading && page === null;
    let message = '';
    if (loading) {
        message = 'Loading balances…';
    } else if (failed) {
        message = 'Couldn’t load balances.';
    } else if (page?.data.length === 0) {
        message = 'No outstanding balances found.';
    } else if (page?.meta.from != null && page.meta.to != null) {
        message = page.meta.from + '–' + page.meta.to + ' of ' + page.meta.total;
    }

    const rows = [];
    for (const player of page?.data ?? []) {
        let amount = formatGameMoney(player.balance);
        if (player.balance > 0) {
            amount = '+' + amount;
        }

        function handleMakePayment() {
            // In All, each row still opens the direction that settles its own balance.
            const direction = player.balance < 0 ? 'player_pays_house' : 'house_pays_player';
            setResult(null);
            props.onMakePayment(player.id, direction);
        }

        rows.push(
            <tr key={player.id} className="border-b border-[#620b19]/20 last:border-b-0">
                <td className="wrap-break-word px-2 py-1.5">{player.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{amount}</td>
                <td className="px-1 py-1.5 text-right">
                    <button type="button" className="casino-button px-2 py-1 text-sm" onClick={handleMakePayment}>Make a payment</button>
                </td>
            </tr>
        );
    }

    return (
        <div className="mx-auto grid w-full min-w-0 max-w-[1536px] gap-3 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,600px)_minmax(0,1fr)]">
            {/* Let the ticket set the row height so the artwork follows its bottom edge. */}
            <div className="relative hidden min-[1100px]:block">
                <img src={accountantArtwork} alt="" className="absolute inset-0 h-full w-full object-contain object-right-bottom" />
            </div>
            <section className="user-list-layout user-list-screen mx-auto w-full min-w-0 max-w-[600px]!">
                <CasinoTicket compactEdges className="grid gap-3 px-4 py-5 sm:px-8">
                    <div className="user-list-filters mb-0! grid grid-cols-2 items-end sm:grid-cols-[2fr_1fr]">
                        <label className="user-list-search w-auto! min-w-0">
                            Search Player
                            <span className="user-list-search-field relative block">
                                <svg viewBox="0 0 24 24" className="max-[650px]:left-2.5! max-[650px]:size-[21px]!"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
                                <input type="search" className="max-[650px]:min-h-11! max-[650px]:pl-[38px]! max-[650px]:text-base!" value={query.search} maxLength={100} onChange={handleSearchChange} />
                            </span>
                        </label>
                        <label className="user-list-role-filter w-auto! min-w-0">
                            Direction
                            <select className="casino-select max-[650px]:min-h-11! max-[650px]:text-base!" value={query.direction} onChange={handleDirectionChange}>
                                <option value="all">All</option>
                                <option value="collect">To collect</option>
                                <option value="pay">To pay</option>
                            </select>
                        </label>
                    </div>
                    <table className="w-full table-fixed text-base">
                        <thead className="border-b border-current">
                            <tr>
                                <th scope="col" className="px-2 py-1 text-left">Player</th>
                                <th scope="col" className="w-20 px-2 py-1 text-right sm:w-28">Balance</th>
                                <th scope="col" className="w-28 px-1 py-1 text-right sm:w-36">Action</th>
                            </tr>
                        </thead>
                        <tbody>{rows}</tbody>
                    </table>
                    {failed && <button type="button" className="casino-button justify-self-start px-3" onClick={handleRetry}>Retry</button>}
                    <Pagination
                        message={message}
                        previousDisabled={page === null || page.meta.current_page <= 1}
                        nextDisabled={page === null || page.meta.current_page >= page.meta.last_page}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                    />
                </CasinoTicket>
            </section>
            <div className="relative hidden min-[1100px]:block">
                <img src={kingArtwork} alt="" className="absolute inset-0 h-full w-full object-contain object-left-bottom" />
            </div>
        </div>
    );
}
