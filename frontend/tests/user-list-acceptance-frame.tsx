import { createRoot } from 'react-dom/client';
import axios, { AxiosError } from 'axios';
import { useState } from 'react';
import UserList from '../src/pages/users/user-list/user-list';
import '../src/pages/signed-in-layout.css';
import avatar from '../src/assets/casino/sample-account-portrait.png';
import '../src/index.css';

// Intercept every API call; these browser checks never write accounts or sessions.
type ListReply = { data: { id: number; first_name: string; last_name: string; phone: null; photo_url: string; role: { value: string; label: string; }; }[]; meta: { from: number | null; to: number | null; total: number; current_page: number; last_page: number; }; };
type Pending = { page: number; role?: string; search?: string; resolve: (reply?: ListReply) => void; reject: (status?: number) => void; };
const pending: Pending[] = [];
const requests: number[] = [];
const checks: string[] = [];
const unexpected: string[] = [];
const errors: string[] = [];
window.addEventListener('error', function (event) { errors.push(event.message); });
window.addEventListener('unhandledrejection', function (event) { errors.push(String(event.reason)); });
axios.defaults.adapter = async function (config) {
    const response = { config, status: 200, statusText: 'OK', headers: {}, data: {} };
    if (config.url === '/api/v1/user') return response;
    if (config.url === '/api/v1/users/create-options') return { ...response, data: { roles: [{ value: 'player', label: 'Player' }] } };
    if (config.url !== '/api/v1/users' || config.method !== 'get') {
        unexpected.push(config.method + ' ' + config.url);
        throw Error('Unexpected test request');
    }
    const page = Number(config.params.page);
    requests.push(page);
    return new Promise(function (resolve, reject) {
        pending.push({ page, role: config.params.role, search: config.params.search,
            resolve(reply = pageReply(page)) {
                resolve({ ...response, data: { ...reply, role_options: [{ value: 'player', label: 'Player' }] } });
            },
            reject(status) {
                const failure = { ...response, status: status ?? 0 };
                reject(new AxiosError('Simulated failure', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, undefined, status ? failure : undefined));
            },
        });
    });
};

function pageReply(page: number): ListReply {
    const users = [];
    const from = (page - 1) * 5 + 1;
    const to = Math.min(page * 5, 7);
    for (let id = from; id <= to; id++) users.push({ id, first_name: 'Person', last_name: String(id), phone: null, photo_url: avatar, role: { value: 'player', label: 'Player' } });
    return { data: users, meta: { from, to, total: 7, current_page: page, last_page: 2 } };
}
function delay() { return new Promise(function (resolve) { setTimeout(resolve, 30); }); }
async function until(condition: () => boolean) {
    for (let attempt = 0; attempt < 150; attempt++) { if (condition()) return; await delay(); }
    throw Error('Wait condition timed out');
}
function check(value: unknown, label: string) { if (!value) throw Error(label); checks.push(label); }
function button(label: string) {
    const result = [...document.querySelectorAll<HTMLButtonElement>('button')].find(function (item) { return item.textContent?.trim() === label; });
    if (!result) throw Error('Missing button ' + label);
    return result;
}
function previous() { return button('‹ Previous'); }
function next() { return button('Next ›'); }
function message() { return document.querySelector('.casino-pagination > span:first-child')?.textContent; }
function rowNames() { return [...document.querySelectorAll('tbody tr td:first-child')].map(function (item) { return item.textContent?.trim(); }).join(','); }
function takeRequest() { const request = pending.shift(); if (!request) throw Error('No pending request'); return request; }
async function selectTask(label: string) {
    button(label).click();
    await delay();
}
function snapshot() {
    const footer = document.querySelector('.casino-pagination')!.getBoundingClientRect();
    const ticket = document.querySelector('.user-list-ticket')!.getBoundingClientRect();
    const buttons = [previous(), next()].map(function (item) {
        const bounds = item.getBoundingClientRect();
        return { label: item.textContent?.trim(), left: bounds.left, right: bounds.right, clipped: bounds.left < ticket.left || bounds.right > ticket.right };
    });
    return { viewport: innerWidth + 'x' + innerHeight, footerWidth: Math.round(footer.width), ticketWidth: Math.round(ticket.width), horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1, buttons, footerOverlapsSidebar: footer.right > document.querySelector('.player-tab')!.getBoundingClientRect().left };
}

