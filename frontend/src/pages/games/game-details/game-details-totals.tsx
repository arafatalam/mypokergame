import { useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react';
import type { GameListItem } from '../game-list/load-games';
import { saveGameTotals } from '../record-game-totals/record-game-totals-api';
import type { GameTotals } from '../record-game-totals/record-game-totals-api';

type GameDetailsTotalsProps = {
    game: GameListItem;
    onSaved: (totals: GameTotals) => void;
    refreshing: boolean;
    onSavingChange: (saving: boolean) => void;
};

const maximumAmount = 2147483647;
const recordsButtonClass = 'casino-button game-records-button w-full rounded-lg px-3 py-2';
const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

function GameDetailsTotals(props: GameDetailsTotalsProps) {
    const saved = props.game;
    const [draft, setDraft] = useState({ dealerTips: '', gameCosts: '' });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const tipsTooHigh = Number(draft.dealerTips) > maximumAmount;
    const costsTooHigh = Number(draft.gameCosts) > maximumAmount;
    const changed = Number(draft.dealerTips) !== saved.dealerTips
        || Number(draft.gameCosts) !== saved.gameCosts;
    const canSave = editing && changed && !props.refreshing && !saving && !tipsTooHigh && !costsTooHigh;

    function handleEdit() {
        // Start each edit from the amounts currently displayed on the ticket.
        setDraft({ dealerTips: String(saved.dealerTips), gameCosts: String(saved.gameCosts) });
        setMessage('');
        setEditing(true);
    }

    function handleCancel() {
        setEditing(false);
        setMessage('');
    }

    function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.currentTarget;
        if (saving || !/^[0-9]*$/.test(value)) {
            return;
        }

        setDraft({ ...draft, [name]: value.replace(/^0+/, '') || '0' });
        setMessage('');
    }

    function handleAmountPaste(event: ClipboardEvent<HTMLInputElement>) {
        // Reject the whole paste before the browser can strip line breaks.
        if (/[^0-9]/.test(event.clipboardData.getData('text'))) {
            event.preventDefault();
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) {
            return;
        }

        setSaving(true);
        props.onSavingChange(true);
        setMessage('');
        try {
            const totals = await saveGameTotals(props.game.id, {
                dealerTips: Number(draft.dealerTips),
                gameCosts: Number(draft.gameCosts),
            });
            setEditing(false);
            setMessage('Game records saved.');
            props.onSaved(totals);
        } catch {
            setMessage('Couldn’t save game records. Try again.');
        } finally {
            setSaving(false);
            props.onSavingChange(false);
        }
    }

    const totals = [
        { label: 'Buy-ins', amount: props.game.buyIns },
        { label: 'Cashout', amount: props.game.endingChips },
        { label: 'Cash paid', amount: props.game.cashPaid },
        { label: 'Income', amount: saved.income },
        { label: 'Dealer tips', amount: saved.dealerTips, field: 'dealerTips' as const, tooHigh: tipsTooHigh },
        { label: 'Game costs', amount: saved.gameCosts, field: 'gameCosts' as const, tooHigh: costsTooHigh },
    ];

    return (
        <form onSubmit={handleSubmit}>
            <dl className="grid grid-cols-[auto_auto] justify-between gap-4">
                {totals.map(function renderTotal(total) {
                    let label = <>{total.label}</>;
                    let amount = <>{total.amount === null ? '—' : currency.format(total.amount)}</>;
                    if (editing && total.field) {
                        const id = 'game-details-' + total.field;
                        label = <label htmlFor={id}>{total.label}</label>;
                        amount = (
                            <>
                                <input id={id} name={total.field} type="text" inputMode="numeric"
                                    className="w-full min-w-0 max-w-32 rounded border border-[#ad8d5c] bg-[#fff0cf] px-2 text-[#620b19]"
                                    value={draft[total.field]} disabled={saving || props.refreshing}
                                    onChange={handleAmountChange} onPaste={handleAmountPaste} />
                                {total.tooHigh && <span className="block font-sans text-sm">Maximum {currency.format(maximumAmount)}</span>}
                            </>
                        );
                    }

                    return (
                        <div key={total.label} className="min-w-0">
                            <dt>{label}</dt>
                            <dd className="casino-heading text-2xl">{amount}</dd>
                        </div>
                    );
                })}
            </dl>
            <div className={editing ? 'mt-4 grid grid-cols-2 gap-2' : 'mt-4'}>
                {editing ? (
                    <>
                        <button type="button" className={recordsButtonClass + ' game-records-button--cancel'} disabled={saving} onClick={handleCancel}>Cancel</button>
                        <button type="submit" className={recordsButtonClass} disabled={!canSave}>{saving ? 'Saving…' : 'Save'}</button>
                    </>
                ) : (
                    <button type="button" className={recordsButtonClass} disabled={props.refreshing} onClick={handleEdit}>
                        Edit game records
                    </button>
                )}
            </div>
            {message && <p className="mt-2">{message}</p>}
        </form>
    );
}

export default GameDetailsTotals;
