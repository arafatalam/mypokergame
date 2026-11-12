import axios from 'axios';

export type GameFilters = {
    fromDate: string;
    toDate: string;
    status: 'all' | 'open' | 'closed';
};

export type GameListRequest = GameFilters & { page: number };

export type GameListItem = {
    id: number;
    name: string;
    status: 'open' | 'closed';
    buyIns: number;
    endingChips: number;
    cashPaid: number;
    dealerTips: number;
    gameCosts: number;
    income: number | null;
};

export type DatedGameListItem = GameListItem & { gameDate: string };

export type GameListResponse = {
    data: DatedGameListItem[];
    has_games: boolean;
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export async function loadGames(request: GameListRequest, signal: AbortSignal): Promise<GameListResponse> {
    const response = await axios.get<GameListResponse>('/api/v1/games', {
        signal,
        params: {
            page: request.page,
            from_date: request.fromDate || undefined,
            to_date: request.toDate || undefined,
            status: request.status,
        },
    });

    return response.data;
}
