import axios from 'axios';

export type CashoutCorrectionDetails = {
    id: number;
    game: string;
    player: string;
    visit: number;
    endingChips: number;
    cashPaid: number;
};

type CashoutCorrectionDraft = {
    previousEndingChips: number;
    previousCashPaid: number;
    endingChips: number;
    cashPaid: number;
    reason: string;
};

export type CashoutCorrectionReceipt = CashoutCorrectionDetails & CashoutCorrectionDraft & {
    balance: number;
};

function correctionUrl(id: number) {
    return '/api/v1/cashouts/' + id + '/correction';
}

export async function loadCashoutCorrection(id: number, signal: AbortSignal) {
    const response = await axios.get<{ data: CashoutCorrectionDetails }>(correctionUrl(id), { signal });
    return response.data.data;
}

export async function saveCashoutCorrection(id: number, draft: CashoutCorrectionDraft, requestId: string) {
    const response = await axios.patch<{ data: CashoutCorrectionReceipt | { message: string } }>(correctionUrl(id), { ...draft, requestId });
    return response.data.data;
}
