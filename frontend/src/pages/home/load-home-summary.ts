import axios from 'axios';

type SummaryTotal = { total: number; count: number };
type OutstandingPlayer = { id: number; name: string; amount: number };
export type BalanceSummary = SummaryTotal & { players: OutstandingPlayer[] };

export type HomeSummary = {
    toCollect: BalanceSummary;
    toPay: BalanceSummary;
    income: SummaryTotal & { month: string };
    leaderboard: { id: number; name: string; winnings: number; rank: number }[];
};

export async function loadHomeSummary(signal: AbortSignal): Promise<HomeSummary> {
    const response = await axios.get<HomeSummary>('/api/v1/home/summary', { signal });

    return response.data;
}
