export const directionLabels = {
    player_pays_house: 'Player paid house',
    house_pays_player: 'House paid player',
};
export const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
export const amountFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
