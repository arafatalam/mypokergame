const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

// Execute the actual request Effect with a controllable transport and state setters.
// These tests cover its asynchronous callbacks, not React's rendering or cleanup scheduling.
const source = fs.readFileSync(path.join(__dirname, '../src/pages/users/user-list/user-list.tsx'), 'utf8');
const start = source.indexOf('useEffect(function populateUserTable()');
const ending = '}, [requestedPage, selectedRole, searchText])';
const end = source.indexOf(ending, start);
assert.ok(start >= 0 && end > start, 'UserList request Effect must be present');
const effectSource = stripTypeScriptTypes(source.slice(start, end + ending.length));

function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise(function rememberCallbacks(onResolve, onReject) {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

function startRequest(page, search = '', role = '') {
    const pending = createDeferred();
    const updates = [];
    const requests = [];
    const state = {};
    let cleanup;
    const context = {
        requestedPage: page,
        selectedRole: role || 'all',
        searchText: search,
        loadUsers(url, page, role, search) {
            requests.push({ url, page, search, role });
            return pending.promise;
        },
        useEffect: function useEffect(setup) {
            cleanup = setup();
        },
    };
    for (const name of [
        'setUsers', 'setRoleOptions', 'setUsersMessage', 'setCurrentPage', 'setLastPage', 'setIsLoadingUsers',
    ]) {
        context[name] = function rememberState(value) {
            state[name] = value;
            updates.push({ name, value });
        };
    }
    vm.runInNewContext(effectSource, context);
    return { pending, updates, requests, state, cleanup };
}

function response(page) {
    return {
        data: {
            data: [{ id: page }],
            role_options: [{ value: 'player', label: 'Player' }],
            meta: {
                from: (page - 1) * 5 + 1,
                to: page * 5,
                total: 10,
                current_page: page,
                last_page: 2,
            },
        },
    };
}

async function flushCallbacks() {
    await new Promise(setImmediate);
}

test('a live request sends the page and stores rows, range and page limits', async function () {
    const run = startRequest(2, 'Sam', 'player');
    assert.deepEqual(run.requests, [{ url: '/api/v1/users', page: 2, search: 'Sam', role: 'player' }]);
    assert.equal(run.state.setUsersMessage, 'Loading users…');
    assert.equal(run.state.setIsLoadingUsers, true);
    const result = response(2);
    run.pending.resolve(result.data);
    await flushCallbacks();
    assert.equal(run.state.setUsers, result.data.data);
    assert.equal(run.state.setRoleOptions, result.data.role_options);
    assert.equal(run.state.setUsersMessage, '6–10 of 10');
    assert.equal(run.state.setCurrentPage, 2);
    assert.equal(run.state.setLastPage, 2);
    assert.equal(run.state.setIsLoadingUsers, false);
});

test('a live failure preserves confirmed page data and releases the waiting state', async function () {
    const run = startRequest(2);
    run.pending.reject(new Error('Network unavailable'));
    await flushCallbacks();
    assert.equal(run.state.setUsersMessage, 'Could not load users.');
    assert.equal(run.state.setIsLoadingUsers, false);
    assert.equal(Object.hasOwn(run.state, 'setUsers'), false);
    assert.equal(Object.hasOwn(run.state, 'setCurrentPage'), false);
    assert.equal(Object.hasOwn(run.state, 'setLastPage'), false);
});

test('late success after cleanup skips rows, metadata and the finally update', async function () {
    const run = startRequest(2);
    run.cleanup();
    const countBefore = run.updates.length;
    run.pending.resolve(response(2).data);
    await flushCallbacks();
    assert.equal(run.updates.length, countBefore);
});

test('late failure after cleanup skips error and finally updates', async function () {
    const run = startRequest(2);
    run.cleanup();
    const countBefore = run.updates.length;
    run.pending.reject(new Error('Late failure'));
    await flushCallbacks();
    assert.equal(run.updates.length, countBefore);
});

test('cleanup affects only the old Effect while the replacement request completes', async function () {
    const old = startRequest(2);
    old.cleanup();
    const oldCount = old.updates.length;
    const replacement = startRequest(1);
    old.pending.resolve(response(2).data);
    await flushCallbacks();
    assert.equal(old.updates.length, oldCount);
    assert.equal(replacement.state.setUsersMessage, 'Loading users…');
    replacement.pending.resolve(response(1).data);
    await flushCallbacks();
    assert.equal(replacement.state.setCurrentPage, 1);
    assert.equal(replacement.state.setUsersMessage, '1–5 of 10');
});

test('empty results show a message without a null range', async function () {
    const run = startRequest(1);
    run.pending.resolve({
        data: [],
        role_options: [],
        meta: { from: null, to: null, total: 0, current_page: 1, last_page: 1 },
    });
    await flushCallbacks();
    assert.equal(run.state.setUsersMessage, 'No users found.');
    assert.equal(run.state.setCurrentPage, 1);
    assert.equal(run.state.setLastPage, 1);
});
