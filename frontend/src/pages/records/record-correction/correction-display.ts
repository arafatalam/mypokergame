const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
const amountFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

export const directionLabels = {
    player_pays_house: 'Player paid house',
    house_pays_player: 'House paid player',
};

export function formatDate(date: string): string {
    // A saved calendar date should read the same in every browser timezone.
    return dateFormat.format(new Date(date + 'T00:00:00Z'));
}

export function formatAmount(amount: number): string {
    return amountFormat.format(amount);
}
