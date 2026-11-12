import cashoutArtwork from '../../../assets/casino/cashout-chip-king-cashier.webp';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import CashoutConfirmation from './cashout-confirmation';
import { useRecordCashout } from './use-record-cashout';
import './record-cashout.css';

type RecordCashoutProps = {
    onCancel: () => void;
};

export default function RecordCashout(props: RecordCashoutProps) {
    const form = useRecordCashout();
    const fieldClass = 'w-full min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2';
    const gameOptions = [];
    for (const game of form.options?.games ?? []) {
        gameOptions.push(<option key={game.id} value={game.id}>{game.name}</option>);
    }
    const playerOptions = [];
    for (const player of form.players) {
        playerOptions.push(<option key={player.visitId} value={player.visitId}>{player.name}</option>);
    }

    return (
        <div className="cashout-preview mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,380px)] items-end justify-center gap-4 px-3 md:grow md:grid-cols-[minmax(0,1fr)_minmax(0,380px)_minmax(0,1fr)] md:px-6">
            {/* The artwork reaches the window edge while the ticket keeps its inset. */}
            <div className="cashout-artwork relative self-stretch">
                <img src={cashoutArtwork} alt="A surprised chip king receiving a tiny payout at the cashier" className="mx-auto block max-h-[380px] w-full object-contain drop-shadow-xl" />
            </div>
            {/* The shared layout pushes this row down when there is room beneath the marquee. */}
            <CasinoTicket compactEdges className="cashout-ticket w-full min-w-0 p-6 text-[#620b19] sm:p-8 md:col-start-2">
                <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">Record Cashout</h2>
                <form className="cashout-fields mt-5 grid gap-4" onSubmit={form.handleSubmit}>
                    <label className="grid gap-1 font-semibold">
                        Game
                        <select className="casino-select w-full min-w-0" value={form.gameId} onChange={form.handleGameChange} disabled={form.locked || gameOptions.length === 0}>
                            <option value="" disabled>Select a game</option>
                            {gameOptions}
                        </select>
                    </label>
                    <label className="grid gap-1 font-semibold">
                        Player
                        <select className="casino-select w-full min-w-0" value={form.visitId} onChange={form.handlePlayerChange} disabled={form.locked || playerOptions.length === 0}>
                            <option value="" disabled>Select a player</option>
                            {playerOptions}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="grid min-w-0 gap-1 font-semibold">
                            Ending chips
                            <input className={fieldClass} inputMode="numeric" value={form.endingChips} onChange={form.handleEndingChipsChange} disabled={form.locked || !form.player} />
                        </label>
                        <label className="grid min-w-0 gap-1 font-semibold">
                            Cash paid
                            <input className={fieldClass} inputMode="numeric" value={form.cashPaid} onChange={form.handleCashPaidChange} disabled={form.locked || !form.player} />
                        </label>
                    </div>
                    <div className="grid gap-1 border-t border-[#620b19]/25 pt-3 text-center">
                        <p className="casino-heading text-2xl">Total buy-in ${form.player?.totalBuyIn ?? 0}</p>
                        <p className="text-sm font-semibold">{form.hint}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <button type="submit" className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase" disabled={!form.canReview}>
                            {form.saving ? 'Saving…' : 'Review Cashout'}
                        </button>
                        <button type="button" className="min-h-11 rounded-full border border-current px-5 py-2 font-semibold" onClick={props.onCancel} disabled={form.saving}>
                            Cancel
                        </button>
                    </div>
                </form>
            </CasinoTicket>
            <ConfirmationTicket
                isOpen={form.isReviewOpen}
                title="Review Cashout"
                message={(
                    <>
                        <span className="block break-words">Game {form.game?.name}</span>
                        <span className="block">Player <strong className="text-[#075152]">{form.player?.name}</strong></span>
                        <span className="block">Ending chips <strong className="text-[#075152]">${form.endingChipsAmount}</strong></span>
                        <span className="block">Cash paid <strong className="text-[#075152]">${form.cashPaidAmount}</strong></span>
                    </>
                )}
                cancelLabel="Back to Edit"
                confirmLabel="Confirm Cashout"
                onCancel={form.handleBackToEdit}
                onConfirm={form.handleConfirmCashout}
            />
            {form.receipt && (
                <CashoutConfirmation receipt={form.receipt} onRecordAnother={form.handleRecordAnother} />
            )}
        </div>
    );
}
