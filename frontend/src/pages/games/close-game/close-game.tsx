import CasinoTicket from '../../../components/casino-ticket';
import CloseGameReview from './close-game-review';
import { formatGameMoney } from './format-game-money';
import { useCloseGame } from './use-close-game';

export default function CloseGame() {
    const form = useCloseGame();
    const fieldClass = 'w-full min-w-0 rounded-lg border border-current bg-white/40 px-3 py-2';
    const buttonClass = 'casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase';
    const retryClass = 'min-h-11 rounded-full border border-current px-4 font-semibold';

    const gameOptions = [];
    for (const game of form.games) {
        gameOptions.push(<option key={game.id} value={game.id}>{game.name}</option>);
    }

    let projectedIncome = 0;
    if (form.details !== undefined) {
        projectedIncome = form.details.buyIns - form.details.endingChips - Number(form.dealerTips) - Number(form.gameCosts);
    }

    let content;
    if (form.receipt !== undefined) {
        content = (
            <div className="mt-5 grid gap-4 text-center">
                <h3 className="casino-heading text-2xl">Game Closed</h3>
                <p className="break-words font-semibold">{form.selectedGame?.name}</p>
                <p>Final income <strong>{formatGameMoney(form.receipt.income)}</strong></p>
                <button type="button" className={buttonClass} onClick={form.handleCloseAnotherGame}>Close Another Game</button>
            </div>
        );
    } else if (form.reviewing && form.details !== undefined && form.selectedGame !== undefined) {
        content = (
            <CloseGameReview
                gameName={form.selectedGame.name}
                details={form.details}
                dealerTips={Number(form.dealerTips)}
                gameCosts={Number(form.gameCosts)}
                projectedIncome={projectedIncome}
                closing={form.closing}
                closeError={form.closeError}
                onBackToEdit={form.handleBackToEdit}
                onConfirmClose={form.handleConfirmClose}
            />
        );
    } else if (form.gamesStatus === 'loading') {
        content = <p className="mt-5">Loading open games…</p>;
    } else if (form.gamesStatus === 'error') {
        content = <p className="mt-5 flex flex-wrap items-center gap-2">Couldn’t load open games <button type="button" className={retryClass} onClick={form.retryGames}>Retry</button></p>;
    } else if (form.games.length === 0) {
        content = <p className="mt-5 text-center">No open games available</p>;
    } else {
        content = (
            <form className="mt-5 grid gap-4" onSubmit={form.handleReview}>
                <label className="grid gap-1 font-semibold">
                    Game
                    <select className={fieldClass} value={form.gameId ?? ''} onChange={form.handleGameChange}>{gameOptions}</select>
                </label>
                {form.detailsStatus === 'loading' && <p>Loading game totals…</p>}
                {form.detailsStatus === 'error' && (
                    <p className="flex flex-wrap items-center gap-2">Couldn’t load game totals <button type="button" className={retryClass} onClick={form.retryDetails}>Retry</button></p>
                )}
                {form.details !== undefined && (
                    <>
                        <label className="grid gap-1 font-semibold">
                            Dealer tips
                            <input className={fieldClass} type="text" inputMode="numeric" value={form.dealerTips} onChange={form.handleDealerTipsChange} onPaste={form.handleAmountPaste} />
                            {form.tipsTooHigh && <span className="text-sm">Enter $2,147,483,647 or less.</span>}
                        </label>
                        <label className="grid gap-1 font-semibold">
                            Game costs
                            <input className={fieldClass} type="text" inputMode="numeric" value={form.gameCosts} onChange={form.handleGameCostsChange} onPaste={form.handleAmountPaste} />
                            {form.costsTooHigh && <span className="text-sm">Enter $2,147,483,647 or less.</span>}
                        </label>
                        {form.canReview && <p>Projected income <strong>{formatGameMoney(projectedIncome)}</strong></p>}
                        <button type="submit" className={buttonClass} disabled={!form.canReview}>Review Close</button>
                    </>
                )}
            </form>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[480px] px-3 sm:px-6">
            <CasinoTicket compactEdges className="w-full min-w-0 p-6 text-[#620b19] sm:p-8">
                <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">Close Game</h2>
                {content}
            </CasinoTicket>
        </div>
    );
}
