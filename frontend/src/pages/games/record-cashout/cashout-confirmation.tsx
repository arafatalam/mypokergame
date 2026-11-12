import cashoutSuitcaseArtwork from '../../../assets/casino/cashout-chip-king-suitcase.webp';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import '../../../components/player-tab.css';
import type { CashoutReceipt } from './record-cashout-api';

type CashoutConfirmationProps = {
    receipt: CashoutReceipt;
    onRecordAnother: () => void;
};

export default function CashoutConfirmation(props: CashoutConfirmationProps) {
    const receipt = props.receipt;
    let balanceLabel = 'Settled';
    if (receipt.balance < 0) balanceLabel = 'Owes the house';
    if (receipt.balance > 0) balanceLabel = 'House owes';

    return (
        <div className="relative min-w-0 md:col-start-3">
            <TurquoisePaperTicket className="cashout-receipt player-tab relative mx-auto w-full min-w-0 max-w-[19rem] md:mx-0">
                <section className="grid grid-cols-[minmax(0,1fr)] gap-[14px]">
                    <h3>Cashout recorded</h3>
                    <h4 className="player-tab-name">{receipt.player}</h4>
                    <div className="player-tab-balance flex flex-col gap-1.5">
                        <p>{balanceLabel}</p>
                        <strong>${Math.abs(receipt.balance)}</strong>
                    </div>
                    <dl>
                        <div><dt>Game</dt><dd className="min-w-0 break-words">{receipt.game}</dd></div>
                        <div><dt>Ending chips</dt><dd>${receipt.endingChips}</dd></div>
                        <div><dt>Cash paid</dt><dd>${receipt.cashPaid}</dd></div>
                    </dl>
                    <button type="button" className="casino-button player-tab-payment min-h-11 min-w-0 rounded-lg px-3 py-2 whitespace-normal [overflow-wrap:anywhere]" onClick={props.onRecordAnother}>
                        Record Another Cashout
                    </button>
                </section>
            </TurquoisePaperTicket>
            {/* Use the space beside the receipt without adding height on desktop. */}
            <img src={cashoutSuitcaseArtwork} alt="The laughing Chip King hauls away a suitcase overflowing with cash." className="cashout-suitcase mx-auto mt-4 block w-48" />
        </div>
    );
}
