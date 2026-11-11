const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const fields = [
    ['record-buy-in', 'Cash'],
    ['record-buy-in', 'Credit'],
    ['record-cashout', 'EndingChips'],
    ['record-cashout', 'CashPaid'],
];

for (const [screen, field] of fields) {
    test(screen + ' ' + field + ' accepts only digits and can be cleared', function () {
        const file = path.join(__dirname, '../src/pages/games', screen, 'use-' + screen + '.ts');
        const source = fs.readFileSync(file, 'utf8');
        const name = 'handle' + field + 'Change';
        const start = source.indexOf('    function ' + name + '(');
        const end = source.indexOf('\n    }', start) + '\n    }'.length;
        assert.ok(start >= 0 && end > start);
        const handler = source.slice(start, end).replace('event: ChangeEvent<HTMLInputElement>', 'event');

        let amount = '';
        let feedbackClears = 0;
        const change = vm.runInNewContext(handler + '\n' + name, {
            ['set' + field](value) { amount = value; },
            clearSaveFeedback() { feedbackClears += 1; },
        });

        change({ target: { value: '150' } });
        assert.equal(amount, '150');

        for (const value of ['150a', '1e3', '-150', '150.5', ' 150', '$1,500', '١٥٠']) {
            change({ target: { value } });
            assert.equal(amount, '150', 'Rejected edit: ' + value);
            assert.equal(feedbackClears, 1);
        }

        change({ target: { value: '' } });
        assert.equal(amount, '');
        change({ target: { value: '0' } });
        assert.equal(amount, '0');
        assert.equal(feedbackClears, 3);
    });
}
