import CasinoTicket from '../../components/casino-ticket';
import { formatGameMoney } from '../games/close-game/format-game-money';
import type { HomeSummary } from './load-home-summary';

type HomeLeaderboardTicketProps = {
    summary: HomeSummary | null;
    hasFailed: boolean;
    onRetry: () => void;
    onOpenLeaderboard?: () => void;
};

export default function HomeLeaderboardTicket(props: HomeLeaderboardTicketProps) {
    const players = props.summary?.leaderboard ?? [];
    const rows = [];

    for (const player of players) {
        let winnings = formatGameMoney(player.winnings);
        if (player.winnings > 0) {
            winnings = '+' + winnings;
        }

        rows.push(
            <tr key={player.id}>
                <td>{player.rank}</td>
                <td className="truncate" title={player.name}>{player.name}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{winnings}</td>
            </tr>
        );
    }

    if (props.hasFailed) {
        rows.push(
            <tr key="status">
                <td colSpan={3}>
                    Couldn’t load rankings{' '}
                    <button type="button" className="casino-button px-2" onClick={props.onRetry}>Retry</button>
                </td>
            </tr>
        );
    } else if (props.summary === null) {
        rows.push(<tr key="status"><td colSpan={3}>Loading rankings…</td></tr>);
    } else if (players.length === 0) {
        rows.push(<tr key="status"><td colSpan={3}>No rankings this month</td></tr>);
    }

    // Keep space for five rows while loading or when fewer players qualify.
    for (let row = rows.length; row < 5; row += 1) {
        rows.push(<tr key={'spacer-' + row} className="invisible"><td colSpan={3}>&nbsp;</td></tr>);
    }

    return (
        <CasinoTicket compactEdges className="w-full min-w-0 max-w-[440px] px-8 py-[22px] text-left text-[#620b19]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-bold lg:max-xl:text-base">Leaderboard</h2>
                {props.onOpenLeaderboard && (
                    <button type="button" className="rounded border border-current px-2 text-sm font-bold" onClick={props.onOpenLeaderboard}>See all →</button>
                )}
            </div>
            <table className="mt-1 w-full table-fixed text-sm leading-6">
                <thead className="border-b border-current">
                    <tr>
                        <th scope="col" className="w-10 text-left">Rank</th>
                        <th scope="col" className="text-left">Player</th>
                        <th scope="col" className="w-24 whitespace-nowrap text-right">Net winnings</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#620b19]/20">{rows}</tbody>
            </table>
            <p className="mt-1 border-t border-[#620b19]/20 text-sm">
                {props.summary?.income.month ?? 'This month'} · closed games only
            </p>
        </CasinoTicket>
    );
}
