import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import type { BuyInReceipt } from './record-buy-in-api';
import '../../../components/player-tab.css';

type BuyInConfirmationProps = {
    receipt: BuyInReceipt;
    onRecordAnother: () => void;
};

export default function BuyInConfirmation(props: BuyInConfirmationProps) {
    const receipt = props.receipt;
    let balanceLabel = 'Settled';
    if (receipt.balance < 0) balanceLabel = 'Owes the house';
    if (receipt.balance > 0) balanceLabel = 'House owes';

    return (
        <TurquoisePaperTicket className="player-tab relative w-full min-w-0">
            <section className="grid grid-cols-[minmax(0,1fr)] gap-[14px]">
                <h3>Buy-in recorded</h3>
                <h4 className="player-tab-name">{receipt.player}</h4>
                <div className="player-tab-balance flex flex-col gap-1.5">
                    <p>{balanceLabel}</p>
                    <strong>${Math.abs(receipt.balance)}</strong>
                </div>
                <dl>
                    <div><dt>Game</dt><dd className="min-w-0 break-words">{receipt.game}</dd></div>
                    <div><dt>Cash</dt><dd>${receipt.cash}</dd></div>
                    <div><dt>Credit</dt><dd>${receipt.credit}</dd></div>
                    <div><dt>Total buy-in</dt><dd>${receipt.total}</dd></div>
                </dl>
                <button type="button" className="casino-button player-tab-payment min-h-11 min-w-0 rounded-lg px-3 py-2 whitespace-normal [overflow-wrap:anywhere]" onClick={props.onRecordAnother}>
                    Record Another Buy-in
                </button>
            </section>
        </TurquoisePaperTicket>
    );
}
