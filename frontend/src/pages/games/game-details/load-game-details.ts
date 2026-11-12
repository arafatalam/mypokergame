import axios from 'axios';
import type { GameListItem } from '../game-list/load-games';

export type GamePurchase = {
    id: number;
    label: string;
    visit: number;
    cash: number;
    credit: number;
    total: number;
};

export type GamePlayer = {
    id: number;
    name: string;
    buyIns: number;
    endingChips: number | null;
    cashPaid: number | null;
    result: number | null;
    stillPlaying: boolean;
    purchases: GamePurchase[];
    cashouts?: { id: number; visit: number }[];
};

export type SavedGameDetails = GameListItem & {
    date: string;
    minBuyIn: number;
    maxBuyIn: number;
    players: GamePlayer[];
};

export async function loadGameDetails(gameId: number, signal: AbortSignal): Promise<SavedGameDetails> {
    const response = await axios.get<{ data: SavedGameDetails }>('/api/v1/games/' + gameId, { signal });
    return response.data.data;
}
