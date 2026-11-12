import axios from 'axios';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GameDetails from '../src/pages/games/game-details/game-details';
import type { GamePlayer, SavedGameDetails } from '../src/pages/games/game-details/load-game-details';
import '../src/index.css';

const players: GamePlayer[] = [];
for (const [index, name, result] of [
    [1, 'Avery Winner', 100],
    [2, 'Blake Loser', -100],
    [3, 'Casey Even', 0],
    [4, 'Drew Playing', null],
    [5, 'Emery Winner', 200],
    [6, 'Finley Loser', -200],
] as const) {
    players.push({
        id: index, name, result, stillPlaying: result === null,
        buyIns: 200, endingChips: result === null ? null : 200 + result,
        cashPaid: result === null ? null : 50,
        purchases: [{ id: index, label: 'First buy-in', visit: 1, cash: 150, credit: 50, total: 200 }],
    });
}

const game: SavedGameDetails = {
    id: 3, name: '11_NOV_2026_3', status: 'open', date: '2026-11-11',
    minBuyIn: 150, maxBuyIn: 450, dealerTips: 5, gameCosts: 10,
    buyIns: 1200, endingChips: 1000, cashPaid: 250, income: null, players,
};

let patchAttempts = 0;
axios.defaults.adapter = async function respond(config) {
    if (config.url === '/api/v1/games/3/totals' && config.method === 'patch') {
        patchAttempts++;
        if (patchAttempts === 1) {
            throw Error('Simulated save failure');
        }
        const amounts = JSON.parse(config.data);
        return { data: { data: { ...amounts, income: null } }, status: 200, statusText: 'OK', headers: {}, config };
    }

    if (config.url === '/api/v1/games/3' && config.method === 'get') {
        return { data: { data: game }, status: 200, statusText: 'OK', headers: {}, config };
    }

    throw Error('Unexpected request');
};

function Acceptance() {
    const [savedCount, setSavedCount] = useState(0);

    function handleSaved() {
        setSavedCount(savedCount + 1);
    }

    return (
        <>
            <GameDetails game={game} onTotalsSaved={handleSaved} />
            <output>Successful saves: {savedCount}</output>
        </>
    );
}

createRoot(document.getElementById('root')!).render(<Acceptance />);
