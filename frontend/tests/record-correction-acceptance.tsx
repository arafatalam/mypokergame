import axios, { AxiosError } from 'axios';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import '../src/index.css';
import '../src/styles/casino.css';

let amount = 50;
let paymentSaveAttempts = 0;
let gamePageFailures = 0;
const role = new URLSearchParams(window.location.search).get('role') ?? 'admin';

axios.defaults.adapter = async function fixture(config) {
    const url = config.url;
    const page = Number(config.params?.page ?? 1);
    const from = (page - 1) * 5 + 1;
    const to = Math.min(page * 5, 6);
    const meta = { current_page: page, last_page: 2, total: 6, from, to };
    const data = [];
    let body: unknown;

    if (url === '/api/v1/user') {
        body = { id: 1, role, is_active: true, must_change_password: false };
    } else if (url === '/api/v1/games') {
        if (page === 2 && gamePageFailures++ === 0) {
            throw new AxiosError('Simulated game page failure');
        }
        for (let id = from; id <= to; id++) {
            data.push({ id, name: 'Fixture game ' + id, gameDate: '2026-11-11', status: 'open', dealerTips: 10, gameCosts: 20 });
        }
        body = { data, meta, has_games: true };
    } else if (url === '/api/v1/payments') {
        for (let id = from; id <= to; id++) {
            data.push({ id, paidAt: '2026-11-11', player: 'Fixture player ' + id, direction: 'player_pays_house', amount, note: 'Original' });
        }
        body = { data, meta };
    } else if (url?.startsWith('/api/v1/payments/') && config.method === 'patch') {
        if (paymentSaveAttempts++ === 0) {
            throw new AxiosError('Simulated save failure');
        }
        const draft = JSON.parse(config.data);
        amount = draft.amount;
    } else {
        throw new Error('Unexpected fixture request ' + url);
    }

    return { config, data: body, headers: {}, status: 200, statusText: 'OK' };
};

createRoot(document.getElementById('root')!).render(<App />);
