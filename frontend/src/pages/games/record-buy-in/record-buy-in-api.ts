import axios from 'axios';

type GameOption = { id: number; name: string; minimum: number; maximum: number };
type PlayerOption = { id: number; name: string; openGameId: number | null };
export type BuyInOptions = { games: GameOption[]; players: PlayerOption[] };
export type BuyInDraft = { gameId: number; playerId: number; cash: number; credit: number; requestId: string };
export type BuyInReceipt = {
    game: string;
    player: string;
    cash: number;
    credit: number;
    total: number;
    balance: number;
    visitId: number;
};

export async function loadBuyInOptions(): Promise<BuyInOptions> {
    const response = await axios.get<BuyInOptions>('/api/v1/games/buy-in-options');
    return response.data;
}

export async function saveBuyIn(draft: BuyInDraft): Promise<BuyInReceipt> {
    const response = await axios.post<BuyInReceipt>('/api/v1/buy-ins', draft);
    return response.data;
}
