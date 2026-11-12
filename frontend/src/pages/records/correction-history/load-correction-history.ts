import axios from 'axios';

export type CorrectionType = 'game_totals' | 'cashout' | 'payment';

export type HistoryQuery = { type: string; page: number };
export type HistoryValue = number | string | null;

export type CorrectionEntry = {
    id: number;
    type: CorrectionType;
    affectedRecord: string;
    changes: Record<string, { before: HistoryValue; after: HistoryValue }>;
    staff: string;
    correctedAt: string;
    reason: string;
};

type HistoryResponse = {
    data: CorrectionEntry[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export async function loadCorrectionHistory(query: HistoryQuery, signal: AbortSignal): Promise<HistoryResponse> {
    const response = await axios.get<HistoryResponse>('/api/v1/corrections', {
        signal,
        params: { page: query.page, type: query.type || undefined },
    });

    return response.data;
}
