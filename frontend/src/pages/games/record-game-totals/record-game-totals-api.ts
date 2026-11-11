import axios from 'axios';

export type GameTotalsOption = { id: number; name: string; status: 'open' | 'closed' };
export type GameTotalsAmounts = { dealerTips: number; gameCosts: number };
export type GameTotals = GameTotalsAmounts & { income: number | null };

export async function loadGameTotalsOptions(signal: AbortSignal): Promise<GameTotalsOption[]> {
    const response = await axios.get<{ games: GameTotalsOption[] }>('/api/v1/games/totals-options', { signal });
    return response.data.games;
}

export async function loadGameTotals(gameId: number, signal: AbortSignal): Promise<GameTotals> {
    const response = await axios.get<{ data: GameTotals }>('/api/v1/games/' + gameId + '/totals', { signal });
    return response.data.data;
}

export async function saveGameTotals(gameId: number, amounts: GameTotalsAmounts): Promise<GameTotals> {
    const response = await axios.patch<{ data: GameTotals }>('/api/v1/games/' + gameId + '/totals', amounts);
    return response.data.data;
}
