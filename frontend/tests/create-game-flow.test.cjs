const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function readSource(file) {
    return fs.readFileSync(path.join(__dirname, '../src/pages', file), 'utf8');
}

function setupCreateGame(saveGame) {
    const source = readSource('games/create-game/create-game.tsx');
    const handlers = source.slice(source.indexOf('    function handleReviewGame'), source.indexOf('    return ('));
    const context = vm.createContext({
        canSave: true,
        isReviewOpen: false,
        gameName: '11_NOV_2026_4',
        useCustomLimits: true,
        minimumBuyIn: '200',
        maximumBuyIn: '400',
        saveInProgress: { current: false },
        isScreenOpen: { current: true },
        saveGame,
        isAxiosError: function (error) { return Boolean(error.response); },
    });
    const state = { createdIds: [], saving: false, error: '' };
    context.setIsReviewOpen = function (open) { context.isReviewOpen = open; };
    context.setIsSaving = function (saving) { state.saving = saving; };
    context.setSaveError = function (error) { state.error = error; };
    context.props = { onGameCreated: function (id) { state.createdIds.push(id); } };
    vm.runInContext(stripTypeScriptTypes(handlers), context);
    return { context, state };
}

test('review and Back to Edit preserve the draft without saving', async function () {
    const { context } = setupCreateGame(function () { assert.fail('Unexpected save'); });
    context.handleReviewGame();
    assert.equal(context.isReviewOpen, true);
    context.handleBackToEdit();
    assert.equal(context.isReviewOpen, false);
    assert.equal(context.minimumBuyIn, '200');
    assert.equal(context.maximumBuyIn, '400');
    await context.handleConfirmCreateGame();
});

test('confirmation saves once and hands off the returned game ID', async function () {
    const saves = [];
    let finishSave;
    const { context, state } = setupCreateGame(function (draft) {
        saves.push({ ...draft });
        return new Promise(function (resolve) { finishSave = resolve; });
    });
    context.handleReviewGame();
    const pending = context.handleConfirmCreateGame();
    await context.handleConfirmCreateGame();
    assert.equal(state.saving, true);
    assert.deepEqual(state.createdIds, []);
    assert.deepEqual(saves, [{
        game_name: '11_NOV_2026_4',
        use_custom_limits: true,
        min_buy_in: 200,
        max_buy_in: 400,
    }]);
    finishSave({ id: 42 });
    await pending;
    assert.deepEqual(state.createdIds, [42]);
});

test('failed save shows the error and preserves the draft without navigating', async function () {
    const { context, state } = setupCreateGame(async function () {
        throw { response: { status: 422, data: { message: 'Recheck the buy-in limits.' } } };
    });
    context.handleReviewGame();
    await context.handleConfirmCreateGame();
    assert.deepEqual(state.createdIds, []);
    assert.equal(state.saving, false);
    assert.equal(state.error, 'Recheck the buy-in limits.');
    assert.equal(context.minimumBuyIn, '200');
    assert.equal(context.maximumBuyIn, '400');
});

test('a late save does not reopen Games after staff leave the screen', async function () {
    const { context, state } = setupCreateGame(async function () { return { id: 42 }; });
    context.handleReviewGame();
    const pending = context.handleConfirmCreateGame();
    context.isScreenOpen.current = false;
    await pending;
    assert.deepEqual(state.createdIds, []);
});

test('Buy-in selects the created game among multiple open games and preserves direct-entry defaults', async function () {
    const source = readSource('games/record-buy-in/use-record-buy-in.ts');
    const effect = source.slice(source.indexOf('    useEffect('), source.indexOf('    const game = options'));

    async function selectedGame(initialGameId, gameIds) {
        let selection = '';
        vm.runInNewContext(effect, {
            initialGameId,
            useEffect: function (callback) { callback(); },
            loadBuyInOptions: async function () {
                return { games: gameIds.map(function (id) { return { id }; }) };
            },
            setOptions: function () {},
            setGameId: function (id) { selection = id; },
        });
        await new Promise(function (resolve) { setImmediate(resolve); });
        return selection;
    }

    assert.equal(await selectedGame(42, [12, 42]), '42');
    assert.equal(await selectedGame(undefined, [12, 42]), '');
    assert.equal(await selectedGame(undefined, [12]), '12');
    assert.equal(await selectedGame(42, [12]), '');
});
