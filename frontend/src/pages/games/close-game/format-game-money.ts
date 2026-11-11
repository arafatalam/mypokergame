export function formatGameMoney(amount: number): string {
    const dollars = '$' + Math.abs(amount).toLocaleString('en-CA');
    if (amount < 0) {
        return '−' + dollars;
    }

    return dollars;
}
