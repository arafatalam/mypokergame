import { useState } from 'react';
import CasinoTicket from '../../components/casino-ticket';
import { formatGameMoney } from '../games/close-game/format-game-money';
import type { HomeSummary } from './load-home-summary';

type OutstandingBalancesTicketProps = {
    summary: HomeSummary | null;
    hasFailed: boolean;
    onRetry: () => void;
    onOpenAll?: () => void;
};

const visibleRowLimit = 5;

export default function OutstandingBalancesTicket(props: OutstandingBalancesTicketProps) {
    const [isShowingToPay, setIsShowingToPay] = useState(false);
    let balances = props.summary?.toCollect;
    let amountHeading = 'Player owes';
    let emptyMessage = 'No players owe the house';
    let collectClass = 'casino-button px-2';
    let payClass = 'rounded border border-current px-2';

    if (isShowingToPay) {
        balances = props.summary?.toPay;
        amountHeading = 'House owes';
        emptyMessage = 'The house owes no players';
        collectClass = 'rounded border border-current px-2';
        payClass = 'casino-button px-2';
    }

    function handleShowToCollect() {
        setIsShowingToPay(false);
    }

    function handleShowToPay() {
        setIsShowingToPay(true);
    }

    const players = balances?.players ?? [];
    const balanceRows = [];
    for (const player of players) {
        balanceRows.push(
            <tr key={player.id}>
                <td className="truncate" title={player.name}>{player.name}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatGameMoney(player.amount)}</td>
            </tr>
        );
    }

    if (props.hasFailed) {
        balanceRows.push(
            <tr key="status">
                <td colSpan={2}>
                    Couldn’t load balances{' '}
                    <button type="button" className="casino-button px-2" onClick={props.onRetry}>Retry</button>
                </td>
            </tr>
        );
    } else if (balances === undefined) {
        balanceRows.push(<tr key="status"><td colSpan={2}>Loading balances…</td></tr>);
    } else if (players.length === 0) {
        balanceRows.push(<tr key="status"><td colSpan={2}>{emptyMessage}</td></tr>);
    }

    // Keep five row slots in every request state, even when there are fewer players.
    for (let row = balanceRows.length; row < visibleRowLimit; row += 1) {
        balanceRows.push(
            <tr key={'spacer-' + row} className="invisible"><td colSpan={2}>&nbsp;</td></tr>
        );
    }

    let countLabelClass = 'invisible';
    if (balances !== undefined) {
        countLabelClass = '';
    }

    return (
        <CasinoTicket compactEdges className="w-full min-w-0 max-w-[440px] px-8 py-[22px] text-left text-[#620b19]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-bold lg:max-xl:text-base">Outstanding balances</h2>
                <div className="flex gap-2 text-sm font-bold">
                    <button type="button" className={collectClass} onClick={handleShowToCollect}>To collect</button>
                    <button type="button" className={payClass} onClick={handleShowToPay}>To pay</button>
                </div>
            </div>
            <table className="mt-1 w-full table-fixed text-sm leading-6">
                <thead className="border-b border-current">
                    <tr>
                        <th scope="col" className="text-left">Player</th>
                        <th scope="col" className="w-24 text-right">{amountHeading}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#620b19]/20">
                    {balanceRows}
                </tbody>
            </table>
            <div className="mt-1 flex flex-wrap justify-between gap-x-3 border-t border-[#620b19]/20 text-sm">
                <span className={countLabelClass}>Largest {players.length} of {balances?.count ?? 0} outstanding balances</span>
                {props.onOpenAll && <button type="button" className="cursor-pointer font-bold hover:underline" onClick={props.onOpenAll}>View all →</button>}
            </div>
        </CasinoTicket>
    );
}
