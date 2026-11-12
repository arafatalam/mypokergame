import axios from 'axios';

export type PaymentDirection = 'house_pays_player' | 'player_pays_house';
export type PaymentPlayer = { id: number; name: string; balance: number };
export type PaymentOptions = { players: PaymentPlayer[]; today: string };
export type PaymentDraft = {
    playerId: number;
    direction: PaymentDirection;
    amount: number;
    paidAt: string;
    note: string | null;
    requestId: string;
};
export type PaymentReceipt = {
    id: number;
    player: string;
    photoUrl: string;
    direction: PaymentDirection;
    amount: number;
    paidAt: string;
    balance: number;
};

export async function loadPaymentOptions(signal: AbortSignal): Promise<PaymentOptions> {
    const response = await axios.get<PaymentOptions>('/api/v1/payments/options', { signal });
    return response.data;
}

export async function savePayment(draft: PaymentDraft): Promise<PaymentReceipt> {
    const response = await axios.post<{ data: PaymentReceipt }>('/api/v1/payments', draft);
    return response.data.data;
}
