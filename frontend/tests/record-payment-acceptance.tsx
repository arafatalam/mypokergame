import axios from 'axios';
import { createRoot } from 'react-dom/client';
import SignedInLayout from '../src/pages/signed-in-layout';
import RecordPayment from '../src/pages/players/record-payment/record-payment';
import type { PaymentDraft } from '../src/pages/players/record-payment/record-payment-api';
import '../src/index.css';
import samplePortrait from '../src/assets/casino/sample-account-portrait.png';

const shortcut = new URLSearchParams(window.location.search).has('shortcut');
const directoryPlayers = [
    { id: 1, first_name: 'Amelia', last_name: 'Test', balance: -120 },
    { id: 2, first_name: 'Jordan', last_name: 'Test', balance: 85 },
    { id: 3, first_name: 'Casey', last_name: 'Settled', balance: 0 },
];
const player = { id: 1, name: 'Amelia Test', balance: -120 };
const paymentPlayers = [
    player,
    { id: 2, name: 'Jordan Test', balance: 100 },
    { id: 3, name: 'Casey Settled', balance: 0 },
];
let firstRequest: PaymentDraft | undefined;
let failedResponse = false;

function applyPayment(playerId: number, draft: PaymentDraft) {
    const selectedPlayer = paymentPlayers.find(function matchesPlayer(entry) {
        return entry.id === playerId;
    });
    if (!selectedPlayer) {
        throw Error('Choose an available sample Player');
    }
    if (draft.direction === 'house_pays_player') {
        selectedPlayer.balance -= draft.amount;
    } else {
        selectedPlayer.balance += draft.amount;
    }
    return selectedPlayer;
}

axios.defaults.adapter = async function respond(config) {
    if (shortcut) {
        const response = { status: 200, statusText: 'OK', headers: {}, config };
        if (config.url === '/api/v1/users') {
            const data = directoryPlayers.map(function makeUser(entry) {
                return { ...entry, phone: null, photo_url: '', role: { value: 'player', label: 'Player' } };
            });
            return { ...response, data: { data, role_options: [], meta: { current_page: 1, last_page: 1, total: 3, from: 1, to: 3 } } };
        }
        if (config.url === '/api/v1/payments' && config.method === 'get') {
            const data = [];
            for (const entry of directoryPlayers) {
                const name = entry.first_name + ' ' + entry.last_name;
                if (config.params.player_id && entry.id !== config.params.player_id) {
                    continue;
                }
                if (config.params.search && !name.toLowerCase().includes(config.params.search.toLowerCase())) {
                    continue;
                }
                data.push({ id: entry.id, player: name, paidAt: '2026-11-11', direction: 'player_pays_house', amount: 75, note: null });
            }
            return { ...response, data: { data, meta: { current_page: 1, last_page: 1, total: data.length, from: data.length ? 1 : null, to: data.length || null } } };
        }
        if (config.url === '/api/v1/payments/options') {
            const players = directoryPlayers.map(function toOption(entry) {
                return { id: entry.id, name: entry.first_name + ' ' + entry.last_name, balance: entry.balance };
            });
            return { ...response, data: { players, today: '2026-11-11' } };
        }
        for (const entry of directoryPlayers) {
            if (config.url === '/api/v1/users/' + entry.id + '/player-tab') {
                return { ...response, data: { data: {
                    player_since: '2026-11-01', balance: entry.balance, can_record_payment: true,
                    last_payment: null, last_game: null,
                } } };
            }
        }
    }

    if (config.url === '/api/v1/payments/options') {
        const players = paymentPlayers.map(function copyPlayer(entry) {
            return { ...entry };
        });
        return { data: { players, today: '2026-11-11' }, status: 200, statusText: 'OK', headers: {}, config };
    }

    if (config.url === '/api/v1/payments' && config.method === 'post') {
        const draft: PaymentDraft = JSON.parse(config.data);
        let selectedPlayer = paymentPlayers.find(function matchesPlayer(entry) {
            return entry.id === draft.playerId;
        });
        if (!failedResponse) {
            failedResponse = true;
            firstRequest = draft;
            selectedPlayer = applyPayment(draft.playerId, draft);
            throw Error('The response was lost after the payment was saved');
        }
        if (firstRequest) {
            // The first retry must replay the exact request that already changed the balance.
            if (JSON.stringify(firstRequest) !== JSON.stringify(draft)) {
                throw Error('Retry changed the payment request');
            }
            firstRequest = undefined;
        } else {
            selectedPlayer = applyPayment(draft.playerId, draft);
        }
        if (!selectedPlayer) {
            throw Error('Choose an available sample Player');
        }
        const data = {
            id: 1, player: selectedPlayer.name, photoUrl: samplePortrait, direction: draft.direction,
            amount: draft.amount, paidAt: draft.paidAt, balance: selectedPlayer.balance,
        };
        return { data: { data }, status: 200, statusText: 'OK', headers: {}, config };
    }

    throw Error('Unexpected request');
};

function cancel() {
    document.getElementById('root')?.replaceChildren();
}

createRoot(document.getElementById('root')!).render(shortcut ? <SignedInLayout signedInUserId={99} canRecordGameTotals canCreateUser /> : <RecordPayment onCancel={cancel} />);
