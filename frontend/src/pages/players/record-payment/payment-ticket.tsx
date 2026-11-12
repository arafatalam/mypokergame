import housePaysArtwork from '../../../assets/casino/payment-house-pays-player.webp';
import playerPaysArtwork from '../../../assets/casino/payment-player-pays-house.webp';
import CasinoCalendar from '../../../components/casino-calendar';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import PlayerTabCard, { PlayerTabBalance } from '../../../components/player-tab-card';
import type { ChangeEvent } from 'react';
import type { PaymentDirection } from './record-payment-api';
import PaymentPlayerPicker from './payment-player-picker';
import { useRecordPayment } from './use-record-payment';

type PaymentTicketProps = {
    direction: PaymentDirection;
    onDirectionChange: (direction: PaymentDirection) => void;
    initialPlayerId?: number;
    refreshKey: number;
    onPaymentSaved: () => void;
    onRecordAnotherPayment: () => void;
    onCancel: () => void;
};

const moneyFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });

function formatMoney(amount: number) {
    return '$' + moneyFormat.format(amount);
}

function formatDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return '';
    }
    const parsedDate = new Date(date + 'T00:00:00Z');
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }
    return dateFormat.format(parsedDate);
}

function paymentDirection(direction: PaymentDirection) {
    if (direction === 'house_pays_player') {
        return 'House pays player';
    }
    return 'Player pays house';
}

function balanceLabel(balance: number) {
    if (balance < 0) {
        return 'Player owes house ' + formatMoney(Math.abs(balance));
    }
    if (balance > 0) {
        return 'House owes player ' + formatMoney(balance);
    }
    return 'Settled ($0)';
}

export default function PaymentTicket(props: PaymentTicketProps) {
    const form = useRecordPayment(props.direction, props.initialPlayerId, props.refreshKey, props.onPaymentSaved);
    const fieldRowClass = 'grid min-w-0 grid-cols-subgrid items-center font-semibold';
    const fieldClass = 'w-full min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2 disabled:opacity-60';
    const players = form.options?.players ?? [];
    let loadingMessage = '';
    if (form.loadFailed) {
        loadingMessage = 'Could not load players.';
    } else if (!form.options) {
        loadingMessage = 'Loading players…';
    } else if (players.length === 0) {
        loadingMessage = 'No active players are available.';
    } else if (form.initialPlayerUnavailable) {
        loadingMessage = 'The selected Player is no longer available.';
    }
    const receipt = form.receipt;
    const housePaysPlayer = props.direction === 'house_pays_player';

    function handleDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
        props.onDirectionChange(event.currentTarget.value as PaymentDirection);
    }

    return (
        <div className="relative isolate grid w-full min-w-0 items-start gap-4 xl:grid-cols-3">
            <img src={housePaysPlayer ? housePaysArtwork : playerPaysArtwork} alt="" width={960} height={960}
                className="pointer-events-none mx-auto hidden w-full max-w-[380px] self-end drop-shadow-xl xl:col-start-1 xl:row-start-1 xl:block" />
            <CasinoTicket compactEdges className="relative z-10 w-full min-w-0 px-4 py-6 text-[#620b19] sm:p-8 xl:col-start-2 xl:row-start-1">
                <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">
                    {paymentDirection(props.direction)}
                </h2>
                {/* Share the label column across rows so it fits the longest label. */}
                <form className="mt-5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2 gap-y-4 sm:gap-x-3 [&>*]:col-span-full" onSubmit={form.handleReview}>
                    <label className={fieldRowClass}>
                        <span className="whitespace-nowrap">Payment direction</span>
                        <select className="casino-select w-full min-w-0" value={props.direction}
                            onChange={handleDirectionChange} disabled={form.locked}>
                            <option value="house_pays_player">House pays player</option>
                            <option value="player_pays_house">Player pays house</option>
                        </select>
                    </label>
                    <PaymentPlayerPicker rowClass={fieldRowClass} fieldClass={fieldClass} players={players}
                        selectedPlayer={form.player} disabled={form.locked || players.length === 0}
                        onChange={form.handlePlayerChange} />
                    {loadingMessage && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <p>{loadingMessage}</p>
                            {form.loadFailed && <button type="button" className="underline" onClick={form.handleRetryLoadOptions}>Retry</button>}
                        </div>
                    )}
                    <label className={fieldRowClass}>
                        Amount ($)
                        <input className={fieldClass} inputMode="numeric" value={form.amount} onChange={form.handleAmountChange}
                            onPaste={form.handleAmountPaste} disabled={form.locked || !form.player} />
                    </label>
                    {form.amount !== '' && !form.validAmount && <p className="text-sm">Enter a whole-dollar amount from $1 to $2,147,483,647.</p>}
                    <div className={fieldRowClass}>
                        <span>Payment date</span>
                        <CasinoCalendar label="Payment date" value={form.paidAt} maxDate={form.options?.today}
                            onChange={form.handleDateChange} disabled={form.locked || !form.options} />
                    </div>
                    {form.paidAt !== '' && !form.validDate && <p className="text-sm">Choose today or an earlier date.</p>}
                    <label className={fieldRowClass}>
                        Note (optional)
                        <textarea className={fieldClass} rows={2} maxLength={2000} value={form.note}
                            onChange={form.handleNoteChange} disabled={form.locked || !form.player} />
                    </label>
                    {form.saveError && <p className="text-sm font-semibold">{form.saveError}</p>}
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <button type="submit" className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase" disabled={!form.canReview}>
                            {form.saving ? 'Saving…' : 'Review Payment'}
                        </button>
                        <button type="button" className="min-h-11 rounded-full border border-current px-5 py-2 font-semibold" onClick={props.onCancel} disabled={form.saving}>Cancel</button>
                    </div>
                </form>
            </CasinoTicket>
            <ConfirmationTicket
                isOpen={form.reviewing}
                title="Review Payment"
                message={(
                    <>
                        <span className="block wrap-anywhere font-semibold">{form.player?.name}</span>
                        <span className="block">{paymentDirection(props.direction)} <strong>{formatMoney(form.paymentAmount)}</strong></span>
                        <span className="block">{formatDate(form.paidAt)}</span>
                        <span className="mt-2 block font-semibold">{balanceLabel(form.resultingBalance)}</span>
                    </>
                )}
                cancelLabel="Back to Edit"
                confirmLabel="Confirm Payment"
                onCancel={form.handleBackToEdit}
                onConfirm={form.handleConfirmPayment}
            />
            {receipt && (
                <PlayerTabCard title="Payment recorded" name={receipt.player} photoUrl={receipt.photoUrl}
                    className="mx-auto w-full min-w-0 max-w-[19rem] xl:col-start-3 xl:row-start-1 xl:ml-0">
                    <div>
                        <PlayerTabBalance balance={receipt.balance} />
                        <dl>
                            <div>
                                <dt>{receipt.direction === 'player_pays_house' ? 'Player paid the house' : 'House paid the player'}</dt>
                                <dd>{formatMoney(receipt.amount)}</dd>
                            </div>
                            <div><dt>Payment date</dt><dd>{formatDate(receipt.paidAt)}</dd></div>
                        </dl>
                    </div>
                    <button type="button" className="casino-button player-tab-payment w-full min-h-11 rounded-lg px-3 py-2 whitespace-normal"
                        onClick={props.onRecordAnotherPayment}>Record Another Payment</button>
                </PlayerTabCard>
            )}
        </div>
    );
}
