const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/pages/users/shared-resources/password-ticket.tsx'), 'utf8');
const start = source.indexOf('    async function handleConfirmPasswordUpdate()');
const end = source.indexOf('\n    return (', start);
assert.ok(start >= 0 && end > start);

const handler = source.slice(start, end)
    .replace('axios.isAxiosError<{ errors?: { password?: string[] } }>', 'axios.isAxiosError');

function setup(userId) {
    let resolve;
    let reject;
    const request = new Promise(function captureCallbacks(onResolve, onReject) {
        resolve = onResolve;
        reject = onReject;
    });
    const calls = [];
    const state = { password: 'sample password', confirmation: 'sample password', isOpen: true };
    const context = {
        props: { userId },
        password: state.password,
        passwordConfirmation: state.confirmation,
        canContinue: true,
        updateInProgress: { current: false },
        axios: { isAxiosError: (error) => Boolean(error.response) },
        updateUserPassword(...args) {
            calls.push(args);
            return request;
        },
        setIsConfirmationOpen(value) { state.isOpen = value; },
        setIsUpdatingPassword(value) { state.isUpdating = value; },
        setConfirmationMessage(value) { state.message = value; },
        setPassword(value) { state.password = value; },
        setPasswordConfirmation(value) { state.confirmation = value; },
    };

    const confirm = vm.runInNewContext(handler + '\nhandleConfirmPasswordUpdate;', context);
    return { confirm, state, calls, resolve, reject };
}

test('staff confirmation locks immediately and clears both fields on success', async function () {
    const { confirm, state, calls, resolve } = setup(42);
    const first = confirm();
    await confirm();
    assert.equal(state.isOpen, false);
    assert.equal(state.isUpdating, true);
    assert.equal(state.message, 'Updating password…');
    assert.deepEqual(calls, [[42, 'sample password', 'sample password']]);

    resolve();
    await first;
    assert.equal(state.isUpdating, false);
    assert.equal(state.password, '');
    assert.equal(state.confirmation, '');
    assert.equal(state.message, 'Password updated successfully.');
});

test('validation failure unlocks the form and preserves both fields', async function () {
    const { confirm, state, reject } = setup(42);
    const pending = confirm();
    reject({ response: { status: 422, data: { errors: { password: ['Password is too short.'] } } } });
    await pending;
    assert.equal(state.isUpdating, false);
    assert.equal(state.password, 'sample password');
    assert.equal(state.confirmation, 'sample password');
    assert.equal(state.message, 'Password is too short.');
});

test('confirming the Games preview makes no request', async function () {
    const { confirm, calls, state } = setup(0);
    await confirm();
    assert.equal(calls.length, 0);
    assert.equal(state.isOpen, false);
    assert.equal(state.message, 'Password update confirmed.');
});
