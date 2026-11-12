import axios from 'axios';

type GameTotalsCorrection = {
    dealerTips: number;
    gameCosts: number;
    reason: string;
    requestId: string;
};

type PaymentCorrection = {
    amount: number;
    paidAt: string;
    note: string | null;
    reason: string;
    requestId: string;
};

export async function saveGameTotalsCorrection(id: number, correction: GameTotalsCorrection): Promise<string | undefined> {
    const response = await axios.patch<{ message?: string }>('/api/v1/games/' + id + '/totals/correction', correction);
    return response.data?.message;
}

export async function savePaymentCorrection(id: number, correction: PaymentCorrection): Promise<string | undefined> {
    const response = await axios.patch<{ message?: string }>('/api/v1/payments/' + id + '/correction', correction);
    return response.data?.message;
}

export function correctionError(error: unknown): string {
    if (axios.isAxiosError<{ message?: string }>(error) && error.response?.status === 422) {
        return error.response.data.message ?? 'Check the values and try again.';
    }

    return 'Could not save the correction. Try again.';
}