// Mount and unmount the active list to exercise late responses.
export function UserListFixture() {
    const [showList, setShowList] = useState(false);
    let content = null;
    if (showList) {
        content = <UserList onOpenUserProfile={leaveList} />;
    }

    function openList() { setShowList(true); }
    function leaveList() { setShowList(false); }

    return (
        <main className="casino-scenery min-h-screen">
            <div className="home-screen">
                <nav className="home-navigation" aria-label="Test screen controls">
                    <button type="button" onClick={openList}>User List</button>
                    <button type="button" onClick={leaveList}>Leave User List</button>
                </nav>
                <div className="home-content">
                    <h2 id="user-list-title">Users</h2>
                    {content}
                </div>
            </div>
        </main>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<UserListFixture />);
async function exercise() {
    await until(function () { return !!document.querySelector('.home-navigation'); });
    await selectTask('User List'); await until(function () { return pending.length > 0; });
    check(message() === 'Loading users…', 'initial loading feedback');
    check(previous().disabled && next().disabled, 'initial controls disabled');
    takeRequest().reject();
    await until(function () { return message() === 'Could not load users.'; });
    check(document.querySelectorAll('tbody tr').length === 0, 'initial failure leaves no invented rows');
    check(previous().disabled && next().disabled, 'initial failure has no page to navigate');
    await selectTask('Leave User List'); await selectTask('User List'); await until(function () { return pending.length > 0; });
    takeRequest().resolve(); await until(function () { return message() === '1–5 of 7'; });
    check(!message()?.includes('Unable'), 'reopening recovers initial load failure');
    check(document.querySelectorAll('tbody tr').length === 5, 'first page five rows');
    check(previous().disabled && !next().disabled, 'first page boundary');
    const names = rowNames();
    async function reopenFirstPage() {
        await selectTask('Leave User List');
        await selectTask('User List');
        await until(function () { return pending.length > 0; });
        takeRequest().resolve();
        await until(function () { return message() === '1–5 of 7'; });
    }

    for (const status of [undefined, 500, 422, 401, 403, 419]) {
        const before = requests.length;
        next().click(); next().click();
        await until(function () { return pending.length > 0; });
        check(message() === 'Loading users…', 'pending feedback ' + status);
        check(previous().disabled && next().disabled, 'pagination stays locked while pending ' + status);
        check(requests.length === before + 1, 'duplicate blocked ' + status);
        const request = takeRequest();
        check(request.page === 2, 'request page two ' + status);
        request.reject(status);
        await until(function () { return message() === 'Could not load users.'; });
        check(rowNames() === names, 'failed request retains rows ' + status);
        check(previous().disabled && !next().disabled, 'failed request preserves page boundaries ' + status);
        next().click();
        await delay();
        check(requests.length === before + 1, 'same failed page does not retry ' + status);
        await reopenFirstPage();
    }
    next().click(); await until(function () { return pending.length > 0; });
    check(message() === 'Loading users…', 'page two shows loading feedback');
    takeRequest().resolve(); await until(function () { return message() === '6–7 of 7'; });
    check(document.querySelectorAll('tbody tr').length === 2, 'last page two rows');
    check(!previous().disabled && next().disabled, 'last page boundary');
    const countBeforeDisabled = requests.length; next().click(); await delay();
    check(requests.length === countBeforeDisabled, 'disabled Next sends no request');
    const lastNames = rowNames();
    previous().click(); previous().click(); await until(function () { return pending.length > 0; });
    check(pending.length === 1, 'duplicate Previous sends one request');
    takeRequest().reject();
    await until(function () { return message() === 'Could not load users.'; });
    check(rowNames() === lastNames && !previous().disabled && next().disabled, 'failed Previous retains last page');
    await reopenFirstPage();
    next().click(); await until(function () { return pending.length > 0; });
    takeRequest().resolve(); await until(function () { return message() === '6–7 of 7'; });
    previous().click(); await until(function () { return pending.length > 0; });
    const back = takeRequest(); check(back.page === 1, 'Previous requests page one'); back.resolve();
    await until(function () { return message() === '1–5 of 7'; });
    check(rowNames() === names, 'Previous restores original rows');

    // Replace a pending search with a Role filter, then deliver the older response late.
    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    const role = document.querySelector<HTMLSelectElement>('.user-list-role-filter select')!;
    function searchFor(value: string) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, value);
        search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    searchFor('Person');
    await until(function () { return pending.length > 0; });
    const oldSearch = takeRequest();
    check(oldSearch.search === 'Person' && oldSearch.page === 1, 'search starts on page one');
    role.value = 'player';
    role.dispatchEvent(new Event('change', { bubbles: true }));
    await until(function () { return pending.length > 0; });
    const filtered = takeRequest();
    check(filtered.role === 'player' && filtered.search === 'Person' && filtered.page === 1, 'role change keeps search and requests page one');
    check(message() === 'Loading users…' && previous().disabled && next().disabled, 'filter request shows loading and locks pagination');
    const match = pageReply(1);
    match.data = match.data.slice(0, 1);
    match.meta = { from: 1, to: 1, total: 1, current_page: 1, last_page: 1 };
    filtered.resolve(match);
    await until(function () { return message() === '1–1 of 1'; });
    oldSearch.resolve();
    await delay();
    check(message() === '1–1 of 1' && rowNames() === 'Person 1', 'late search success cannot replace the filtered result');

    searchFor('Nobody');
    await until(function () { return pending.length > 0; });
    const oldFailure = takeRequest();
    searchFor('No matches');
    await until(function () { return pending.length > 0; });
    const empty = takeRequest();
    oldFailure.reject();
    await delay();
    check(message() === 'Loading users…' && rowNames() === 'Person 1' && next().disabled, 'late search failure cannot unlock or change current feedback');
    empty.resolve({ data: [], meta: { from: null, to: null, total: 0, current_page: 1, last_page: 1 } });
    await until(function () { return message() === 'No users found.'; });
    check(rowNames() === '' && previous().disabled && next().disabled, 'an empty search clears rows and disables pagination');
    await reopenFirstPage();

    // Leave while page two is pending; the newly mounted list has an independent request.
    for (const failure of [false, true]) {
        next().click(); await until(function () { return pending.length > 0; });
        const abandoned = takeRequest();
        await selectTask('Leave User List'); check(!document.querySelector('.casino-pagination'), 'list unmounted ' + failure);
        await selectTask('User List'); await until(function () { return pending.length > 0; });
        const reopened = takeRequest(); check(reopened.page === 1, 'reopen starts first page ' + failure);
        if (failure) abandoned.reject(); else abandoned.resolve();
        await delay();
        check(message() === 'Loading users…' && previous().disabled && next().disabled, 'old result cannot clear new loading ' + failure);
        reopened.resolve(); await until(function () { return message() === '1–5 of 7'; });
        check(rowNames() === names, 'reopened rows remain current ' + failure);
    }
    await selectTask('Leave User List'); await selectTask('User List'); await until(function () { return pending.length > 0; });
    takeRequest().resolve({ data: [], meta: { from: null, to: null, total: 0, current_page: 1, last_page: 1 } });
    await until(function () { return message() === 'No users found.'; });
    check(document.querySelectorAll('tbody tr').length === 0, 'empty result has no rows');
    check(previous().disabled && next().disabled, 'empty result disables both controls');
    await selectTask('Leave User List'); await selectTask('User List'); await until(function () { return pending.length > 0; });
    const single = pageReply(1); single.data = single.data.slice(0, 2); single.meta = { from: 1, to: 2, total: 2, current_page: 1, last_page: 1 };
    takeRequest().resolve(single); await until(function () { return message() === '1–2 of 2'; });
    check(previous().disabled && next().disabled, 'one-page list disables both controls');
    await selectTask('Leave User List'); await selectTask('User List'); await until(function () { return pending.length > 0; });
    takeRequest().resolve(); await until(function () { return message() === '1–5 of 7'; });
    await document.fonts.ready;
    await Promise.all([...document.images].map(function (item) { return item.decode().catch(function () {}); }));
    const layout = snapshot();
    check(errors.length === 0, 'no browser errors');
    check(unexpected.length === 0, 'no unexpected or write requests');
    parent.postMessage({ kind: 'user-list-acceptance', passed: checks.length, ...layout, errors }, location.origin);
}
exercise().catch(function (error) { parent.postMessage({ kind: 'user-list-acceptance', viewport: innerWidth + 'x' + innerHeight, passed: checks.length, error: String(error), errors, requests }, location.origin); });
