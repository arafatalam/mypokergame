import axios from 'axios';
import { createRoot } from 'react-dom/client';
import GameList from '../src/pages/games/game-list/game-list';
import type { GameListResponse } from '../src/pages/games/game-list/load-games';
import '../src/index.css';

type PendingRequest = {
    params: { page: number; from_date?: string; to_date?: string; status: string };
    respond: (data: GameListResponse) => void;
    fail: () => void;
};

const pending: PendingRequest[] = [];
let selectedGameName = '';
let createGameOpened = false;
axios.defaults.adapter = function fakeGameList(config) {
    if (config.url !== '/api/v1/games') {
        throw Error('Unexpected API request');
    }

    return new Promise(function (resolve, reject) {
        pending.push({
            params: config.params,
            respond(data) {
                resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
            },
            fail() {
                reject(Error('Simulated network failure'));
            },
        });
    });
};

function check(condition: unknown, message: string) {
    if (!condition) {
        throw Error(message);
    }
}

async function waitFor(condition: () => boolean, message: string) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (condition()) {
            return;
        }
        await new Promise(function (resolve) { setTimeout(resolve, 20); });
    }
    throw Error(message);
}

async function nextRequest() {
    await waitFor(function () { return pending.length > 0; }, 'No request arrived');
    return pending.shift()!;
}

function button(text: string) {
    const item = [...document.querySelectorAll('button')].find(function (element) {
        return element.textContent === text;
    });
    if (!item) {
        throw Error('Missing button ' + text);
    }
    return item;
}

function hasText(text: string) {
    return document.querySelector('#root')!.textContent!.includes(text);
}

function changeField(field: HTMLInputElement | HTMLSelectElement, value: string) {
    // Use the native setter so React sees a change from the last rendered value.
    const prototype = Object.getPrototypeOf(field);
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
}

async function chooseDate(label: string, date: string) {
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="' + label + '"]')!;
    trigger.click();
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;
    for (let month = 0; month < 120; month++) {
        const day = dialog.querySelector<HTMLButtonElement>('button[value="' + date + '"]');
        if (day) {
            check(!day.disabled, 'Expected selectable date ' + date);
            day.click();
            return;
        }
        dialog.querySelector<HTMLButtonElement>('button[title="Previous month"]')!.click();
        await new Promise(function (resolve) { requestAnimationFrame(resolve); });
    }
    throw Error('Could not find date ' + date);
}

function reply(page: number): GameListResponse {
    const from = page === 1 ? 1 : 6;
    const to = page === 1 ? 5 : 6;
    const data = [];
    for (let id = from; id <= to; id++) {
        data.push({
            id, name: 'Game ' + id, gameDate: '2026-11-11', status: 'open' as const,
            buyIns: 100, endingChips: 0, cashPaid: 0, dealerTips: 0, gameCosts: 0, income: null,
        });
    }
    return { data, has_games: true, meta: { from, to, current_page: page, last_page: 2, total: 6 } };
}

async function exercise() {
    const initial = await nextRequest();
    check(hasText('Loading games…'), 'Initial loading feedback was missing');
    initial.respond(reply(1));
    await waitFor(function () { return hasText('1–5 of 6'); }, 'First page did not render');

    const status = document.querySelector('select')!;
    await chooseDate('From date', '2026-11-10');
    await chooseDate('To date', '2026-11-11');
    changeField(status, 'open');
    button('Apply filters').click();
    const applied = await nextRequest();
    check(JSON.stringify(applied.params) === JSON.stringify({
        page: 1, from_date: '2026-11-10', to_date: '2026-11-11', status: 'open',
    }), 'Apply did not send the selected dates and status');
    applied.respond(reply(1));
    await waitFor(function () { return !button('Next ›').disabled; }, 'Next did not unlock');
    button('Next ›').click();

    const next = await nextRequest();
    check(next.params.page === 2, 'Next did not request page 2');
    next.fail();
    await waitFor(function () { return hasText('Couldn’t load games.'); }, 'Failure feedback was missing');
    check(hasText('1–5 of 6') && hasText('Game 5'), 'Failure removed the last successful page');
    changeField(status, 'closed');
    button('Retry').click();
    const retry = await nextRequest();
    check(JSON.stringify(retry.params) === JSON.stringify(next.params), 'Retry used edited draft filters');
    retry.respond(reply(2));
    await waitFor(function () { return hasText('6–6 of 6'); }, 'Retry did not show page 2');
    button('View game').click();
    check(selectedGameName === 'Game 6', 'View game did not pass the selected name');

    button('Apply filters').click();
    const reapplied = await nextRequest();
    check(reapplied.params.page === 1 && reapplied.params.status === 'closed', 'Apply did not reset pagination');
    const empty = { data: [], has_games: true, meta: { from: null, to: null, current_page: 1, last_page: 1, total: 0 } };
    reapplied.respond(empty);
    await waitFor(function () { return hasText('No games match these filters.'); }, 'Filtered empty message was missing');

    button('Clear filters').click();
    const cleared = await nextRequest();
    check(cleared.params.page === 1 && cleared.params.status === 'all' && !cleared.params.from_date && !cleared.params.to_date, 'Clear did not reset page and filters');
    cleared.respond({ ...empty, has_games: false });
    await waitFor(function () { return hasText('No games yet.'); }, 'Unfiltered empty message was missing');

    button('Create Game').click();
    check(createGameOpened && pending.length === 0, 'Create Game should open the screen without submitting the filters');
}

const result = document.getElementById('result')!;
function selectGame(gameName: string) {
    selectedGameName = gameName;
}

function openCreateGame() {
    createGameOpened = true;
}

createRoot(document.getElementById('root')!).render(<GameList onOpenGame={selectGame} onCreateGame={openCreateGame} />);
exercise().then(function () {
    result.textContent = 'PASS · Game List acceptance';
}).catch(function (error: Error) {
    result.textContent = 'FAIL · ' + error.message;
});
