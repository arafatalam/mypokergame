import axios from 'axios';
import { createRoot } from 'react-dom/client';
import SignedInLayout from '../src/pages/signed-in-layout';
import '../src/index.css';

const requests: { page: number; from_month?: string; to_month?: string }[] = [];
let fail = true;
axios.defaults.adapter = async function (config) {
    const params = config.params ?? {};
    let data;
    if (config.url === '/api/v1/leaderboard') {
        requests.push(params);
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (params.page === 2 && params.from_month && fail) {
            fail = false;
            throw Error('Temporary failure');
        }
        const from = (params.page - 1) * 10 + 1;
        const to = Math.min(from + 9, 22);
        data = {
            data: Array.from({ length: to - from + 1 }, (_, index) => {
                const id = from + index;
                return { id, firstName: 'Avery', lastName: String(id), winnings: id === 1 ? -75 : 0, rank: id };
            }),
            has_closed_games: true,
            meta: { from, to, current_page: params.page, last_page: 3, total: 22 },
        };
    } else if (config.url?.startsWith('/api/v1/users/')) {
        data = { id: 11, first_name: 'Avery', last_name: '11', username: 'avery.11' };
    } else {
        throw Error('Unexpected request ' + config.url);
    }

    return { data, status: 200, statusText: 'OK', headers: {}, config };
};
function check(condition: unknown, message: string) {
    if (!condition) throw Error(message);
}
function button(label: string) {
    return [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === label);
}
async function waitFor(condition: () => unknown, message: string) {
    for (let index = 0; index < 100; index++) {
        if (condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw Error(message);
}
function has(text: string) {
    return document.getElementById('root')!.innerText.includes(text);
}
async function click(label: string) {
    await waitFor(() => button(label) && !button(label)!.disabled, 'Unavailable: ' + label);
    button(label)!.click();
}
async function setMonth(index: number, value: string) {
    const trigger = document.querySelectorAll<HTMLButtonElement>('.casino-month-trigger')[index];
    trigger.scrollIntoView({ block: 'center' });
    trigger.click();
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;
    const field = trigger.getBoundingClientRect();
    const panel = dialog.getBoundingClientRect();
    const viewport = document.documentElement;
    const expectedLeft = Math.max(8, Math.min(field.left, viewport.clientWidth - panel.width - 8));
    check(Math.abs(panel.left - expectedLeft) < 1 && panel.top >= 0 && panel.bottom <= viewport.clientHeight,
        'Month picker is not aligned with its field');
    check(Math.abs(panel.top - field.bottom - 6) < 1 || Math.abs(field.top - panel.bottom - 6) < 1,
        'Month picker does not open next to its field');
    const targetYear = Number(value.slice(0, 4));
    while (Number(dialog.querySelector('strong')!.textContent) > targetYear) {
        dialog.querySelector<HTMLButtonElement>('button[title="Previous year"]')!.click();
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    dialog.querySelector<HTMLButtonElement>('button[value="' + value + '"]')!.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
}
async function verify() {
    const root = document.getElementById('root')!;
    createRoot(root).render(<SignedInLayout signedInUserId={1} canRecordGameTotals canCreateUser />);
    await click('See all →');
    await waitFor(() => has('1–10 of 22'), 'All-time rows did not load');
    check(has('−$75'), 'Negative winnings not formatted');
    await click('Next ›');
    await waitFor(() => has('11–20 of 22'), 'Page 2 did not load');
    await click('Next ›');
    await waitFor(() => has('21–22 of 22'), 'Page 3 did not load');
    await setMonth(0, '2025-11');
    await setMonth(1, '2025-10');
    check(button('Apply filters')?.disabled && has('To month must be the same as or later than From month') && has('21–22 of 22'), 'Reversed range handling');
    await setMonth(1, '2025-11');
    await click('Apply filters');
    await waitFor(() => has('Loading rankings…'), 'Missing loading feedback');
    check(has('21–22 of 22') && button('‹ Previous')?.disabled && button('Next ›')?.disabled, 'Loading changed the last page');
    await waitFor(() => has('1–10 of 22'), 'Apply did not reset to page 1');
    await click('Next ›');
    await waitFor(() => has('Couldn’t load rankings'), 'Missing retry feedback');
    check(has('1–10 of 22'), 'Failure hid the last good rows');
    await click('Retry');
    await waitFor(() => has('11–20 of 22'), 'Retry did not restore page 2');
    check(requests.at(-1)?.from_month === '2025-11' && requests.at(-1)?.to_month === '2025-11', 'Retry lost month filters');
    await click('Avery 11');
    await waitFor(() => has('Back to Leaderboard') && !has('11–20 of 22'), 'Profile did not open');
    await click('Back to Leaderboard');
    await waitFor(() => has('11–20 of 22'), 'Profile return lost the page');
    check(document.querySelector('.casino-month-trigger span')?.textContent === '2025-11', 'Profile return lost filters');
    await click('Clear filters');
    await waitFor(() => has('1–10 of 22'), 'Clear did not reset to page 1');
    check(!requests.at(-1)?.from_month && !requests.at(-1)?.to_month, 'Clear left a filter applied');
    const leaderboard = document.querySelector<HTMLElement>('.leaderboard')!;
    const grid = leaderboard.parentElement!.getBoundingClientRect();
    const ticket = leaderboard.getBoundingClientRect();
    const inset = innerWidth >= 1024 ? grid.width * 2 / 7 : 0;
    check(Math.abs(ticket.left - grid.left - inset) < 1 &&
        Math.abs(grid.right - ticket.right - inset) < 1, 'Leaderboard width or centering is incorrect');
    const controls = [...document.querySelectorAll('.leaderboard th, .leaderboard button:not(dialog button)')];
    check(document.documentElement.scrollWidth <= innerWidth && controls.every((control) => {
        const bounds = control.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth;
    }), 'Leaderboard controls overflow the viewport');
    document.getElementById('result')!.textContent = 'PASS at ' + innerWidth + ' × ' + innerHeight;
}
void verify().catch((error: Error) => {
    document.getElementById('result')!.textContent = 'FAIL at ' + innerWidth + ' × ' + innerHeight + ' — ' + error.message;
});
