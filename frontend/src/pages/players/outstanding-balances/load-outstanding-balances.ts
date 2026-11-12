import axios from 'axios';

export type BalanceDirection = 'all' | 'collect' | 'pay';

export type OutstandingBalancesQuery = {
    search: string;
    direction: BalanceDirection;
    page: number;
};

export type OutstandingBalancesPage = {
    data: { id: number; name: string; balance: number }[];
    meta: {
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
};

export async function loadOutstandingBalances(query: OutstandingBalancesQuery, signal: AbortSignal): Promise<OutstandingBalancesPage> {
    const response = await axios.get<OutstandingBalancesPage>('/api/v1/outstanding-balances', {
        params: { ...query, search: query.search.trim() },
        signal,
    });

    return response.data;
}
