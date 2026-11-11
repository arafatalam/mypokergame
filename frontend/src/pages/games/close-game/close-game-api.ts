import axios from 'axios';
import type { GameTotalsAmounts } from '../record-game-totals/record-game-totals-api';

export type OpenGame = { id: number; name: string };
export type CloseGameDetails = GameTotalsAmounts & { buyIns: number; endingChips: number; openVisits: number };
export type CloseGameReceipt = GameTotalsAmounts & { income: number };

export async function loadOpenGames(signal: AbortSignal): Promise<OpenGame[]> {
    const response = await axios.get<{ games: OpenGame[] }>('/api/v1/games/close-options', { signal });
    return response.data.games;
}

export async function loadCloseGame(gameId: number, signal: AbortSignal): Promise<CloseGameDetails> {
    const response = await axios.get<{ data: CloseGameDetails }>('/api/v1/games/' + gameId + '/close', { signal });
    return response.data.data;
}

export async function closeGame(gameId: number, amounts: GameTotalsAmounts): Promise<CloseGameReceipt> {
    const response = await axios.post<{ data: CloseGameReceipt }>('/api/v1/games/' + gameId + '/close', amounts);
    return response.data.data;
}
