import axios from 'axios';
import type { MonthFilters } from '../leaderboard/load-leaderboard';

export type HouseIncomeRequest = MonthFilters & { page: number };

export type MonthlyIncome = { month: string; closedGames: number; income: number };

export type HouseIncomePage = {
    data: MonthlyIncome[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export async function loadHouseIncome(request: HouseIncomeRequest, signal: AbortSignal): Promise<HouseIncomePage> {
    const response = await axios.get<HouseIncomePage>('/api/v1/house-income', {
        signal,
        params: {
            page: request.page,
            from_month: request.fromMonth || undefined,
            to_month: request.toMonth || undefined,
        },
    });

    return response.data;
}
