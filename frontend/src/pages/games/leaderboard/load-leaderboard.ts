import axios from 'axios';

export type MonthFilters = { fromMonth: string; toMonth: string };
export type LeaderboardRequest = MonthFilters & { page: number };
export type Ranking = {
    id: number;
    firstName: string;
    lastName: string;
    winnings: number;
    rank: number;
};
export type LeaderboardPage = {
    data: Ranking[];
    has_closed_games: boolean;
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export async function loadLeaderboard(request: LeaderboardRequest, signal: AbortSignal): Promise<LeaderboardPage> {
    const response = await axios.get<LeaderboardPage>('/api/v1/leaderboard', {
        signal,
        params: {
            page: request.page,
            from_month: request.fromMonth || undefined,
            to_month: request.toMonth || undefined,
        },
    });

    return response.data;
}
