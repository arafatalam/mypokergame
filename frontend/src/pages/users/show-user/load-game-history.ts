import axios from 'axios';

export type GameHistoryResponse = {
    data: {
        id: number;
        name: string;
        gameDate: string;
        netResult: number;
    }[];
    meta: {
        current_page: number;
        last_page: number;
    };
};

export async function loadGameHistory(playerId: number, page: number, signal: AbortSignal): Promise<GameHistoryResponse> {
    const response = await axios.get<GameHistoryResponse>('/api/v1/users/' + playerId + '/game-history', {
        params: { page },
        signal,
    });

    return response.data;
}
