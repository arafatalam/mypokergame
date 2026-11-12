import axios from 'axios';
import type { PaymentDirection } from '../record-payment/record-payment-api';

export type PaymentListItem = {
    id: number;
    paidAt: string;
    player: string;
    direction: PaymentDirection;
    amount: number;
    note: string | null;
    cashoutId?: number | null;
};

export type PaymentListQuery = {
    search: string;
    playerId?: number;
    direction: string;
    page: number;
    perPage?: 5 | 10;
};

export type PaymentListResponse = {
    data: PaymentListItem[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export async function loadPayments(query: PaymentListQuery, signal: AbortSignal): Promise<PaymentListResponse> {
    const response = await axios.get<PaymentListResponse>('/api/v1/payments', {
        signal,
        params: {
            page: query.page,
            per_page: query.perPage,
            // Use the selected account so duplicate names cannot mix histories.
            player_id: query.playerId,
            search: query.playerId === undefined ? query.search.trim() || undefined : undefined,
            direction: query.direction || undefined,
        },
    });

    return response.data;
}
