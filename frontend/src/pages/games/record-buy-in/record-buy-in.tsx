import chipKing from '../../../assets/casino/record-buy-in-chip-king-carpet.webp';
import royalReceipt from '../../../assets/casino/record-buy-in-royal-receipt.webp';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import { useRecordBuyIn } from './use-record-buy-in';
import BuyInConfirmation from './buy-in-confirmation';

type RecordBuyInProps = {
    onCancel: () => void;
    initialGameId?: number;
};

function RecordBuyIn(props: RecordBuyInProps) {
    const form = useRecordBuyIn(props.initialGameId);
    const gameOptions = [];
    for (const game of form.options?.games ?? []) {
        gameOptions.push(<option key={game.id} value={game.id}>{game.name}</option>);
    }
    const playerOptions = [];
    for (const player of form.options?.players ?? []) {
        playerOptions.push(<option key={player.id} value={player.id}>{player.name}</option>);
    }

    let totalLabel = '—';
    if (form.validAmounts) totalLabel = '$' + form.total;

    // Keep one line under the total as loading gives way to the game limits.
    let totalHint = form.optionsMessage;
    if (!totalHint) {
        totalHint = 'Choose a game to see its limits.';
        if (form.game) {
            totalHint = 'Allowed $' + form.game.minimum + '–$' + form.game.maximum;
        }
    }

    const ticket = (
        <CasinoTicket compactEdges className="w-full min-w-0 p-6 text-[#620b19] sm:p-8">
            <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">Record Buy-in</h2>
            <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit}>
                <label className="grid gap-1 font-semibold">
                    Game
                    <select className="min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2" value={form.gameId} onChange={form.handleGameChange} disabled={form.locked || gameOptions.length === 0}>
                        <option value="" disabled>Choose a game</option>
                        {gameOptions}
                    </select>
                </label>
                <label className="grid gap-1 font-semibold">
                    Player
                    <select className="min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2" value={form.playerId} onChange={form.handlePlayerChange} disabled={form.locked || !form.game || playerOptions.length === 0}>
                        <option value="" disabled>Choose a player</option>
                        {playerOptions}
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="grid min-w-0 gap-1 font-semibold">
                        Cash
                        <input className="w-full rounded-lg border border-current bg-white/40 px-3 py-2" inputMode="numeric" value={form.cash} onChange={form.handleCashChange} disabled={form.locked || !form.game || playerOptions.length === 0} />
                    </label>
                    <label className="grid min-w-0 gap-1 font-semibold">
                        Credit
                        <input className="w-full rounded-lg border border-current bg-white/40 px-3 py-2" inputMode="numeric" value={form.credit} onChange={form.handleCreditChange} disabled={form.locked || !form.game || playerOptions.length === 0} />
                    </label>
                </div>
                <div className="grid gap-1 border-t border-[#620b19]/25 pt-3 text-center">
                    <p className="casino-heading text-2xl">Total buy-in {totalLabel}</p>
                    <p className="text-sm font-semibold">{totalHint}</p>
                </div>
                {form.conflict && <p className="text-sm font-semibold">{form.conflict}</p>}
                {form.amountError && <p className="text-sm font-semibold">{form.amountError}</p>}
                {form.saveError && <p className="text-sm font-semibold">{form.saveError}</p>}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <button type="submit" className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase" disabled={!form.canSave}>
                        {form.saving ? 'Saving…' : 'Record Buy-in'}
                    </button>
                    <button type="button" className="min-h-11 rounded-full border border-current px-5 py-2 font-semibold" onClick={props.onCancel} disabled={form.saving}>
                        Cancel
                    </button>
                </div>
            </form>
        </CasinoTicket>
    );

    return (
        <div className="relative isolate mx-auto grid w-full items-center gap-4 px-3 md:grid-cols-[minmax(0,1fr)_minmax(0,25rem)_minmax(0,1fr)]">
            {/* Clip the oversized illustration to the desktop layout so it cannot extend the page. */}
            <div className="hidden md:pointer-events-none md:absolute md:-left-4 md:right-0 md:-top-40 md:bottom-0 md:block md:overflow-clip">
                <img src={royalReceipt} alt="A laughing king and queen with an oversized receipt. Even kings need a receipt." className="mx-auto h-auto w-full max-w-[24rem] md:absolute md:-bottom-4 md:right-[calc(50%+9rem)] md:w-[clamp(27rem,43vw,55rem)] md:max-w-none md:translate-y-[9%]" />
            </div>
            <div className="relative mx-auto w-full max-w-[25rem] md:col-start-2">
                {ticket}
            </div>
            {form.game && form.player && (
                <ConfirmationTicket
                    isOpen={form.isReviewOpen}
                    title="Review Buy-in"
                    message={(
                        <>
                            <span className="block break-words">Game {form.game.name}</span>
                            <span className="block break-words">Player <strong className="text-[#075152]">{form.player.name}</strong></span>
                            <span className="block">Cash <strong className="text-[#075152]">${Number(form.cash)}</strong></span>
                            <span className="block">Credit <strong className="text-[#075152]">${Number(form.credit)}</strong></span>
                            <strong className="block">Total buy-in <span className="text-[#075152]">{totalLabel}</span></strong>
                        </>
                    )}
                    cancelLabel="Back to Edit"
                    confirmLabel="Confirm Buy-in"
                    onCancel={form.handleBackToEdit}
                    onConfirm={form.handleConfirmBuyIn}
                />
            )}
            {form.receipt && (
                <div className="relative mx-auto w-full max-w-[19rem] md:col-start-3 md:mx-0 md:justify-self-start">
                    <BuyInConfirmation receipt={form.receipt} onRecordAnother={form.handleRecordAnother} />
                    {/* Keep the King next to the receipt where both fit without covering the form. */}
                    <img src={chipKing} alt="A crowned stack of poker chips holding an I’m In ticket." className="pointer-events-none fixed bottom-4 left-[calc(50%+33rem)] hidden w-[min(15rem,calc(50vw-33rem))] xl:block" />
                </div>
            )}
        </div>
    );
}

export default RecordBuyIn;
