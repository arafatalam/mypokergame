import TurquoisePaperTicket from '../../components/turquoise-paper-ticket';
import { formatGameMoney } from '../games/close-game/format-game-money';
import type { HomeSummary } from './load-home-summary';

type HomeSummaryTicketsProps = {
    summary: HomeSummary | null;
    hasFailed: boolean;
    onOpenHouseIncome?: () => void;
    onRetry: () => void;
};

export default function HomeSummaryTickets(props: HomeSummaryTicketsProps) {
    const tickets = [
        { title: 'Players owe the house', total: props.summary?.toCollect.total, detail: playerCount(props.summary?.toCollect.count) },
        { title: 'House owes players', total: props.summary?.toPay.total, detail: playerCount(props.summary?.toPay.count) },
        { title: 'Income this month', total: props.summary?.income.total, detail: closedGameCount(props.summary), onOpen: props.onOpenHouseIncome },
    ];

    return tickets.map(function renderTicket(ticket) {
        let amount = <p className="flex h-9 items-center justify-center">Loading totals…</p>;
        let detail = <p className="h-6">{ticket.detail}</p>;

        if (ticket.total !== undefined) {
            amount = <p className="h-9 text-3xl font-bold">{formatGameMoney(ticket.total)}</p>;
        }

        if (props.hasFailed) {
            amount = <p className="flex h-9 items-center justify-center">Couldn’t load totals</p>;
            detail = (
                <div className="flex h-6 items-center justify-center">
                    <button type="button" className="casino-button relative z-10 px-2" onClick={props.onRetry}>Retry</button>
                </div>
            );
        }

        // Keep the amount and detail slots the same height in every request state.
        return (
            <TurquoisePaperTicket key={ticket.title}>
                <h2>
                    {ticket.onOpen ? (
                        // Extend the title button across the paper ticket while keeping Retry separate.
                        <button type="button" className="cursor-pointer hover:underline focus-visible:underline after:absolute after:inset-0" onClick={ticket.onOpen}>
                            {ticket.title}
                        </button>
                    ) : ticket.title}
                </h2>
                {amount}
                {detail}
            </TurquoisePaperTicket>
        );
    });
}

function playerCount(count: number | undefined): string {
    if (count === undefined) {
        return '';
    }

    if (count === 1) {
        return '1 player';
    }

    return count + ' players';
}

function closedGameCount(summary: HomeSummary | null): string {
    if (summary === null) {
        return '';
    }

    const { count, month } = summary.income;
    if (count === 1) {
        return '1 closed game in ' + month;
    }

    return count + ' closed games in ' + month;
}
