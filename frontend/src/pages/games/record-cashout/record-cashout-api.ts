import axios from 'axios';

type GameOption = { id: number; name: string };
type PlayerOption = { id: number; gameId: number; visitId: number; name: string; totalBuyIn: number };

export type CashoutOptions = { games: GameOption[]; players: PlayerOption[] };
export type CashoutDraft = { gameId: number; playerId: number; visitId: number; endingChips: number; cashPaid: number; requestId: string };
export type CashoutReceipt = { game: string; player: string; endingChips: number; cashPaid: number; balance: number };

export async function loadCashoutOptions(): Promise<CashoutOptions> {
    const response = await axios.get<CashoutOptions>('/api/v1/games/cashout-options');
    return response.data;
}

export async function saveCashout(draft: CashoutDraft): Promise<CashoutReceipt> {
    const response = await axios.post<{ data: CashoutReceipt }>('/api/v1/cashouts', draft);
    return response.data.data;
}
