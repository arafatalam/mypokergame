import type { CloseGameDetails } from './close-game-api';
import { formatGameMoney } from './format-game-money';

type CloseGameReviewProps = {
    gameName: string;
    details: CloseGameDetails;
    dealerTips: number;
    gameCosts: number;
    projectedIncome: number;
    closing: boolean;
    closeError: boolean;
    backLabel?: string;
    onBackToEdit: () => void;
    onConfirmClose: () => void;
};

export default function CloseGameReview(props: CloseGameReviewProps) {
    let confirmLabel = 'Confirm Close';
    if (props.closing) {
        confirmLabel = 'Closing…';
    } else if (props.closeError) {
        confirmLabel = 'Retry Close';
    }

    return (
        <div className="mt-5 grid gap-4">
            <h3 className="casino-heading text-center text-2xl">Review Close</h3>
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2">
                <dt>Game</dt><dd className="min-w-0 wrap-anywhere font-semibold">{props.gameName}</dd>
                <dt>Buy-ins</dt><dd>{formatGameMoney(props.details.buyIns)}</dd>
                <dt>Ending chips</dt><dd>{formatGameMoney(props.details.endingChips)}</dd>
                <dt>Dealer tips</dt><dd>{formatGameMoney(props.dealerTips)}</dd>
                <dt>Game costs</dt><dd>{formatGameMoney(props.gameCosts)}</dd>
                <dt className="font-semibold">Projected income</dt><dd className="font-semibold">{formatGameMoney(props.projectedIncome)}</dd>
                <dt>Open visits receiving a $0 cashout</dt><dd>{props.details.openVisits}</dd>
            </dl>
            {props.closeError && <p className="font-semibold">Couldn’t confirm the close. Try again.</p>}
            <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="min-h-11 rounded-full border border-current px-4 font-semibold disabled:opacity-50" onClick={props.onBackToEdit} disabled={props.closing}>{props.backLabel ?? 'Back to Edit'}</button>
                <button type="button" className="casino-button min-h-11 rounded-full px-4 py-2 font-semibold" onClick={props.onConfirmClose} disabled={props.closing}>{confirmLabel}</button>
            </div>
        </div>
    );
}
