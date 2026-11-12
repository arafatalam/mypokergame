import type { GameListItem } from './load-games';

const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

export function buildGameRows(games: GameListItem[], onOpenGame: (gameName: string, game: GameListItem) => void) {
    const rows = [];

    for (const game of games) {
        function handleViewGame() {
            onOpenGame(game.name, game);
        }

        let rowClass = '';
        if (game.status === 'open') {
            rowClass = 'text-[var(--user-list-teal)]';
        }

        let income = '—';
        if (game.income !== null) {
            income = currency.format(game.income);
        }

        rows.push(
            <tr key={game.id} className={rowClass}>
                <td>{game.name}</td>
                <td>{currency.format(game.buyIns)}</td>
                <td>{currency.format(game.endingChips)}</td>
                <td>{currency.format(game.cashPaid)}</td>
                <td>{currency.format(game.dealerTips)}</td>
                <td>{currency.format(game.gameCosts)}</td>
                <td>{income}</td>
                <td><button className="underline" type="button" onClick={handleViewGame}>View game</button></td>
            </tr>,
        );
    }

    return rows;
}
