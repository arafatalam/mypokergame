import accountantArtwork from '../../../assets/casino/game-totals-chip-king-accountant.webp';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import { useRecordGameTotals } from './use-record-game-totals';

export default function RecordGameTotals() {
    const form = useRecordGameTotals();
    const fieldClass = 'w-full min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2';

    const fieldsDisabled = form.totalsStatus !== 'ready' || form.saving;
    const gameOptions = [];
    for (const game of form.games) {
        let status = 'Open';
        if (game.status === 'closed') {
            status = 'Closed';
        }
        gameOptions.push(<option key={game.id} value={game.id}>{game.name + ' · ' + status}</option>);
    }

    let gamePlaceholder = 'Loading games…';
    if (form.gamesStatus === 'error') {
        gamePlaceholder = 'Games unavailable';
    } else if (form.gamesStatus === 'ready') {
        gamePlaceholder = 'No games available';
    }

    let saveLabel = 'Save';
    if (form.saving) {
        saveLabel = 'Saving…';
    }

    let incomeText = '';
    const income = form.saved?.income;
    if (income !== undefined && income !== null) {
        incomeText = '$' + Math.abs(income).toLocaleString('en-CA');
        if (income < 0) {
            incomeText = '−' + incomeText;
        }
    }

    return (
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,380px)] items-end justify-center gap-4 px-3 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)_minmax(0,1fr)] md:px-6">
            {/* Equal side columns keep the ticket centered when the artwork appears. */}
            <div className="hidden min-w-0 md:block">
                <img src={accountantArtwork} alt="Chip King holding a calculator as his crown and poker chips fly into the air" className="ml-auto block max-h-[430px] w-full max-w-[400px] object-contain object-right-bottom drop-shadow-xl" />
            </div>
            <CasinoTicket compactEdges className="w-full min-w-0 p-6 text-[#620b19] sm:p-8 md:col-start-2">
                <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">Record Game Totals</h2>
                <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit}>
                    <label className="grid gap-1 font-semibold">
                        Game
                        <select className="casino-select w-full min-w-0" value={form.gameId ?? ''} onChange={form.handleGameChange} disabled={form.games.length === 0 || form.saving}>
                            {form.games.length === 0 && <option value="">{gamePlaceholder}</option>}
                            {gameOptions}
                        </select>
                    </label>
                    {form.gamesStatus === 'error' && (
                        <p className="flex flex-wrap items-center gap-2">
                            Couldn’t load games
                            <button type="button" className="min-h-11 rounded-full border border-current px-4 font-semibold" onClick={form.retryGames}>Retry</button>
                        </p>
                    )}
                    {form.gameId !== undefined && form.totalsStatus === 'loading' && <p>Loading game totals…</p>}
                    {form.totalsStatus === 'error' && (
                        <p className="flex flex-wrap items-center gap-2">
                            Couldn’t load game totals
                            <button type="button" className="min-h-11 rounded-full border border-current px-4 font-semibold" onClick={form.retryTotals}>Retry</button>
                        </p>
                    )}
                    <label className="grid gap-1 font-semibold">
                        Dealer tips
                        <input className={fieldClass} type="text" inputMode="numeric" value={form.dealerTips} onChange={form.handleDealerTipsChange} onPaste={form.handleAmountPaste} disabled={fieldsDisabled} />
                        {form.tipsTooHigh && <span className="text-sm">Enter $2,147,483,647 or less.</span>}
                    </label>
                    <label className="grid gap-1 font-semibold">
                        Game costs
                        <input className={fieldClass} type="text" inputMode="numeric" value={form.gameCosts} onChange={form.handleGameCostsChange} onPaste={form.handleAmountPaste} disabled={fieldsDisabled} />
                        {form.costsTooHigh && <span className="text-sm">Enter $2,147,483,647 or less.</span>}
                    </label>
                    {incomeText !== '' && <p>Game income <strong>{incomeText}</strong></p>}
                    <button type="submit" className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase" disabled={!form.canSave}>{saveLabel}</button>
                    {form.saveMessage !== '' && (
                        <p className="font-semibold" role={form.saveFailed ? 'alert' : 'status'}>{form.saveMessage}</p>
                    )}
                </form>
            </CasinoTicket>
            <ConfirmationTicket
                isOpen={form.requestedGameId !== undefined}
                title="Unsaved changes"
                message="Discard your changes and switch games?"
                cancelLabel="Keep editing"
                confirmLabel="Discard changes"
                onCancel={form.keepEditing}
                onConfirm={form.discardChanges}
            />
        </div>
    );
}
